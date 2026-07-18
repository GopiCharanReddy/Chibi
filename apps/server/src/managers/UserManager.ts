import type { Socket } from "socket.io";
import { RoomManager } from "./RoomManager.js";

export interface User {
  name: string,
  socket: Socket
}

export interface IceCandidatePayload {
  candidate: string,
  sdpMid: string | null,
  sdpMLineIndex: number | null,
  usernameFragment?: string | null
}


export class UserManager {
  private users: User[];
  private queue: string[];
  private roomManager: RoomManager;
  constructor() {
    this.users = [];
    this.queue = [];
    this.roomManager = new RoomManager();
  }

  addUser(name: string, socket: Socket) {
    this.users.push({
      name,
      socket
    });
    this.queue.push(socket.id);
    this.initHandlers(socket);
    this.clearQueue();
  }

  removeUser(socketId: string) {
    this.users = this.users.filter((user: User) => user.socket.id !== socketId);
    this.queue = this.queue.filter((id: string) => id !== socketId);

    this.roomManager.handleDisconnect(socketId);
  }

  getUser(socketId: string): User | undefined {
    return this.users.find(user => user.socket.id === socketId);
  }

  clearQueue() {
    console.log('inside clear queues');
    console.log(this.queue.length);
    if (this.queue.length < 2) return;
    while (this.queue.length >= 2) {
      const id1 = this.queue.shift();
      const id2 = this.queue.shift();

      if (!id1 || !id2) return;

      const user1 = this.getUser(id1);
      const user2 = this.getUser(id2);

      if (!user1 || !user2) {
        if (user1) this.queue.unshift(id1);
        if (user2) this.queue.unshift(id2);
        continue;
      }
      this.roomManager.createRoom(user1, user2);
    }
  }

  initHandlers(socket: Socket) {
    socket.on("offer", ({ sdp, roomId }: { sdp: string, roomId: string }) => {
      this.roomManager.onOffer(roomId.toString(), sdp, socket.id);
    });

    socket.on("answer", ({ sdp, roomId }: { sdp: string, roomId: string }) => {
      this.roomManager.onAnswer(roomId.toString(), sdp, socket.id);
    });

    socket.on("ice-candidate", ({ candidate, roomId }: { candidate: IceCandidatePayload, roomId: string }) => {
      this.roomManager.onIceCandidate(roomId, candidate, socket.id);
    });

    socket.on("skip", () => {
      this.roomManager.handleDisconnect(socket.id);
      this.queue = this.queue.filter(id => id !== socket.id);
      this.queue.push(socket.id);
      this.clearQueue();
    });
  }
}