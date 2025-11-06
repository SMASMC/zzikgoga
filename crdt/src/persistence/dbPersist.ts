import * as Y from 'yjs';
import { pool } from '../db';

// DB에서 온 초기 반영이나 우리가 DB 반영 중에 다시 set하는 변경을 구분하기 위한 origin
const DB_UPDATE_ORIGIN = 'db_update';

// 디바운스 맵
const debouncers = new Map<string, NodeJS.Timeout>();
function debounce(id: string, func: () => void, delay: number = 2000) {
    if (debouncers.has(id)) {
        clearTimeout(debouncers.get(id)!);
    }
    debouncers.set(
        id,
        setTimeout(() => {
            func();
            debouncers.delete(id);
        }, delay)
    );
}

// dbPersist.ts 상단 유틸 근처에 추가
function fromAnyToIntervalString(v: any): string | null {
    if (v == null) return null;

    // tiptap/프론트가 '' 줄 수도 있음
    if (typeof v === 'string') {
        const s = v.trim();
        if (!s || s === '[object Object]') return null; // 오염값 방지
        return s; // 이미 '1 hour 30 minutes' / '01:30:00' 등이라면 그대로 사용
    }

    // Y.Map 등 객체일 수 있음 (pg interval 객체 형태 or 프론트 구조체)
    if (typeof v === 'object') {
        // pg-interval 형태
        const { years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0 } = v as any;
        const parts: string[] = [];
        if (years) parts.push(`${years} years`);
        if (months) parts.push(`${months} months`);
        if (days) parts.push(`${days} days`);
        if (hours) parts.push(`${hours} hours`);
        if (minutes) parts.push(`${minutes} minutes`);
        if (seconds) parts.push(`${seconds} seconds`);
        return parts.length ? parts.join(' ') : '0 seconds';
    }

    // 숫자는 초로 간주하고 싶다면 여기서 처리(선택)
    return null;
}



// 트랜잭션 origin이 "사용자 편집"인지 판별
function isUserOrigin(tr: Y.Transaction): boolean {
    return tr.origin !== 'db_load' && tr.origin !== DB_UPDATE_ORIGIN;
}

/** trip.title (Y.Text) 변경 시 UPDATE trip */
function scheduleTripTitleSave(tripId: number, titleText: Y.Text) {
    debounce(`trip:${tripId}:title`, () => {
        const newTitle = titleText.toString();
        pool.query(
            'UPDATE trip SET title = $1, updated_at = NOW() WHERE id = $2',
            [newTitle, tripId]
        ).catch(err => {
            console.error('[DB] Failed to update trip.title:', err);
        });
    });
}

/** tripInfo의 일반 필드(start_date, end_date 등) 변경 시 UPDATE trip */
function scheduleTripFieldSave(tripId: number, key: string, value: any) {
    debounce(`trip:${tripId}:${key}`, () => {
        const sql = `UPDATE trip SET ${key} = $1, updated_at = NOW() WHERE id = $2`;
        pool.query(sql, [value, tripId]).catch(err => {
            console.error(`[DB] Failed to update trip.${key}:`, err);
        });
    });
}

/**
 * 일정 항목 하나(Y.Map)를 DB에 업서트.
 * - id 없으면 INSERT + RETURNING id → 그 id를 Y.Doc에 set('id', ...)
 * - id 있으면 UPDATE
 * - location도 INSERT/UPDATE/DELETE 처리
 */
