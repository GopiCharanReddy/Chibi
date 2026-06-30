import express from "express";
import { createServer } from "node:http";
import { Server, Socket } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

io.on("connection", (socket: Socket) => {
  console.log("User connected with ID: ", socket.id);

  socket.on("chat-message", (data: string) => {
    console.log("Message received: ", data);

    io.emit("chat-message", data);
  });
})

io.on("disconnect", (reason) => {
  console.log("User disconnected, Reason: ", reason);
});

server.listen(8000, () => {
  console.log("Server is listening on port: 8000")
})