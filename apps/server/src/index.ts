import express from "express";
import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import { UserManager } from "./managers/UserManager.js";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

const userManager = new UserManager();
io.on("connection", (socket: Socket) => {
  console.log("User connected with ID: ", socket.id);
  const name = socket.handshake.query.name as string || "Anonymous";

  userManager.addUser(name, socket);
  
  socket.on("disconnect", (reason) => {
    console.log("User disconnected, Reason: ", reason);

    userManager.removeUser(socket.id);
  });

});

server.listen(8000, () => {
  console.log("Server is listening on port: 8000")
})