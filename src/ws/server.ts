import { Match } from "#db/schema/matches.js";
import { brodcast, sendJson } from "#utils/websockets.js";
import { Server } from "http";
import { WebSocketServer } from "ws";

export const attachWebSocketServer = (server: Server) => {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024, //? 1MB
  });

  wss.on("connection", (socket) => {
    sendJson(socket, { type: "welcome", message: "Welcome to the websocket server" });

    socket.on("error", console.error);
  });

  function brodcastMatchCreated(match: Match) {
    brodcast(wss, { type: "match_created", data: match });
  }

  return { brodcastMatchCreated };
};
