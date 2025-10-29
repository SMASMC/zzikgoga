import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api'
import { useState, useRef } from 'react'
import Input from '@components/atoms/Input'
import SolidButton from '@/components/atoms/SolidButton'

const libraries: ('places')[] = ['places']

interface NewPlace {
  id: string
  displayName: { text: string }
  formattedAddress: string
  location: { latitude: number; longitude: number }
}

const PlaceSearchPanel = () => {
  const [keyword, setKeyword] = useState('')
  const [places, setPlaces] = useState<NewPlace[]>([])
  const [selectedPlace, setSelectedPlace] = useState<NewPlace | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const mapRef = useRef<google.maps.Map | null>(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAP_KEY,
    libraries,
  })

  /** 🔍 최신 Places API (New) 호출 */
  const handleSearch = async () => {
    if (!keyword.trim()) return
    setHasSearched(true)

    try {
      setHasSearched(false)
      setPlaces([])
      const res = await fetch(
        `https://places.googleapis.com/v1/places:searchText?key=${import.meta.env.VITE_GOOGLE_MAP_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.location',
          },
          body: JSON.stringify({ textQuery: keyword }),
        }
      )

      const data = await res.json()

      if (data.places?.length > 0) {
        setPlaces(data.places)
        setSelectedPlace(null)
        const first = data.places[0]
        mapRef.current?.setCenter({
          lat: first.location.latitude,
          lng: first.location.longitude,
        })
        mapRef.current?.setZoom(13)
      } else {
        setPlaces([])
      }
      setHasSearched(true)
    } catch (err) {
      console.error(err)
      alert('검색 중 오류가 발생했습니다.')
    }
  }

  /** 장소 클릭 시 선택 + 나머지 제거 */
  const handleSelectPlace = (place: NewPlace) => {
    setSelectedPlace(place)
    setPlaces([place]) // 클릭한 장소만 리스트에 남기기

    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.panTo({
          lat: place.location.latitude,
          lng: place.location.longitude,
        })
        mapRef.current.setZoom(15)
      }
    }, 50)
  }

  /** 장소 추가 버튼 클릭 핸들러 (API 자리만 열어둠) */
  const handleAddPlace = () => {
    if (!selectedPlace) {
      alert('먼저 장소를 선택해주세요.')
      return
    }

    // TODO: 장소 추가 API 요청
    // ex) await postPlace(selectedPlace)
  }

  if (!isLoaded) return <div>지도를 불러오는 중...</div>

  return (
    <div className="flex flex-col w-full md:w-1/4 p-4 border-r border-gray-200 bg-white">
      <h2 className="text-lg font-semibold mb-3">장소 검색</h2>

      {/* 검색창 */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
          placeholder="숙소, 관광지를 입력해주세요."
          className="placeholder-gray-400 flex-1 rounded px-2 py-1"
        />
        <SolidButton
          onClick={handleSearch}
          className="sm:w-auto w-full bg-blue-600 text-white px-4 py-2 rounded whitespace-nowrap"
        >
          검색
        </SolidButton>
      </div>

      {/* 검색 결과 리스트 */}
      <div className="overflow-y-auto max-h-64 mb-4 border rounded">
        {places.length > 0 ? (
          places.map((place) => (
            <div
              key={place.id}
              onClick={() => handleSelectPlace(place)}
              className={`cursor-pointer p-3 border-b hover:bg-blue-50 transition ${
                selectedPlace?.id === place.id ? 'bg-blue-100' : ''
              }`}
            >
              <p className="font-medium text-gray-900">{place.displayName.text}</p>
              <p className="text-sm text-gray-600">{place.formattedAddress}</p>
            </div>
          ))
        ) : hasSearched ? (
          <p className="text-gray-500 text-sm text-center p-3">검색 결과가 없습니다.</p>
        ) : null}
      </div>

      {/* 장소 추가 버튼 */}
      {selectedPlace && (
        <SolidButton
          onClick={handleAddPlace}
          className="w-full bg-green-600 text-white px-4 py-2 rounded mb-4 hover:bg-green-700"
        >
          장소 추가
        </SolidButton>
      )}

      {/* 지도 */}
      <div className="rounded-lg overflow-hidden shadow">
        <GoogleMap
          onLoad={(map) => {
            mapRef.current = map
          }}
          mapContainerStyle={{ width: '100%', height: '400px' }}
          center={{ lat: 37.5665, lng: 126.978 }}
          zoom={13}
        >
          {selectedPlace ? (
            <Marker
              position={{
                lat: selectedPlace.location.latitude,
                lng: selectedPlace.location.longitude,
              }}
              title={selectedPlace.displayName.text}
            />
          ) : (
            places.map((p) => (
              <Marker
                key={p.id}
                position={{
                  lat: p.location.latitude,
                  lng: p.location.longitude,
                }}
                title={p.displayName.text}
              />
            ))
          )}
        </GoogleMap>
      </div>
    </div>
  )
}

export default PlaceSearchPanel
