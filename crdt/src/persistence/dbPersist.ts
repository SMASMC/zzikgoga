// src/persistence/dbPersist.ts
import * as Y from 'yjs'
import {
    updateTripTitle,
    updateTripField,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    createLocation,
    updateLocation,
    deleteLocationByScheduleId,
    createBudget,
    updateBudget,
    deleteBudget,
} from './crud'

const DB_UPDATE_ORIGIN = 'db_update'

// ---------------- debounce ----------------
const debouncers = new Map<string, NodeJS.Timeout>()
function debounce(id: string, func: () => void, delay = 2000) {
    const t = debouncers.get(id)
    if (t) clearTimeout(t)
    debouncers.set(id, setTimeout(() => { func(); debouncers.delete(id) }, delay))
}
function cancelDebounce(id: string) {
    const t = debouncers.get(id)
    if (t) { clearTimeout(t); debouncers.delete(id) }
}

// ---------------- utils ----------------
function normalizeMemo(text: string): string {
    let s = (text || '').replace(/\r\n/g, '\n')
    s = s.replace(/[\s\n]+$/, '')
    const idx = s.indexOf('\n')
    if (idx > 0) {
        const left = s.slice(0, idx).trimEnd()
        const right = s.slice(idx + 1).trimEnd()
        if (left.length > 0 && left === right) return left
    }
    return s
}

function fromAnyToIntervalString(v: any): string | null {
    if (v == null) return null
    if (typeof v === 'string') {
        const s = v.trim()
        if (!s || s === '[object Object]') return null
        return s
    }
    if (typeof v === 'object') {
        const { years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0 } = v as any
        const parts: string[] = []
        if (years) parts.push(`${years} years`)
        if (months) parts.push(`${months} months`)
        if (days) parts.push(`${days} days`)
        if (hours) parts.push(`${hours} hours`)
        if (minutes) parts.push(`${minutes} minutes`)
        if (seconds) parts.push(`${seconds} seconds`)
        return parts.length ? parts.join(' ') : '0 seconds'
    }
    return null
}

// 숫자/숫자문자열만 number로, 그 외 undefined
function asNumberId(v: unknown): number | undefined {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && /^\d+$/.test(v)) {
        const n = Number(v)
        return Number.isFinite(n) ? n : undefined
    }
    return undefined
}

function isUserOrigin(tr: Y.Transaction): boolean {
    return tr.origin !== 'db_load' && tr.origin !== DB_UPDATE_ORIGIN
}

// ---------------- trip ----------------
function scheduleTripTitleSave(tripId: number, titleText: Y.Text) {
    debounce(`trip:${tripId}:title`, () => {
        const newTitle = titleText.toString()
        updateTripTitle(tripId, newTitle).catch(err => {
            console.error('[DB] Failed to update trip.title:', err)
        })
    })
}

function scheduleTripFieldSave(tripId: number, key: string, value: any) {
    debounce(`trip:${tripId}:${key}`, () => {
        updateTripField(tripId, key, value).catch(err => {
            console.error(`[DB] Failed to update trip.${key}:`, err)
        })
    })
}

