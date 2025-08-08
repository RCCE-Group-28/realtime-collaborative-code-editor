import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("Client connected", socket.id);

  let room: string | null = null;

  socket.on("join-doc", (docId) => {
    room = docId;
    socket.join(docId);
    console.log(`Socket ${socket.id} joined room ${docId}`);
  });

  socket.on("editor-changes", (data) => {
    if (room) socket.to(room).emit("remote-changes", data);
  });

  socket.on("cursor-update", (cursor) => {
    if (room) socket.to(room).emit("cursor-update", cursor);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () =>
  console.log(`Socket.IO server running on http://localhost:${PORT}`),
);
