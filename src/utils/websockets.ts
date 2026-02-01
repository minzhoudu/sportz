import { WebSocket, WebSocketServer } from "ws";
import z from "zod";

const matchSubscribers = new Map<string, Set<WebSocket>>();

export const sendJson = (socket: WebSocket, payload: unknown) => {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
};

export const broadcastToAll = (wss: WebSocketServer, payload: unknown) => {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    sendJson(client, payload);
  }
};

export const broadcastToMatch = (matchId: string, payload: unknown) => {
  const subscribers = matchSubscribers.get(matchId);

  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);

  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
};

export const subscribeToMatch = (matchId: string, socket: WebSocket) => {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }

  const matchSub = matchSubscribers.get(matchId);
  if (!matchSub) return;

  matchSub.add(socket);
};

export const unsubscribeFromMatch = (matchId: string, socket: WebSocket) => {
  if (!matchSubscribers.has(matchId)) return;

  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) return;

  subscribers.delete(socket);

  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
};

export const cleanupSubscriptions = (socket: WebSocket) => {
  for (const matchId of socket.subscriptions) {
    unsubscribeFromMatch(matchId, socket);
  }
};

const messageSchema = z.object({
  type: z.enum(["subscribe", "unsubscribe"]),
  matchId: z.string(),
});

export const handleMessage = (socket: WebSocket, data: unknown) => {
  let message: z.infer<typeof messageSchema>;

  try {
    message = messageSchema.parse(JSON.parse(String(data)));
  } catch (error) {
    console.error("Invalid message", error);
    sendJson(socket, { type: "error", message: "Invalid message" });
    return;
  }

  if (message.type === "subscribe") {
    subscribeToMatch(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, { type: "subscribed", matchId: message.matchId });
  }

  if (message.type === "unsubscribe") {
    unsubscribeFromMatch(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, { type: "unsubscribed", matchId: message.matchId });
  }
};