// ---------------- schedules ----------------
async function upsertScheduleItem(
    tripId: number,
    scheduleItem: Y.Map<any>,
    dateKey: string
) {
    const id = scheduleItem.get('id') as number | undefined
    const start_time = scheduleItem.get('start_time') as string
    const rawOffset = scheduleItem.get('offset_time')
    const offset_time = fromAnyToIntervalString(rawOffset)
    const memoVal = scheduleItem.get('memo')
    const rawMemo = memoVal instanceof Y.Text ? memoVal.toString() : (memoVal ?? '')
    const memo = normalizeMemo(String(rawMemo))
    const has_location = !!scheduleItem.get('has_location')
    const locationObj = scheduleItem.get('location') || null

    const isDeleted = scheduleItem.get('_deleted') === true

    if (isDeleted && id) {
        try {
            await deleteSchedule(id)
            console.log(`[DB] Schedule deleted: ${id}`)
        } catch (err) {
            console.error('[DB] Failed to delete schedule:', err)
        }
        return
    }

    try {
        let scheduleId = id
        if (!scheduleId) {
            scheduleId = await createSchedule({ trip_id: tripId, start_time, offset_time, memo, has_location })
            Y.transact(scheduleItem.doc!, () => { scheduleItem.set('id', scheduleId) }, DB_UPDATE_ORIGIN)
        } else {
            await updateSchedule(scheduleId, { start_time, offset_time, memo, has_location })
        }

        if (has_location) {
            if (locationObj && locationObj.id) {
                await updateLocation(locationObj.id, {
                    name: locationObj.name,
                    full_address: locationObj.full_address,
                    detail: locationObj.detail,
                    latitude: locationObj.latitude,
                    longitude: locationObj.longitude
                })
            } else if (locationObj) {
                const newLocId = await createLocation({
                    schedule_id: scheduleId,
                    name: locationObj.name,
                    full_address: locationObj.full_address,
                    detail: locationObj.detail,
                    latitude: locationObj.latitude,
                    longitude: locationObj.longitude
                })
                Y.transact(scheduleItem.doc!, () => {
                    scheduleItem.set('location', { ...locationObj, id: newLocId })
                }, DB_UPDATE_ORIGIN)
            }
        }
    } catch (err) {
        console.error('[DB] upsertScheduleItem failed:', err)
    }
}

async function deleteScheduleItemIfPersisted(scheduleItem: Y.Map<any>) {
    const raw = scheduleItem.get('id')
    const scheduleId = asNumberId(raw)
    if (scheduleId == null) {
        console.log('[DB] Schedule item has no valid id, skipping delete')
        return
    }
    console.log(`[DB] Deleting schedule from database: scheduleId=${scheduleId}`)
    try {
        await deleteSchedule(scheduleId)
        console.log(`[DB] Successfully deleted schedule ${scheduleId} (and its location via CASCADE)`)
    } catch (err) {
        console.error('[DB] deleteScheduleItemIfPersisted failed:', err)
    }
}

function observeScheduleDayArray(
    yDayArray: Y.Array<Y.Map<any>>,
    tripId: number,
    dateKey: string
) {
    yDayArray.observe((event: Y.YArrayEvent<Y.Map<any>>, tr: Y.Transaction) => {
        if (!isUserOrigin(tr)) return

        // 삭제
        event.changes.deleted.forEach(item => {
            for (const deletedVal of item.content.getContent()) {
                if (deletedVal instanceof Y.Map) {
                    const scheduleId = deletedVal.get('id') as number | undefined
                    console.log(`[Observer] Schedule deleted from Yjs array:`, { tripId, dateKey, scheduleId })
                    deleteScheduleItemIfPersisted(deletedVal)
                }
            }
        })

        // 추가
        event.changes.added.forEach(item => {
            for (const addedVal of item.content.getContent()) {
                if (addedVal instanceof Y.Map) {
                    const keyId = (addedVal.get('id') ?? addedVal.get('uid') ?? 'new') as string | number
                    debounce(`schedule_upsert:${tripId}:${dateKey}:${keyId}`, () => {
                        upsertScheduleItem(tripId, addedVal, dateKey)
                    })
                    hookScheduleItemObservers(addedVal, tripId, dateKey)
                }
            }
        })
    })

    // 기존 요소 하위 옵저버
    yDayArray.toArray().forEach(schedMap => {
        hookScheduleItemObservers(schedMap, tripId, dateKey)
    })
}

