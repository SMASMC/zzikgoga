import * as Y from 'yjs';
import { pool } from '../db';
import { Trip, Budget } from './types';

// =================================================================
// 1. [RDB -> Y.Doc] DB 로딩 함수
// =================================================================

/**
 * DB에서 데이터를 로드하여 Y.Doc을 채웁니다.
 * 이 함수는 서버의 Doc이 메모리에 없을 때 (첫 연결 시) 호출됩니다.
 */

/**
 * 유틸: 날짜/타임스탬프에서 "YYYY-MM-DD" 문자열 뽑기
 */
function toDateKey(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') {
        const parts = value.split('T'); // '2025-10-20T09:13:00.000Z' -> ['2025-10-20', ...]
        return parts[0] ?? value;
    }

    if (value instanceof Date) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return String(value);
}

/**
 * 유틸: PG numeric/decimal → number
 */
function toNumber(v: any): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return parseFloat(v);
    return Number(v);
}

// dbLoad.ts 상단 유틸 근처에 추가
function toPostgresIntervalString(v: any): string | null {
    if (v == null) return null;

    // 1) 이미 string이면 그대로 사용 (예: '1 hour 30 minutes' 또는 '01:30:00')
    if (typeof v === 'string') {
        const s = v.trim();
        return s.length ? s : null;
    }

    // 2) pg가 interval을 객체로 준 경우: { years, months, days, hours, minutes, seconds }
    if (typeof v === 'object') {
        const {
            years = 0, months = 0, days = 0,
            hours = 0, minutes = 0, seconds = 0
        } = v as any;

        // 필요한 단위만 조합 (Postgres가 잘 파는 텍스트 포맷)
        const parts: string[] = [];
        if (years) parts.push(`${years} years`);
        if (months) parts.push(`${months} months`);
        if (days) parts.push(`${days} days`);
        if (hours) parts.push(`${hours} hours`);
        if (minutes) parts.push(`${minutes} minutes`);
        if (seconds) parts.push(`${seconds} seconds`);

        return parts.length ? parts.join(' ') : '0 seconds';
    }

    // 3) 숫자면 초로 간주해도 되지만(선택), 여기선 null 처리
    return null;
}


/**
 * 유틸: string으로 변환하는 함수
 */
function toIsoString(v: any): string {
    // v가 Date면 ISO로
    if (v instanceof Date) {
        return v.toISOString(); // '2025-10-20T09:13:00.000Z' 이런 식
    }
    // null/undefined는 빈 문자열이나 null 취급 - 선택
    if (v === null || v === undefined) return '';
    // 이미 string이면 그대로
    return String(v);
}

/**
 * [RDB -> Y.Doc]
 * trip / schedules(+location) / budgets 전부 DB에서 읽어서
 * doc에 한 번에 주입한다.
 *
 * 주입은 Y.transact(..., 'db_load')로 묶어서
 * 초기 로딩 변경이 persistence에 의해 다시 DB 저장되지 않게 막는다.
 */
