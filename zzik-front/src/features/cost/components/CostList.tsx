// CostList.tsx
// 정산 리스트 컴포넌트
// 전체 정산 내역 및 상세 조회

const CostList = () => {
  // 임시 데이터
  const mockCosts = [
    {
      id: 1,
      category: '식비',
      amount: 45000,
      description: '점심 식사',
      date: '2025-11-06',
      userName: '김철수',
    },
    {
      id: 2,
      category: '교통비',
      amount: 15000,
      description: '택시비',
      date: '2025-11-06',
      userName: '이영희',
    },
    {
      id: 3,
      category: '숙박비',
      amount: 120000,
      description: '호텔 1박',
      date: '2025-11-05',
      userName: '박지성',
    },
  ]

  const totalAmount = mockCosts.reduce((sum, cost) => sum + cost.amount, 0)

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-text-500 font-bmjua">정산 내역</h2>
        <div className="text-right">
          <p className="text-sm text-text-600">총 금액</p>
          <p className="text-2xl font-bold text-point-500 font-bmjua">
            {totalAmount.toLocaleString()}원
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {mockCosts.length === 0 ? (
          <div className="text-center py-12 text-text-400">
            <p>아직 등록된 비용이 없습니다.</p>
            <p className="text-sm mt-2">왼쪽에서 비용을 추가해보세요!</p>
          </div>
        ) : (
          mockCosts.map((cost) => (
            <div
              key={cost.id}
              className="bg-gray-50 rounded-2xl p-4 hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                      {cost.category}
                    </span>
                    <span className="text-xs text-gray-500">{cost.date}</span>
                  </div>
                  <p className="text-text-600 text-sm">{cost.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-text-500 font-bmjua">
                    {cost.amount.toLocaleString()}원
                  </p>
                  <p className="text-xs text-gray-500">{cost.userName}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CostList