function hookScheduleItemObservers(
    scheduleItem: Y.Map<any>,
    tripId: number,
    dateKey: string
) {
    // 맵 변경
    scheduleItem.observe((_evt: Y.YMapEvent<any>, tr: Y.Transaction) => {
        if (!isUserOrigin(tr)) return
        const keyId = (scheduleItem.get('id') ?? scheduleItem.get('uid') ?? 'new') as string | number
        debounce(`schedule_item:${tripId}:${dateKey}:${keyId}`, () => {
            upsertScheduleItem(tripId, scheduleItem, dateKey)
        })
    })

    // 메모 텍스트 변경
    const memoVal = scheduleItem.get('memo')
    if (memoVal instanceof Y.Text) {
        memoVal.observe((_textEvt: Y.YTextEvent, tr: Y.Transaction) => {
            if (!isUserOrigin(tr)) return
            const keyId = (scheduleItem.get('id') ?? scheduleItem.get('uid') ?? 'new') as string | number
            debounce(`schedule_item_memo:${tripId}:${dateKey}:${keyId}`, () => {
                upsertScheduleItem(tripId, scheduleItem, dateKey)
            })
        })
    }
}

// ---------------- budgets ----------------
async function upsertBudgetItem(
    tripId: number,
    budgetItem: Y.Map<any>,
    dateKey: string
) {
    const id = budgetItem.get('id') as number | undefined
    const isDeleted = budgetItem.get('_deleted') === true

    // _deleted 플래그가 true면 삭제 처리
    if (isDeleted && id) {
        try {
            await deleteBudget(id)
            console.log(`[DB] Budget deleted: ${id}`)
        } catch (err) {
            console.error('[DB] Failed to delete budget:', err)
        }
        return
    }

    const category = budgetItem.get('category') as string
    const amount = budgetItem.get('amount') as number
    const descVal = budgetItem.get('description')
    const description = descVal instanceof Y.Text ? descVal.toString() : (descVal ?? '')

    try {
        let budgetId = id
        if (!budgetId) {
            budgetId = await createBudget({ trip_id: tripId, date: dateKey, category, description, amount })
            Y.transact(budgetItem.doc!, () => { budgetItem.set('id', budgetId) }, DB_UPDATE_ORIGIN)
        } else {
            await updateBudget(budgetId, { category, description, amount })
        }
    } catch (err) {
        console.error('[DB] upsertBudgetItem failed:', err)
    }
}


function observeBudgetDayArray(
    yDayArray: Y.Array<Y.Map<any>>,
    tripId: number,
    dateKey: string
) {
    yDayArray.observe((event: Y.YArrayEvent<Y.Map<any>>, tr: Y.Transaction) => {
        if (!isUserOrigin(tr)) return

        // 추가된 아이템 처리
        event.changes.added.forEach(item => {
            for (const addedVal of item.content.getContent()) {
                if (addedVal instanceof Y.Map) {
                    const keyId = (addedVal.get('id') ?? addedVal.get('uid') ?? 'new') as string | number
                    debounce(`budget_upsert:${tripId}:${dateKey}:${keyId}`, () => {
                        upsertBudgetItem(tripId, addedVal, dateKey)
                    })
                    hookBudgetItemObservers(addedVal, tripId, dateKey)
                }
            }
        })
    })

    // 기존 요소 하위 옵저버
    yDayArray.toArray().forEach(budgetItem => {
        hookBudgetItemObservers(budgetItem, tripId, dateKey)
    })
}

function hookBudgetItemObservers(
    budgetItem: Y.Map<any>,
    tripId: number,
    dateKey: string
) {
    budgetItem.observe((_evt, tr) => {
        if (!isUserOrigin(tr)) return
        const keyId = budgetItem.get('id') ?? budgetItem.get('uid') ?? 'new'
        debounce(`budget_item:${tripId}:${dateKey}:${keyId}`, () => {
            upsertBudgetItem(tripId, budgetItem, dateKey)
        })
    })

    const descVal = budgetItem.get('description')
    if (descVal instanceof Y.Text) {
        descVal.observe((_textEvt, tr) => {
            if (!isUserOrigin(tr)) return
            const keyId = budgetItem.get('id') ?? budgetItem.get('uid') ?? 'new'
            debounce(`budget_item_desc:${tripId}:${dateKey}:${keyId}`, () => {
                upsertBudgetItem(tripId, budgetItem, dateKey)
            })
        })
    }
}

