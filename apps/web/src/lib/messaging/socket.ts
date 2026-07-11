import { io, type Socket } from 'socket.io-client';

import { getAccessTokenFromCookie } from '@/lib/auth-cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

function getSocketOrigin(): string {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
}

let socket: Socket | null = null;

export function getMessagingSocket(): Socket | null {
  return socket;
}

export function connectMessagingSocket(): Socket {
  const token = getAccessTokenFromCookie();
  if (!token) {
    throw new Error('Missing access token for messaging socket');
  }
  if (socket?.connected) {
    return socket;
  }
  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }
  socket = io(`${getSocketOrigin()}/messaging`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
  return socket;
}

export function disconnectMessagingSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

export function joinConversationRoom(conversationId: string): void {
  socket?.emit('conversation:join', { conversationId });
}

export function leaveConversationRoom(conversationId: string): void {
  socket?.emit('conversation:leave', { conversationId });
}

export function emitSendMessage(
  conversationId: string,
  body: string,
): Promise<{ ok: boolean; message?: unknown; error?: string }> {
  return new Promise((resolve) => {
    if (!socket) {
      resolve({ ok: false, error: 'Socket not connected' });
      return;
    }
    socket.emit(
      'message:send',
      { conversationId, body },
      (ack: { ok: boolean; message?: unknown; error?: string }) => {
        resolve(ack);
      },
    );
  });
}
