// TravelCard.tsx
const TravelCard = ({ title, date, img }: { title: string; date: string; img: string }) => (
  <div className="bg-white rounded-3xl shadow-lg overflow-hidden w-72 p-5 flex flex-col">
    <img src={img} alt={title} className="rounded-2xl h-48 object-cover mb-4" />
    <h3 className="font-bmjua text-text-500">{title}</h3>
    <p className="text-gray-500 text-sm mb-3">{date}</p>
    <div className="flex gap-2">
      <button className="flex-1 bg-gradient-to-br from-point-500 to-main-700 text-white py-2 rounded-2xl hover:from-point-600 hover:to-main-800 transition-all">
        정산하기
      </button>
      <button className="w-12 bg-gradient-to-br from-hover-500 to-background-700 rounded-2xl flex justify-center items-center hover:from-hover-600 hover:to-background-800 transition-all">
        📷
      </button>
    </div>
  </div>
)

// TravelAddCard.tsx
const TravelAddCard = () => {
  // TODO: 여행 생성 팝업 함수 연결 필요
  const handleCreateTravel = () => {
    console.log('여행 생성 클릭')
    // 여기에 여행 생성 팝업 열기 함수 추가
  }

  return (
    <div
      onClick={handleCreateTravel}
      className="bg-white rounded-3xl w-72 h-[400px] shadow-lg flex flex-col justify-center items-center cursor-pointer hover:shadow-xl hover:scale-105 hover:bg-gradient-to-br hover:from-white hover:via-background-500 hover:to-background-600 transition-all duration-300"
    >
      <div className="bg-gradient-to-br from-hover-600 to-point-600 w-20 h-20 rounded-3xl flex justify-center items-center mb-6">
        <svg
          className="w-12 h-12 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="3"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <h3 className="font-bmjua text-text-500 text-lg mb-2">여행 시작하기</h3>
      <p className="text-gray-500 text-sm">새로운 추억을 만들어보세요</p>
    </div>
  )
}

export { TravelCard, TravelAddCard }
