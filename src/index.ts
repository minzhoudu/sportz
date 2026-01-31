import http from "http";

import { matchesRouter } from "#routes/matches.js";
import express from "express";
import { attachWebSocketServer } from "#ws/server.js";
import { securityMiddleware } from "#lib/arcjet.js";

const parsedPort = Number.parseInt(process.env.PORT ?? "", 10);
const PORT = Number.isFinite(parsedPort) ? parsedPort : 3000;
const HOST = process.env.HOST ?? "0.0.0.0";

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use(securityMiddleware());

app.use("/matches", matchesRouter);

const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
  const baseUrl = HOST === "0.0.0.0" ? `http://localhost:${PORT.toString()}` : `http://${HOST}:${PORT.toString()}`;

  console.log(`Example app listening on ${baseUrl}`);
  console.log(`WebSocket server listening on ${baseUrl.replace("http://", "ws://")}/ws`);
});
