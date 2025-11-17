/**
 * 카카오톡 공유 서비스
 * Kakao JavaScript SDK를 사용한 카카오톡 공유 기능
 */

declare global {
  interface Window {
    Kakao: any
  }
}

export class KakaoShareService {
  private static isInitialized = false

  /**
   * Kakao SDK 초기화
   */
  private static init(): void {
    if (this.isInitialized) return

    if (window.Kakao && !window.Kakao.isInitialized()) {
      const appKey = import.meta.env.VITE_KAKAO_REST_API_KEY
      window.Kakao.init(appKey)
      this.isInitialized = true
      console.log('Kakao SDK initialized:', window.Kakao.isInitialized())
    }
  }

  /**
   * 카카오톡으로 링크 공유
   * @param url 공유할 URL
   * @param title 공유 제목
   * @param description 공유 설명
   * @param imageUrl 공유 이미지 URL (선택)
   */
  public static shareLink(params: {
    url: string
    title: string
    description: string
    imageUrl?: string
  }): void {
    this.init()

    if (!window.Kakao) {
      console.error('Kakao SDK not loaded')
      alert('카카오톡 공유 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.')
      return
    }

    try {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: params.title,
          description: params.description,
          imageUrl: params.imageUrl || window.location.origin + '/pwa-512x512.png',
          link: {
            mobileWebUrl: params.url,
            webUrl: params.url,
          },
        },
        buttons: [
          {
            title: '여행 참여하기',
            link: {
              mobileWebUrl: params.url,
              webUrl: params.url,
            },
          },
        ],
      })
    } catch (error) {
      console.error('Kakao share error:', error)
      // 공유 실패 시 클립보드 복사로 폴백
      navigator.clipboard.writeText(params.url).then(() => {
        alert('카카오톡 공유에 실패했습니다. 링크가 클립보드에 복사되었습니다.')
      })
    }
  }

  /**
   * 카카오톡으로 초대 링크 공유 (간편 버전)
   */
  public static shareInvite(inviteUrl: string, tripTitle?: string): void {
    this.shareLink({
      url: inviteUrl,
      title: tripTitle ? `${tripTitle} 여행에 초대합니다!` : '여행에 초대합니다!',
      description: '함께 즐거운 여행을 계획해요 ✈️',
      imageUrl: window.location.origin + '/pwa-512x512.png',
    })
  }
}
