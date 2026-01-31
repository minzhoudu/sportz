import { WebSocket, WebSocketServer } from "ws";

export const sendJson = (socket: WebSocket, payload: unknown) => {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
};

export const broadcast = (wss: WebSocketServer, payload: unknown) => {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    sendJson(client, payload);
  }
};
