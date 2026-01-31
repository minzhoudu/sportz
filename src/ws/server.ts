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

  wss.on("connection", (socket, request) => {
    const ws = socket as ExtendedWebSocket;
    ws.isAlive = true;

    void (async () => {
      try {
        const decision = await wsArcjet.protect(request);

        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit() ? 1013 : 1008;
          const reason = decision.reason.isRateLimit() ? "Rate Limit Exceeded" : "Forbidden";
          socket.close(code, reason);
          return;
        }
      } catch (error) {
        console.error("WS Arcjet connection error", error);
        socket.close(1011, "Server security error");
        return;
      }

      ws.on("pong", () => {
        ws.isAlive = true;
      });

      sendJson(socket, { type: "welcome", message: "Welcome to the websocket server" });

      socket.on("error", console.error);
    })();
  });

  function broadcastMatchCreated(match: Match) {
    broadcast(wss, { type: "match_created", data: match });
  }

  return { broadcastMatchCreated };
};
