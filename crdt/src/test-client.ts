import { WebSocket as NodeWS } from 'ws'
;(global as any).WebSocket = NodeWS
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const ydoc = new Y.Doc();
const provider = new WebsocketProvider(
  'ws://localhost:8081',
  'trip-101',
  ydoc
);

const tripInfo = ydoc.getMap('tripInfo');
// const tripSchedule = ydoc.getMap('schedules');
// const tripBudget = ydoc.getMap('budgets');

function logTitleDebug(prefix: string) {
  const node = tripInfo.get('title');
  if (node instanceof Y.Text) {
    console.log(prefix, {
      text: node.toString(),
      len: node.length,
      id: (node as any)._item?.id,
      docSame: node.doc === ydoc,
    });
  } else {
    console.log(prefix, {
      notText: true,
      value: node,
      docSame: (node as any)?.doc === ydoc
    });
  }
}

tripInfo.observe(() => {
  console.log('[Client] tripInfo changed');
  logTitleDebug('[Client] title node');
});

provider.on('sync', (isSynced: boolean) => {
  console.log('[Client] sync =', isSynced);
  if (isSynced) {
    console.log('[Client] synced snapshot:');
    logTitleDebug('[Client] before edit');

    runTest();
  }
});

function runTest() {
  console.log('[Client] runTest()');
  const node = tripInfo.get('title');
  // const node2 = tripSchedule.get('title');
  // const node3 = tripBudget.get('description');

  if (!(node instanceof Y.Text)) {
    console.log('[Client] title is not Y.Text, abort');
    return;
  }

  // if (!(node3 instanceof Y.Text)) {
  //   console.log('[Client] title is not Y.Text, abort');
  //   return;
  // }

  // 단순 prepend
  node.insert(0, `test 3 `);
  // node3.insert(0, `test `);

  console.log('[Client] after local insert:');
  logTitleDebug('[Client] after edit');

  setTimeout(() => {
    provider.disconnect();
    console.log('[Client] Disconnected.');
  }, 2000); // 2초간 대기하며 전송 보장
}