async function upsertScheduleItem(
    tripId: number,
    scheduleItem: Y.Map<any>,
    dateKey: string
) {
    const id = scheduleItem.get('id') as number | undefined;
    const start_time = scheduleItem.get('start_time') as string;
    const rawOffset = scheduleItem.get('offset_time');
    const offset_time = fromAnyToIntervalString(rawOffset);
    const memoVal = scheduleItem.get('memo');
    const memo = memoVal instanceof Y.Text ? memoVal.toString() : (memoVal ?? '');
    const has_location = !!scheduleItem.get('has_location');
    const locationObj = scheduleItem.get('location') || null;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let scheduleId = id;
        if (!scheduleId) {
            // INSERT
            const insertRes = await client.query(
                'INSERT INTO schedule (trip_id, start_time, offset_time, memo, has_location) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [tripId, start_time, offset_time, memo, has_location]
            );
            scheduleId = insertRes.rows[0].id as number;

            // 새로 생성된 id를 Y.Doc에 반영
            Y.transact(scheduleItem.doc!, () => {
                scheduleItem.set('id', scheduleId);
            }, DB_UPDATE_ORIGIN);
        } else {
            // UPDATE
            await client.query(
                'UPDATE schedule SET start_time = $1, offset_time = $2, memo = $3, has_location = $4, updated_at = NOW() WHERE id = $5 AND trip_id = $6',
                [start_time, offset_time, memo, has_location, scheduleId, tripId]
            );
        }

        // location 처리
        if (has_location) {
            if (locationObj && locationObj.id) {
                // UPDATE location
                await client.query(
                    'UPDATE location SET name = $1, full_address = $2, detail = $3, latitude = $4, longitude = $5 WHERE id = $6 AND schedule_id = $7',
                    [
                        locationObj.name,
                        locationObj.full_address,
                        locationObj.detail,
                        locationObj.latitude,
                        locationObj.longitude,
                        locationObj.id,
                        scheduleId
                    ]
                );
            } else if (locationObj) {
                // INSERT location
                const locInsert = await client.query(
                    'INSERT INTO location (schedule_id, name, full_address, detail, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                    [
                        scheduleId,
                        locationObj.name,
                        locationObj.full_address,
                        locationObj.detail,
                        locationObj.latitude,
                        locationObj.longitude
                    ]
                );
                const newLocId = locInsert.rows[0].id as number;

                // 새 location id를 다시 문서에 씌워준다
                Y.transact(scheduleItem.doc!, () => {
                    scheduleItem.set('location', {
                        ...locationObj,
                        id: newLocId
                    });
                }, DB_UPDATE_ORIGIN);
            }
        } else {
            // has_location=false → location 없애기
            await client.query(
                'DELETE FROM location WHERE schedule_id = $1',
                [scheduleId]
            );
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[DB] upsertScheduleItem failed:', err);
    } finally {
        client.release();
    }
}

/** 일정 항목 삭제 시 DB에서도 삭제 */
async function deleteScheduleItemIfPersisted(scheduleItem: Y.Map<any>) {
    const scheduleId = scheduleItem.get('id') as number | undefined;
    if (!scheduleId) return;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM location WHERE schedule_id = $1', [scheduleId]);
        await client.query('DELETE FROM schedule WHERE id = $1', [scheduleId]);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[DB] deleteScheduleItemIfPersisted failed:', err);
    } finally {
        client.release();
    }
}

/**
 * 예산 항목 하나(Y.Map)를 DB에 업서트.
 * - id 없으면 INSERT RETURNING id → Y.Doc에 set
 * - id 있으면 UPDATE
 */
async function upsertBudgetItem(
    tripId: number,
    budgetItem: Y.Map<any>,
    dateKey: string
) {
    const id = budgetItem.get('id') as number | undefined;
    const category = budgetItem.get('category') as string;
    const amount = budgetItem.get('amount') as number;
    const descVal = budgetItem.get('description');
    const description =
        descVal instanceof Y.Text ? descVal.toString() : (descVal ?? '');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let budgetId = id;
        if (!budgetId) {
            // INSERT
            const insertRes = await client.query(
                'INSERT INTO budget (trip_id, date, category, description, amount) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [tripId, dateKey, category, description, amount]
            );
            budgetId = insertRes.rows[0].id as number;

            Y.transact(budgetItem.doc!, () => {
                budgetItem.set('id', budgetId);
            }, DB_UPDATE_ORIGIN);
        } else {
            // UPDATE
            await client.query(
                'UPDATE budget SET category = $1, description = $2, amount = $3 WHERE id = $4 AND trip_id = $5',
                [category, description, amount, budgetId, tripId]
            );
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[DB] upsertBudgetItem failed:', err);
    } finally {
        client.release();
    }
}

