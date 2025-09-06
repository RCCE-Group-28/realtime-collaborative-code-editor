import "dotenv/config";
import http from "http";
import { WebSocketServer } from "ws";
// @ts-expect-error import from built utils, not top-level
import { setupWSConnection } from "y-websocket/bin/utils";

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", (conn, req) => {
  setupWSConnection(conn, req, { gc: true });
});

const PORT = process.env.YJS_PORT ? Number(process.env.YJS_PORT) : 1234;
server.listen(PORT, () => {
  console.log(`Yjs WebSocket server running at ws://localhost:${PORT}`);
});
