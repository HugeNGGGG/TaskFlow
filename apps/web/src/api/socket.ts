import { getAccessToken } from './client';
import { PUBLIC_ORIGIN } from './client';
// #ifdef H5
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore vendored MIT-licensed browser bundle（含内联依赖）
import '../vendor/socket.io.min.js';
// #endif

export interface RealtimeClient {
  subscribeTask(taskId: string): void;
  unsubscribeTask(taskId: string): void;
  onTaskStatusChanged(handler: (payload: { taskId: string; status: string }) => void): void;
  onProgressUpdated(handler: (payload: unknown) => void): void;
  close(): void;
}

export function createRealtimeClient(): RealtimeClient | null {
  // #ifdef H5
  interface SocketLike {
    emit(event: string, payload?: unknown): void;
    on(event: string, handler: (payload: any) => void): void;
    close(): void;
  }
  const ioFn = (window as unknown as {
    io: (url: string, opts?: unknown) => SocketLike;
  }).io;
  const socket = ioFn(`${PUBLIC_ORIGIN}/ws`, {
    transports: ['websocket', 'polling'],
    auth: { token: getAccessToken() },
  });
  return {
    subscribeTask(taskId: string) {
      socket.emit('subscribe:task', { taskId });
    },
    unsubscribeTask(taskId: string) {
      socket.emit('unsubscribe:task', { taskId });
    },
    onTaskStatusChanged(handler: (payload: { taskId: string; status: string }) => void) {
      socket.on('task.status_changed', handler);
    },
    onProgressUpdated(handler: (payload: unknown) => void) {
      socket.on('progress.updated', handler);
    },
    close() {
      socket.close();
    },
  };
  // #endif
  // #ifndef H5
  return null;
  // #endif
}