/** 예산 항목 삭제 시 DB에서도 삭제 */
async function deleteBudgetItemIfPersisted(budgetItem: Y.Map<any>) {
    const budgetId = budgetItem.get('id') as number | undefined;
    if (!budgetId) return;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM budget WHERE id = $1', [budgetId]);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[DB] deleteBudgetItemIfPersisted failed:', err);
    } finally {
        client.release();
    }
}

/**
 * schedules["YYYY-MM-DD"] (Y.Array<Y.Map>) 감시
 * - 추가: upsertScheduleItem 호출
 * - 삭제: deleteScheduleItemIfPersisted 호출
 * - 각 아이템 내부 필드 변경 감시도 세팅
 */
function observeScheduleDayArray(
    yDayArray: Y.Array<Y.Map<any>>,
    tripId: number,
    dateKey: string
) {
    yDayArray.observe((event: Y.YArrayEvent<Y.Map<any>>, tr: Y.Transaction) => {
        if (!isUserOrigin(tr)) return;

        // 삭제된 요소들
        event.changes.deleted.forEach(item => {
            for (const deletedVal of item.content.getContent()) {
                if (deletedVal instanceof Y.Map) {
                    deleteScheduleItemIfPersisted(deletedVal);
                }
            }
        });

        // 추가된 요소들
        event.changes.added.forEach(item => {
            for (const addedVal of item.content.getContent()) {
                if (addedVal instanceof Y.Map) {
                    // DB 반영 (INSERT or UPDATE)
                    debounce(`schedule_upsert:${tripId}:${dateKey}:${Math.random()}`, () => {
                        upsertScheduleItem(tripId, addedVal, dateKey);
                    });

                    // 하위 필드 감시 연결
                    hookScheduleItemObservers(addedVal, tripId, dateKey);
                }
            }
        });
    });

    // 기존 요소들에도 하위 감시자 붙인다
    yDayArray.toArray().forEach(schedMap => {
        hookScheduleItemObservers(schedMap, tripId, dateKey);
    });
}

/**
 * 일정 항목(Y.Map) 단위 감시
 * - 일반 필드(start_time, offset_time, has_location, location 등) → upsertScheduleItem
 * - memo(Y.Text) → upsertScheduleItem
 * - id가 아직 없을 수도 있으므로 그 경우 id 생긴 뒤 다시 감시
 */
function hookScheduleItemObservers(
    scheduleItem: Y.Map<any>,
    tripId: number,
    dateKey: string
) {
    // Map 변경 시
    scheduleItem.observe((evt: Y.YMapEvent<any>, tr: Y.Transaction) => {
        if (!isUserOrigin(tr)) return;
        debounce(
            `schedule_item:${tripId}:${dateKey}:${scheduleItem.get('id') ?? 'new'}`,
            () => {
                upsertScheduleItem(tripId, scheduleItem, dateKey);
            }
        );
    });

    // memo(Y.Text) 변경 시
    const memoVal = scheduleItem.get('memo');
    if (memoVal instanceof Y.Text) {
        memoVal.observe((_textEvt: Y.YTextEvent, tr: Y.Transaction) => {
            if (!isUserOrigin(tr)) return;
            debounce(
                `schedule_item_memo:${tripId}:${dateKey}:${scheduleItem.get('id') ?? 'new'}`,
                () => {
                    upsertScheduleItem(tripId, scheduleItem, dateKey);
                }
            );
        });
    }
}


/**
 * budgets["YYYY-MM-DD"] (Y.Array<Y.Map>) 감시
 * - 추가: upsertBudgetItem
 * - 삭제: deleteBudgetItemIfPersisted
 * - 각 아이템 내부 필드 및 description(Y.Text)까지 감시
 */
