import { useJsApiLoader, GoogleMap, Marker, Polyline } from '@react-google-maps/api'
import type { Libraries } from '@react-google-maps/api'
import { useCallback, useMemo, useRef, useState } from 'react'
import Input from '@/components/atoms/Input'
import SolidButton from '@/components/atoms/SolidButton'
import { ToastDock } from '@/components/blocks/ToastDock'
import PlaceModal from './PlaceModal'

const libraries: Libraries = ['places']

export interface NewPlace {
  id: string
  displayName: { text: string }
  formattedAddress: string
  location: { latitude: number; longitude: number }
}

const defaultCenter = { lat: 37.5665, lng: 126.978 }

const PlaceSearchPanel = () => {
  const [keyword, setKeyword] = useState('')
  const [places, setPlaces] = useState<NewPlace[]>([])
  const [selectedPlace, setSelectedPlace] = useState<NewPlace | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState(defaultCenter)

  const routePlaces = useMemo(() => {
    if (!selectedPlace) {
      return places
    }
    const others = places.filter((p) => p.id !== selectedPlace.id)
    return [selectedPlace, ...others]
  }, [places, selectedPlace])

  const mapRef = useRef<google.maps.Map | null>(null)

  const apiKey = useMemo(() => import.meta.env.VITE_GOOGLE_MAP_KEY ?? '', [])

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
  })

  const handleClosePlaceModal = () => setIsModalOpen(false)

  const handleSelectPlace = useCallback((place: NewPlace) => {
    setSelectedPlace(place)
    setPlaces((prev) => {
      if (prev.length === 0) {
        return [place]
      }
      const others = prev.filter((p) => p.id !== place.id)
      return [place, ...others]
    })
    const nextCenter = {
      lat: place.location.latitude,
      lng: place.location.longitude,
    }
    setMapCenter(nextCenter)
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.panTo(nextCenter)
        mapRef.current.setZoom(15)
      }
    }, 0)
  }, [])

  const handleAddPlace = useCallback(() => {
    if (!selectedPlace) {
      setToastMessage('먼저 장소를 선택해주세요.')
      return
    }
    setIsModalOpen(true)
  }, [selectedPlace])

  const handleSearch = useCallback(async () => {
    if (!keyword.trim()) {
      return
    }

    setErrorMessage(null)
    setHasSearched(false)
    setPlaces([])
    setSelectedPlace(null)

    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location',
        },
        body: JSON.stringify({ textQuery: keyword.trim() }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error?.message ?? 'Google Places API 요청에 실패했습니다.')
      }

      const payload = (await response.json()) as { places?: NewPlace[] }

      if (payload.places?.length) {
        setPlaces(payload.places)
        setSelectedPlace(payload.places[0])
        const first = payload.places[0]
        const nextCenter = {
          lat: first.location.latitude,
          lng: first.location.longitude,
        }
        setMapCenter(nextCenter)
        mapRef.current?.setCenter(nextCenter)
        mapRef.current?.setZoom(13)
      } else {
        setPlaces([])
        setErrorMessage('검색 결과가 없습니다.')
      }
    } catch (error) {
      console.error(error)
      setErrorMessage(
        error instanceof Error ? error.message : '검색 중 오류가 발생했습니다. 다시 시도해주세요.'
      )
    } finally {
      setHasSearched(true)
    }
  }, [apiKey, keyword])

  if (!apiKey) {
    return (
      <aside className="flex w-full flex-col gap-4 border-r border-slate-200 bg-white p-4 md:w-1/3 lg:w-1/4">
        <p className="text-sm text-slate-500">
          Google Maps API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요.
        </p>
      </aside>
    )
  }

  if (loadError) {
    return (
      <aside className="flex w-full flex-col gap-4 border-r border-slate-200 bg-white p-4 md:w-1/3 lg:w-1/4">
        <p className="text-sm text-red-500">
          Google Maps 로딩 중 오류가 발생했습니다.
          <br />
          {loadError instanceof Error ? loadError.message : 'Invalid Google Maps API key.'}
        </p>
      </aside>
    )
  }

  if (!isLoaded) {
    return (
      <aside className="flex w-full items-center justify-center border-r border-slate-200 bg-white p-4 md:w-1/3 lg:w-1/4">
        <p className="text-sm text-slate-500">Google Maps를 불러오는 중입니다...</p>
      </aside>
    )
  }

  return (
    <aside className="flex w-full flex-col gap-6 border-r border-slate-200 bg-white p-4 md:w-1/3 lg:w-1/4">
      <ToastDock
        open={Boolean(toastMessage)}
        variant="hint"
        title="안내"
        message={toastMessage ?? ''}
        autoCloseMs={2500}
        offsetPx={16}
        onClose={() => setToastMessage(null)}
      />

      <header>
        <h2 className="text-2xl font-extrabold text-slate-900">장소 검색</h2>
        <p className="mt-1 text-sm text-slate-400">검색 후 리스트에서 장소를 클릭해 추가하세요.</p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="text"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleSearch()
            }
          }}
          placeholder="장소, 관광지, 주소 등을 입력해주세요"
          className="flex-1 rounded-full placeholder:text-slate-400"
        />
        <SolidButton
          onClick={handleSearch}
          className="w-full rounded-full bg-main-600 px-4 py-2 text-white hover:bg-main-700 sm:w-auto"
        >
          검색
        </SolidButton>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {errorMessage}
        </div>
      ) : null}

      <section className="max-h-64 overflow-y-auto rounded border">
        {places.length > 0 ? (
          places.map((place) => (
            <button
              key={place.id}
              type="button"
              onClick={() => handleSelectPlace(place)}
              className={`w-full cursor-pointer border-b px-3 py-2 text-left transition hover:bg-main-50 ${
                selectedPlace?.id === place.id ? 'bg-main-100' : ''
              }`}
            >
              <p className="font-medium text-slate-800">{place.displayName.text}</p>
              <p className="text-xs text-slate-500">{place.formattedAddress}</p>
            </button>
          ))
        ) : hasSearched ? (
          <p className="px-3 py-2 text-center text-xs text-slate-400">검색 결과가 없습니다.</p>
        ) : (
          <p className="px-3 py-2 text-center text-xs text-slate-300">검색어를 입력해 주세요.</p>
        )}
      </section>

      {selectedPlace ? (
        <SolidButton
          onClick={handleAddPlace}
          className="w-full rounded-full bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600"
        >
          선택한 장소 추가
        </SolidButton>
      ) : null}

      <div className="overflow-hidden rounded-lg shadow">
        <GoogleMap
          onLoad={(map) => {
            mapRef.current = map
          }}
          mapContainerClassName="w-full h-[50vh] sm:h-[55vh] md:h-[60vh] lg:h-[65vh] xl:h-[70vh] 2xl:h-[75vh]"
          center={mapCenter}
          zoom={selectedPlace ? 13 : 11}
          onDragEnd={() => {
            const center = mapRef.current?.getCenter()
            if (center) {
              setMapCenter({ lat: center.lat(), lng: center.lng() })
            }
          }}
          options={{ gestureHandling: 'greedy' }}
        >
          {routePlaces.map((place) => (
            <Marker
              key={place.id}
              position={{
                lat: place.location.latitude,
                lng: place.location.longitude,
              }}
              title={place.displayName.text}
            />
          ))}
          {routePlaces.length > 1 && (
            <Polyline
              path={routePlaces.map((place) => ({
                lat: place.location.latitude,
                lng: place.location.longitude,
              }))}
              options={{ strokeColor: '#2563eb', strokeOpacity: 0.7, strokeWeight: 4 }}
            />
          )}
        </GoogleMap>
      </div>

      {isModalOpen && selectedPlace ? (
        <PlaceModal
          onClose={handleClosePlaceModal}
          place={{
            name: selectedPlace.displayName.text,
            full_address: selectedPlace.formattedAddress,
            latitude: selectedPlace.location.latitude,
            longitude: selectedPlace.location.longitude,
          }}
        />
      ) : null}
    </aside>
  )
}

export default PlaceSearchPanel