export async function loadYDocFromDB(tripId: number, doc: Y.Doc): Promise<Y.Doc> {
    const client = await pool.connect();

    try {
        await client.query('SET search_path TO test;');
    } catch (e) {
        console.warn('[DB Load] Failed to set search_path. (이 무시는 로컬 테스트 시 괜찮을 수 있음)', (e as Error).message);
    }

    console.log(`[DB Load] Loading trip ${tripId} from PostgreSQL...`);

    try {
        // 1. trip 기본 정보 가져오기
        const tripRes = await client.query<
            Pick<Trip, 'id' | 'title' | 'start_date' | 'end_date'>
        >(
            'SELECT id, title, start_date, end_date FROM trip WHERE id = $1',
            [tripId]
        );
        if (tripRes.rows.length === 0) {
            throw new Error(`Trip ${tripId} not found`);
        }
        const tripRow = tripRes.rows[0]!;

        // 2. schedules + location (LEFT JOIN)
        const scheduleRes = await client.query<any>(
            'SELECT s.id AS schedule_id, s.trip_id AS trip_id, s.start_time AS start_time, s.offset_time AS offset_time, s.memo AS memo, s.has_location AS has_location, l.id AS location_id, l.name AS location_name, l.full_address AS full_address, l.detail AS detail, l.latitude AS latitude, l.longitude AS longitude FROM schedule s LEFT JOIN location l ON l.schedule_id = s.id WHERE s.trip_id = $1 ORDER BY s.start_time ASC, s.id ASC',
            [tripId]
        );

        // 3. budgets
        const budgetRes = await client.query<Pick<Budget, 'id' | 'trip_id' | 'date' | 'category' | 'description' | 'amount'>>(
            'SELECT id, trip_id, date, category, description, amount FROM budget WHERE trip_id = $1 ORDER BY date ASC, id ASC',
            [tripId]
        );

        // 4. 메모리 상에서 날짜별로 정리 (schedules/budgets)
        // 4.1. Schedules 그룹화 (Yjs 타입 사용 X)
        const scheduleRowsByDate = new Map<string, any[]>();
        for (const row of scheduleRes.rows) {
            const dateKey = toDateKey(row.start_time);
            if (!scheduleRowsByDate.has(dateKey)) {
                scheduleRowsByDate.set(dateKey, []);
            }
            scheduleRowsByDate.get(dateKey)!.push(row);
        }

        // 4.2. Budgets 그룹화 (Yjs 타입 사용 X)
        const budgetRowsByDate = new Map<string, any[]>();
        for (const b of budgetRes.rows) {
            const dateKey = toDateKey(b.date);
            if (!budgetRowsByDate.has(dateKey)) {
                budgetRowsByDate.set(dateKey, []);
            }
            budgetRowsByDate.get(dateKey)!.push(b);
        }

        // 5. 전부 doc에 밀어넣는 구간만 동기 transact로 묶는다
        // 5. 모든 Yjs 객체 생성을 Y.transact 내부에서 수행
        Y.transact(doc, () => {
            // tripInfo
            const tripInfoMap = doc.getMap('tripInfo');
            tripInfoMap.clear();
            tripInfoMap.set('id', tripRow.id);
            tripInfoMap.set('title', new Y.Text(tripRow.title || ''));
            tripInfoMap.set('start_date', toDateKey(tripRow.start_date));
            tripInfoMap.set('end_date', toDateKey(tripRow.end_date));

            // schedules
            const schedulesMap = doc.getMap('schedules');
            schedulesMap.clear();

            // doc에 연결된 schedulesMap 내부에 Y.Array와 Y.Map을 생성
            for (const [dateKey, rows] of scheduleRowsByDate.entries()) {
                const yDayArray = new Y.Array<Y.Map<any>>();
                schedulesMap.set(dateKey, yDayArray); // 👈 Y.Array를 doc에 즉시 연결

                for (const row of rows) {
                    const yScheduleItem = new Y.Map<any>();

                    // 👈 Y.Map을 yDayArray에 즉시 연결
                    // (push 하기 전에 Y.Text를 set 해야 함)
                    yScheduleItem.set('id', row.schedule_id);
                    const localTime = toIsoString(row.start_time).slice(0, 16);
                    yScheduleItem.set('start_time', localTime);
                    const offsetStr = toPostgresIntervalString(row.offset_time);
                    if (offsetStr != null) {
                        yScheduleItem.set('offset_time', offsetStr);
                    } else {
                        yScheduleItem.set('offset_time', null);
                    }
                    yScheduleItem.set('memo', new Y.Text(row.memo || '')); // 👈 Y.Text가 Y.Map에 연결됨
                    yScheduleItem.set('has_location', !!row.has_location);

                    if (row.has_location && row.location_id) {
                        yScheduleItem.set('location', {
                            id: row.location_id,
                            name: row.location_name,
                            full_address: row.full_address,
                            detail: row.detail,
                            latitude: row.latitude,
                            longitude: row.longitude,
                        });
                    } else {
                        yScheduleItem.set('location', null);
                    }

                    yDayArray.push([yScheduleItem]); // 👈 Y.Map을 yDayArray에 연결
                }
            }

            // budgets
            const budgetsMap = doc.getMap('budgets');
            budgetsMap.clear();

            for (const [dateKey, rows] of budgetRowsByDate.entries()) {
                const yDayArray = new Y.Array<Y.Map<any>>();
                budgetsMap.set(dateKey, yDayArray); // 👈 Y.Array를 doc에 즉시 연결

                for (const b of rows) {
                    const yBudgetItem = new Y.Map<any>();
                    yBudgetItem.set('id', b.id);
                    yBudgetItem.set('category', b.category);
                    yBudgetItem.set('amount', toNumber(b.amount));
                    yBudgetItem.set('description', new Y.Text(b.description || '')); // 👈 Y.Text가 Y.Map에 연결됨

                    yDayArray.push([yBudgetItem]); // 👈 Y.Map을 yDayArray에 연결
                }
            }
        }, 'db_load');

        console.log(`[DB Load] Trip ${tripId} loaded into Y.Doc.`);
        return doc;
    } catch (e) {
        console.error(`[DB Load] Failed to load trip ${tripId}:`, (e as Error).message);
        throw e;
    } finally {
        client.release();
    }
}