function observeBudgetDayArray(
    yDayArray: Y.Array<Y.Map<any>>,
    tripId: number,
    dateKey: string
) {
    yDayArray.observe((event: Y.YArrayEvent<Y.Map<any>>, tr: Y.Transaction) => {
        if (!isUserOrigin(tr)) return;

        // 삭제
        event.changes.deleted.forEach(item => {
            for (const deletedVal of item.content.getContent()) {
                if (deletedVal instanceof Y.Map) {
                    deleteBudgetItemIfPersisted(deletedVal);
                }
            }
        });

        // 추가
        event.changes.added.forEach(item => {
            for (const addedVal of item.content.getContent()) {
                if (addedVal instanceof Y.Map) {
                    debounce(`budget_upsert:${tripId}:${dateKey}:${Math.random()}`, () => {
                        upsertBudgetItem(tripId, addedVal, dateKey);
                    });
                    hookBudgetItemObservers(addedVal, tripId, dateKey);
                }
            }
        });
    });

    // 기존 요소들도 관찰
    yDayArray.toArray().forEach(budgetItem => {
        hookBudgetItemObservers(budgetItem, tripId, dateKey);
    });
}

/**
 * 예산 항목(Y.Map) 단위 감시
 * - 일반 필드(category, amount 등) → upsertBudgetItem
 * - description(Y.Text) → upsertBudgetItem
 */
function hookBudgetItemObservers(
    budgetItem: Y.Map<any>,
    tripId: number,
    dateKey: string
) {
    // Map 전체 변경 감시
    budgetItem.observe((_evt: Y.YMapEvent<any>, tr: Y.Transaction) => {
        if (!isUserOrigin(tr)) return;

        debounce(
            `budget_item:${tripId}:${dateKey}:${budgetItem.get('id') ?? 'new'}`,
            () => {
                upsertBudgetItem(tripId, budgetItem, dateKey);
            }
        );
    });

    // description(Y.Text) 감시
    const descVal = budgetItem.get('description');
    if (descVal instanceof Y.Text) {
        descVal.observe((_textEvt: Y.YTextEvent, tr: Y.Transaction) => {
            if (!isUserOrigin(tr)) return;

            debounce(
                `budget_item_desc:${tripId}:${dateKey}:${budgetItem.get('id') ?? 'new'}`,
                () => {
                    upsertBudgetItem(tripId, budgetItem, dateKey);
                }
            );
        });
    }
}


/**
 * 외부에서 실제로 쓰는 퍼시스턴스 초기화 함수.
 * - tripInfo 감시
 * - schedules(dateKey별 Array) 감시
 * - budgets(dateKey별 Array) 감시
 * - 이후 새 dateKey가 생겨도 자동으로 해당 Array에 observe 붙임
 */
