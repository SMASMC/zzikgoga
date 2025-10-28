// Y.Doc 로딩 및 캐싱 로직
//LF 변환

import * as Y from 'yjs';
import { loadYDocFromDB } from '../persistence/dbLoad';
import { setupPersistence } from '../persistence/dbPersist';

const activeDocs = new Map<string, Y.Doc>();

export async function getOrCreateDoc(roomName: string): Promise<Y.Doc> {
  // roomName 예: "trip-123"
  const tripId = parseInt(roomName.split('-')[1] ?? '0', 10);
  if (!tripId) {
    throw new Error('Invalid room name');
  }

  // 이미 메모리에 살아 있는 문서면 그대로 재사용
  let doc = activeDocs.get(roomName);
  if (doc) {
    console.log(`[Cache] Doc ${roomName} found in memory.`);
    return doc;
  }

  // 새 문서 생성
  doc = new Y.Doc();

  // 1) DB에서 초기 스냅샷 로드해 Y.Doc 채움
  await loadYDocFromDB(tripId, doc);

  // 2) 이후 변경 사항을 DB에 반영하도록 퍼시스턴스 리스너 장착
  setupPersistence(doc);

  // 3) 캐시에 등록
  activeDocs.set(roomName, doc);

  // 4) 정리 훅
  doc.on('destroy', () => {
    activeDocs.delete(roomName);
    console.log(`[Cache] Doc ${roomName} destroyed and removed from memory.`);
  });

  return doc;
}
