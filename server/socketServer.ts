import "dotenv/config";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import connectDB from "../app/lib/mongoose";
import Project from "../app/models/project";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

interface ClientSocket extends Socket {
  room?: string;
}

io.on("connection", (socket: ClientSocket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-doc", async (docId: string) => {
    socket.room = docId;
    socket.join(docId);
    console.log(`Socket ${socket.id} joined ${docId}`);
    try {
      await connectDB();
      const project = (await Project.findById(docId).lean()) as {
        chats?: {
          senderEmail: string;
          senderUsername: string;
          message: string;
          timestamp: string;
        }[];
      } | null;
      if (project?.chats) {
        socket.emit(
          "chat-history",
          project.chats.map((c) => ({
            senderEmail: c.senderEmail,
            senderUsername: c.senderUsername,
            message: c.message,
            timestamp: new Date(c.timestamp).getTime(),
          })),
        );
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  });

  socket.on("editor-changes", (payload: { file: string; content: string }) => {
    if (socket.room) socket.to(socket.room).emit("remote-changes", payload);
  });

  socket.on(
    "node-added",
    (payload: {
      type: "file" | "folder";
      parentPath: string;
      name: string;
    }) => {
      if (socket.room) socket.to(socket.room).emit("node-added", payload);
    },
  );

  socket.on("node-deleted", (payload: { path: string }) => {
    if (payload.path === "root") return;
    if (socket.room) socket.to(socket.room).emit("node-deleted", payload);
  });

  socket.on(
    "chat-message",
    async (payload: {
      senderEmail: string;
      senderUsername: string;
      message: string;
    }) => {
      if (!socket.room) return;
      const chatMsg = {
        senderEmail: payload.senderEmail,
        senderUsername: payload.senderUsername,
        message: payload.message,
        timestamp: new Date(),
      };
      try {
        await connectDB();
        await Project.findByIdAndUpdate(socket.room, {
          $push: { chats: chatMsg },
        });
        io.to(socket.room).emit("chat-message", {
          senderEmail: chatMsg.senderEmail,
          senderUsername: chatMsg.senderUsername,
          message: chatMsg.message,
          timestamp: chatMsg.timestamp.getTime(),
        });
      } catch (err) {
        console.error("Failed to store chat:", err);
      }
    },
  );

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.SOCKET_PORT ? Number(process.env.SOCKET_PORT) : 3001;
httpServer.listen(PORT, () =>
  console.log(`Socket.IO server running on http://localhost:${PORT}`),
);