export function setupPersistence(doc: Y.Doc) {
    const tripInfo = doc.getMap('tripInfo');
    const tripId = tripInfo.get('id') as number;

    // --- tripInfo 감시 (일반 필드)
    tripInfo.observe((event: Y.YMapEvent<any>, tr: Y.Transaction) => {
        if (!isUserOrigin(tr)) return;

        event.keysChanged.forEach(key => {
            if (key === 'title') return; // title은 아래 따로
            const newValue = tripInfo.get(key);
            scheduleTripFieldSave(tripId, key, newValue);
        });
    });

    // --- tripInfo.title (Y.Text)
    const titleText = tripInfo.get('title') as Y.Text | undefined;
    if (titleText instanceof Y.Text) {
        titleText.observe((_textEvt: Y.YTextEvent, tr: Y.Transaction) => {
            if (!isUserOrigin(tr)) return;
            scheduleTripTitleSave(tripId, titleText);
        });
    }

    // --- schedules 감시 ---
    const schedulesMap = doc.getMap('schedules')
    for (const [dateKey, yDayArray] of (schedulesMap.entries() as Iterable<[string,
        Y.Array<Y.Map<any>>]>)) {
        if (!yDayArray) continue
        observeScheduleDayArray(yDayArray, tripId, dateKey)
        yDayArray.toArray().forEach(schedMap => {
            if (schedMap instanceof Y.Map) {
                hookScheduleItemObservers(schedMap, tripId, dateKey)
            }
        })
    }

    schedulesMap.observe((event: Y.YMapEvent<unknown>, tr: Y.Transaction) => {
        if (!isUserOrigin(tr)) return

        for (const [key, change] of event.changes.keys) {
            if (change.action === 'add') {
                const dateKey = String(key)
                const yDayArray = schedulesMap.get(dateKey) as Y.Array<Y.Map<any>> | undefined
                if (yDayArray) {
                    console.log('[Persistence] schedules: added dateKey', { tripId, dateKey })
                    observeScheduleDayArray(yDayArray, tripId, dateKey)

                    // Initial upsert for items that arrived in the same transaction
                    yDayArray.toArray().forEach((item, idx) => {
                        if (item instanceof Y.Map) {
                            debounce(`schedule_upsert:${tripId}:${dateKey}:init:${idx}`, () => {
                                upsertScheduleItem(tripId, item, dateKey)
                            })
                            hookScheduleItemObservers(item, tripId, dateKey)
                        }
                    })
                }
            }
        }
    })

    // 새 dateKey 추가 시
    schedulesMap.observe((event: Y.YMapEvent<any>, tr: Y.Transaction) => {
        if (!isUserOrigin(tr)) return;

        event.changes.added.forEach((key: any) => {
            const dateKey = key as string;
            const yDayArray = schedulesMap.get(dateKey) as Y.Array<Y.Map<any>>;
            observeScheduleDayArray(yDayArray, tripId, dateKey);
        });
        // dateKey 삭제에 따른 일괄 삭제/정리 정책은 서비스 정책에 따라 추가 가능
    });

    // --- budgets 감시 ---
    const budgetsMap = doc.getMap('budgets')

    for (const [dateKey, yDayArray] of (budgetsMap.entries() as Iterable<[string,
        Y.Array<Y.Map<any>>]>)) {
        if (!yDayArray) continue
        observeBudgetDayArray(yDayArray, tripId, dateKey)
        yDayArray.toArray().forEach(budgetMap => {
            if (budgetMap instanceof Y.Map) {
                hookBudgetItemObservers(budgetMap, tripId, dateKey)
            }
        })
    }

    budgetsMap.observe((event: Y.YMapEvent<unknown>, tr: Y.Transaction) => {
        if (!isUserOrigin(tr)) return

        for (const [key, change] of event.changes.keys) {
            if (change.action === 'add') {
                const dateKey = String(key)
                const yDayArray = budgetsMap.get(dateKey) as Y.Array<Y.Map<any>> | undefined
                if (yDayArray) {
                    observeBudgetDayArray(yDayArray, tripId, dateKey)

                    // Initial upsert for items that arrived in the same transaction
                    yDayArray.toArray().forEach((item, idx) => {
                        if (item instanceof Y.Map) {
                            debounce(`budget_upsert:${tripId}:${dateKey}:init:${idx}`, () => {
                                upsertBudgetItem(tripId, item, dateKey)
                            })
                            hookBudgetItemObservers(item, tripId, dateKey)
                        }
                    })
                }
            }
        }
    })

    // 새 dateKey 추가 시
    budgetsMap.observe((event: Y.YMapEvent<any>, tr: Y.Transaction) => {
        if (!isUserOrigin(tr)) return;

        event.changes.added.forEach((key: any) => {
            const dateKey = key as string;
            const yDayArray = budgetsMap.get(dateKey) as Y.Array<Y.Map<any>>;
            observeBudgetDayArray(yDayArray, tripId, dateKey);
        });
        // budgetsMap에서 dateKey 제거 시의 동작도 정책 따라 후처리 가능
    });

    console.log(`[Persistence] Persistence listeners attached for trip ${tripId}.`);
}
