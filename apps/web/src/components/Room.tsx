import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Socket, io } from 'socket.io-client';

const URL = "http://localhost:8000";

const Room = ({
  name,
  localAudioTrack,
  localVideoTrack
}: {
  name: string,
  localAudioTrack: MediaStreamTrack,
  localVideoTrack: MediaStreamTrack
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  // const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [lobby, setLobby] = useState(true);
  const [sendingPc, setSendingPc] = useState<RTCPeerConnection | null>();
  const [receivingPc, setReceivingPc] = useState<RTCPeerConnection | null>();
  const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream | null>();
  // const [remoteVideoTrack, setRemoteVideoTrack] = useState<MediaStreamTrack | null>();
  // const [remoteAudioTrack, setRemoteAudioTrack] = useState<MediaStreamTrack | null>();
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const socket = io(URL);
    socketRef.current = socket;

    socket.on("send-offer", async ({ roomId }) => {
      setLobby(false);
      const pc = new RTCPeerConnection();
      setSendingPc(pc);

      // add local tracks
      if (localAudioTrack) pc.addTrack(localAudioTrack);
      if (localVideoTrack) pc.addTrack(localVideoTrack);

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            candidate: event.candidate,
            roomId
          });
        }
      }
      const sdp = await pc.createOffer();
      await pc.setLocalDescription(sdp);
      socket.emit("offer", {
        sdp,
        roomId
      })
    });

    socket.on("offer", async ({ offerSdp, roomId }) => {
      setLobby(false);
      const pc = new RTCPeerConnection();
      setReceivingPc(pc);
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            candidate: event.candidate,
            roomId
          });
        }
      }
      await pc.setRemoteDescription({ sdp: offerSdp, type: "offer" });

      const sdp = await pc.createAnswer();

      pc.ontrack = ({ track }) => {
        const stream = new MediaStream([track]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch(console.error);
        }
        setRemoteMediaStream(stream);
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", {
        sdp,
        roomId
      });
    });

    socket.on("answer", ({ roomId, answer }) => {
      if (sendingPc) {
        sendingPc.setRemoteDescription({ sdp: answer, type: "answer" }).catch(console.error);
      }
      alert("connection done");
    });

    socket.on("lobby", () => {
      setLobby(true);
    })
  }, [name, localAudioTrack, localVideoTrack, sendingPc]);

  useEffect(() => {
    if (localVideoRef.current && localVideoTrack) {
      const stream = new MediaStream([localVideoTrack]);
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(console.error);
    }
  }, [localAudioTrack, localVideoTrack]);

  if (lobby) {
    return (
      <div>
        Waiting to connect you to someone
      </div>
    )
  }
  return (
    <>
      <div>Hi {name}</div>
      <video width={400} height={400} ref={localVideoRef} autoPlay muted />
      <video width={400} height={400} ref={remoteVideoRef} autoPlay />
    </>
  )
}

export default Room