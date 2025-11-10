import { useEffect, useRef, useState, useCallback } from 'react'
import * as Y from 'yjs'
import { acquireProvider, releaseProvider, type AcquiredProvider } from '../stores/yjsStore'
import type { Coordinates, PlanPlace } from '../types/plan'

type YPlace = Y.Map<unknown>

const isCoordinates = (value: unknown): value is Coordinates =>
  typeof value === 'object' &&
  value !== null &&
  'lat' in value &&
  'lng' in value &&
  typeof (value as Coordinates).lat === 'number' &&
  typeof (value as Coordinates).lng === 'number'

const toStringOrUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined

const toNumberOrUndefined = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const Y_ARRAY_KEY = 'plan-table'

const yMapToPlanPlace = (item: YPlace): PlanPlace => {
  const location = item.get('location')

  return {
    id: toStringOrUndefined(item.get('id')) ?? '',
    googlePlaceId: toStringOrUndefined(item.get('googlePlaceId')),
    name: toStringOrUndefined(item.get('name')) ?? '',
    address: toStringOrUndefined(item.get('address')) ?? '',
    location: isCoordinates(location) ? location : { lat: 0, lng: 0 },
    startTime: toStringOrUndefined(item.get('startTime')),
    endTime: toStringOrUndefined(item.get('endTime')),
    activity: toStringOrUndefined(item.get('activity')),
    detailAddress: toStringOrUndefined(item.get('detailAddress')),
    createdAt: toNumberOrUndefined(item.get('createdAt')) ?? Date.now(),
  }
}

const planPlaceToYMap = (entry: PlanPlace): YPlace => {
  const map = new Y.Map()
  map.set('id', entry.id)
  map.set('googlePlaceId', entry.googlePlaceId ?? null)
  map.set('name', entry.name)
  map.set('address', entry.address)
  map.set('location', entry.location)
  map.set('startTime', entry.startTime ?? null)
  map.set('endTime', entry.endTime ?? null)
  map.set('activity', entry.activity ?? null)
  map.set('detailAddress', entry.detailAddress ?? null)
  map.set('createdAt', entry.createdAt)
  return map
}

interface SharedPlanTable {
  places: PlanPlace[]
  addPlace: (place: PlanPlace) => void
  updatePlace: (id: string, data: Partial<PlanPlace>) => void
  removePlace: (id: string) => void
  reorderPlaces: (fromIndex: number, toIndex: number) => void
}

export const useSharedPlanTable = (roomId: string): SharedPlanTable => {
  const [places, setPlaces] = useState<PlanPlace[]>([])
  const providerRef = useRef<AcquiredProvider | null>(null)
  const arrayRef = useRef<Y.Array<YPlace> | null>(null)

  useEffect(() => {
    const provider = acquireProvider(roomId)
    providerRef.current = provider
    const yArray = provider.doc.getArray<YPlace>(Y_ARRAY_KEY)
    arrayRef.current = yArray

    const sync = () => {
      setPlaces(yArray.toArray().map((item) => yMapToPlanPlace(item)))
    }

    sync()

    const observer = () => {
      sync()
    }

    yArray.observe(observer)

    return () => {
      yArray.unobserve(observer)
      arrayRef.current = null
      providerRef.current = null
      releaseProvider(roomId)
    }
  }, [roomId])

  const addPlace = useCallback((place: PlanPlace) => {
    const provider = providerRef.current
    const yArray = arrayRef.current
    if (!provider || !yArray) {
      return
    }
    const yMap = planPlaceToYMap(place)
    provider.doc.transact(() => {
      yArray.push([yMap])
    })
  }, [])

  const updatePlace = useCallback((id: string, data: Partial<PlanPlace>) => {
    const provider = providerRef.current
    const yArray = arrayRef.current
    if (!provider || !yArray) {
      return
    }

    provider.doc.transact(() => {
      const index = yArray.toArray().findIndex((item) => item.get('id') === id)
      if (index === -1) {
        return
      }
      const target = yArray.get(index)
      if (!target) {
        return
      }
      Object.entries(data).forEach(([key, value]) => {
        target.set(key, value ?? null)
      })
    })
  }, [])

  const removePlace = useCallback((id: string) => {
    const provider = providerRef.current
    const yArray = arrayRef.current
    if (!provider || !yArray) {
      return
    }

    provider.doc.transact(() => {
      const index = yArray.toArray().findIndex((item) => item.get('id') === id)
      if (index === -1) {
        return
      }
      yArray.delete(index, 1)
    })
  }, [])

  const reorderPlaces = useCallback((fromIndex: number, toIndex: number) => {
    const provider = providerRef.current
    const yArray = arrayRef.current
    if (!provider || !yArray) {
      return
    }
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return
    }
    const current = yArray.toArray()
    if (fromIndex >= current.length || toIndex >= current.length) {
      return
    }

    provider.doc.transact(() => {
      const [moved] = current.splice(fromIndex, 1)
      current.splice(toIndex, 0, moved)
      yArray.delete(0, yArray.length)
      yArray.push(current)
    })
  }, [])

  return {
    places,
    addPlace,
    updatePlace,
    removePlace,
    reorderPlaces,
  }
}