// ---------------- setup ----------------
export function setupPersistence(doc: Y.Doc) {
    const tripInfo = doc.getMap('tripInfo')
    const tripId = (tripInfo.get('id') as number) ?? -1
    console.log(`[Persistence] Setting up observers for trip ${tripId}`)

    // tripInfo
    tripInfo.observe((event: Y.YMapEvent<any>, tr: Y.Transaction) => {
        if (!isUserOrigin(tr)) return
        event.keysChanged.forEach(key => {
            if (key === 'title') return
            const newValue = tripInfo.get(key)
            scheduleTripFieldSave(tripId, key, newValue)
        })
    })

    const titleText = tripInfo.get('title') as Y.Text | undefined
    if (titleText instanceof Y.Text) {
        titleText.observe((_textEvt: Y.YTextEvent, tr: Y.Transaction) => {
            if (!isUserOrigin(tr)) return
            scheduleTripTitleSave(tripId, titleText)
        })
    }

    // schedules
    const schedulesMap = doc.getMap('schedules') as Y.Map<Y.Array<Y.Map<any>>>
    for (const [dateKey, yDayArray] of schedulesMap.entries()) {
        if (!yDayArray) continue
        observeScheduleDayArray(yDayArray, tripId, dateKey)
        yDayArray.toArray().forEach(schedMap => {
            if (schedMap instanceof Y.Map) hookScheduleItemObservers(schedMap, tripId, dateKey)
        })
    }
    schedulesMap.observe((event: Y.YMapEvent<any>, tr: Y.Transaction) => {
        if (!isUserOrigin(tr)) return
        for (const [key, change] of event.changes.keys) {
            if (change.action === 'add') {
                const dateKey = String(key)
                const yDayArray = schedulesMap.get(dateKey) as Y.Array<Y.Map<any>> | undefined
                if (yDayArray) {
                    observeScheduleDayArray(yDayArray, tripId, dateKey)
                    yDayArray.toArray().forEach((item, idx) => {
                        if (item instanceof Y.Map) {
                            const keyId = (item.get('id') ?? item.get('uid') ?? `init-${idx}`) as string | number
                            debounce(`schedule_upsert:${tripId}:${dateKey}:${keyId}`, () => {
                                upsertScheduleItem(tripId, item, dateKey)
                            })
                            hookScheduleItemObservers(item, tripId, dateKey)
                        }
                    })
                }
            }
        }
    })

    // budgets
    const budgetsMap = doc.getMap('budgets') as Y.Map<Y.Array<Y.Map<any>>>
    for (const [dateKey, yDayArray] of budgetsMap.entries()) {
        if (!yDayArray) continue
        observeBudgetDayArray(yDayArray, tripId, dateKey)
        yDayArray.toArray().forEach(budgetMap => {
            if (budgetMap instanceof Y.Map) hookBudgetItemObservers(budgetMap, tripId, dateKey)
        })
    }
    budgetsMap.observe((event: Y.YMapEvent<any>, tr: Y.Transaction) => {
        if (!isUserOrigin(tr)) return
        for (const [key, change] of event.changes.keys) {
            if (change.action === 'add') {
                const dateKey = String(key)
                const yDayArray = budgetsMap.get(dateKey) as Y.Array<Y.Map<any>> | undefined
                if (yDayArray) {
                    observeBudgetDayArray(yDayArray, tripId, dateKey)
                    yDayArray.toArray().forEach((item, idx) => {
                        if (item instanceof Y.Map) {
                            const keyId = (item.get('id') ?? item.get('uid') ?? `init-${idx}`) as string | number
                            debounce(`budget_upsert:${tripId}:${dateKey}:${keyId}`, () => {
                                upsertBudgetItem(tripId, item, dateKey)
                            })
                            hookBudgetItemObservers(item, tripId, dateKey)
                        }
                    })
                }
            }
        }
    })

    console.log(`[Persistence] Persistence listeners attached for trip ${tripId}.`)
}
