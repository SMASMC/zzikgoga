// PlaceSearchPanel.tsx
// 여행지 검색 패널(왼쪽)

import { LoadScript, GoogleMap, Marker } from '@react-google-maps/api'
import { useState } from 'react'
import Input from '@components/atoms/Input'
import Button from '@components/atoms/Button'

const containerStyle = {
  width: '100%',
  height: '400px',
}

const defaultCenter = {
  lat: 37.5665, // 서울시청 기준 좌표
  lng: 126.978,
}

// libraries 배열을 컴포넌트 외부로 이동 (재렌더링 시 참조 유지)
const libraries: ('places' | 'geometry' | 'drawing' | 'visualization')[] = ['places']

const PlaceSearchPanel = () => {
  const [keyword, setKeyword] = useState('')

  const handleSearch = () => {
    // 아직 검색은 구현하지 않음
    alert(`검색 기능은 추후 연결 예정입니다.\n입력값: ${keyword}`)
  }

  return (
    <div className="flex flex-col w-1/4  p-4">
      <h2 className="text-lg font-semibold mb-3">장소 검색</h2>

      {/* 검색창 */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="장소 검색"
          className="flex-1 rounded px-2 py-1"
        />
        <Button
          onClick={handleSearch}
          className="sm:w-auto w-full bg-blue-600 text-white px-4 py-2 rounded whitespace-nowrap"
        >
          검색
        </Button>
      </div>

      {/* 지도 표시 영역 */}
      <div className="rounded-lg overflow-hidden shadow">
        <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAP_KEY} libraries={libraries}>
          <GoogleMap mapContainerStyle={containerStyle} center={defaultCenter} zoom={13}>
            {/* 이후에 마커, 검색 결과 등을 여기에 추가 */}
            {/* 테스트용 기본 마커 추가 */}
            <Marker position={defaultCenter} label="서울시청" />
          </GoogleMap>
        </LoadScript>
      </div>
    </div>
  )
}

export default PlaceSearchPanel
