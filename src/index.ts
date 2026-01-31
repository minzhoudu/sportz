import http from "http";

import { matchesRouter } from "#routes/matches.js";
import express from "express";
import { attachWebSocketServer } from "#ws/server.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const HOST = process.env.HOST ?? "0.0.0.0";

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/matches", matchesRouter);

const { brodcastMatchCreated } = attachWebSocketServer(server);
app.locals.brodcastMatchCreated = brodcastMatchCreated;

server.listen(PORT, HOST, () => {
  const baseUrl = HOST === "0.0.0.0" ? `http://localhost:${PORT.toString()}` : `http://${HOST}:${PORT.toString()}`;

  console.log(`Example app listening on ${baseUrl}`);
  console.log(`WebSocket server listening on ${baseUrl.replace("http://", "ws://")}/ws`);
});
