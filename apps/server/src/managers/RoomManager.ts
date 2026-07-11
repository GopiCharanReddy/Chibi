import { Socket } from "socket.io";
import type { IceCandidatePayload, User } from "./UserManager.js";

let GLOBAL_ROOM_ID = 1;

interface Room {
  user1: User,
  user2: User
}

export class RoomManager {

  private rooms: Map<string, Room>;
  constructor() {
    this.rooms = new Map<string, Room>();
  }

  createRoom(user1: User, user2: User) {
    const roomId = this.generate();
    this.rooms.set(roomId.toString(), {
      user1,
      user2
    });

    console.log("created room", roomId);
    user1.socket.emit("send-offer", {
      roomId
    });
  }

  onOffer(roomId: string, sdp: string, senderSocketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const targetUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
    console.log("Got offer");
    targetUser?.socket.emit("offer", {
      sdp,
      roomId
    });
  }

  onAnswer(roomId: string, sdp: string, senderSocketId: string) {
    const room = this.rooms.get(roomId);

    if (!room) return;

    const targetUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
    console.log("Got answer");
    targetUser?.socket.emit("answer", {
      sdp,
      roomId
    })
  }

  generate() {
    return GLOBAL_ROOM_ID++;
  }

  handleDisconnect(socketId: string) {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.user1.socket.id === socketId || room.user2.socket.id === socketId) {
        const partner = room.user1.socket.id === socketId ? room.user2 : room.user1;
        console.log("Lobby disconnected");
        partner.socket.emit("lobby-disconnected");

        this.rooms.delete(roomId);
        break;
      }
    }
  }

  onIceCandidate(roomId: string, candidate: IceCandidatePayload, socketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const isUser1 = room.user1.socket.id === socketId;
    const targetUser = isUser1 ? room.user2 : room.user1;
    const senderType = isUser1 ? "sender" : "receiver";
    console.log("candidate iced");
    // forward the ICE candidate directly to peer
    targetUser.socket.emit("ice-candidate", {
      candidate,
      roomId,
      type: senderType
    });
  }
}