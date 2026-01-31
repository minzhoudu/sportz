import { Match } from "#db/schema/matches.js";
import { wsArcjet } from "#lib/arcjet.js";
import { broadcast, sendJson } from "#utils/websockets.js";
import { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}

const HEARTBEAT_INTERVAL = 30000; //? 30 seconds

export const attachWebSocketServer = (server: Server) => {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024, //? 1MB
  });

  server.on("upgrade", (request, socket) => {
    if (!request.url || !request.headers.host) return;

    const { pathname } = new URL(request.url, `http://${request.headers.host}`);
    if (pathname !== "/ws") return;

    void (async () => {
      try {
        const decision = await wsArcjet.protect(request);

        if (decision.isDenied()) {
          if (decision.reason.isRateLimit()) {
            socket.write(`HTTP/1.1 429 Too Many Requests\r\n\r\n`);
          } else {
            socket.write(`HTTP/1.1 403 Forbidden\r\n\r\n`);
          }

          socket.destroy();
          return;
        }
      } catch (error) {
        console.error("WS Arcjet upgrade error", error);
        socket.write(`HTTP/1.1 500 Internal Server Error\r\n\r\n`);
        socket.destroy();
        return;
      }
    })();
  });

  const heartbeatInterval = setInterval(() => {
    for (const client of wss.clients) {
      const ws = client as ExtendedWebSocket;

      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }

      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  wss.on("connection", (socket) => {
    const ws = socket as ExtendedWebSocket;
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    sendJson(socket, { type: "welcome", message: "Welcome to the websocket server" });

    socket.on("error", console.error);
  });

  function broadcastMatchCreated(match: Match) {
    broadcast(wss, { type: "match_created", data: match });
  }

  return { broadcastMatchCreated };
};
