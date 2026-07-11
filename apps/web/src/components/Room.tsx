import { useEffect, useRef, useState } from "react";
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
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<'lobby' | 'connected' | 'disconnected'>('lobby');
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Initialize socket with the user's name
    const socket = io(URL, { query: { name } });
    socketRef.current = socket;

    socket.on("send-offer", async ({ roomId }) => {
      setStatus('connected');
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Add local tracks to send to the peer
      if (localAudioTrack) pc.addTrack(localAudioTrack);
      if (localVideoTrack) pc.addTrack(localVideoTrack);

      pc.ontrack = ({ track }) => {
        if (remoteVideoRef.current) {
          let stream = remoteVideoRef.current.srcObject as MediaStream | null;
          if (!stream) {
            stream = new MediaStream();
            remoteVideoRef.current.srcObject = stream;
          }
          stream.addTrack(track);
          remoteVideoRef.current.play().catch(console.error);
        }
      };

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
      });
    });

    socket.on("offer", async ({ sdp, roomId }) => {
      setStatus('connected');
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Add local tracks to send to the peer
      if (localAudioTrack) pc.addTrack(localAudioTrack);
      if (localVideoTrack) pc.addTrack(localVideoTrack);

      pc.ontrack = ({ track }) => {
        if (remoteVideoRef.current) {
          let stream = remoteVideoRef.current.srcObject as MediaStream | null;
          if (!stream) {
            stream = new MediaStream();
            remoteVideoRef.current.srcObject = stream;
          }
          stream.addTrack(track);
          remoteVideoRef.current.play().catch(console.error);
        }
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            candidate: event.candidate,
            roomId
          });
        }
      }

      await pc.setRemoteDescription({ sdp, type: "offer" });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", {
        sdp: answer.sdp,
        roomId
      });
    });

    socket.on("answer", ({ sdp }) => {
      if (pcRef.current) {
        pcRef.current.setRemoteDescription({ sdp, type: "answer" }).catch(console.error);
      }
    });

    socket.on("lobby", () => {
      setStatus('lobby');
    });

    socket.on("lobby-disconnected", () => {
      setStatus('disconnected');
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      if (pcRef.current) {
        await pcRef.current.addIceCandidate(candidate).catch(console.error);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (pcRef.current) pcRef.current.close();
    }
  }, [name, localAudioTrack, localVideoTrack]);

  useEffect(() => {
    if (localVideoRef.current && localVideoTrack) {
      const stream = new MediaStream([localVideoTrack]);
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(console.error);
    }
  }, [localAudioTrack, localVideoTrack]);

  const handleNext = () => {
    if (socketRef.current) {
      socketRef.current.emit("skip");
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setStatus('lobby');
  };

  return (
    <>
      <div>Hi {name}</div>
      <video width={400} height={400} ref={localVideoRef} autoPlay muted style={{ transform: "scaleX(-1)" }} />
      
      {status === 'lobby' && <div>Waiting to connect to someone...</div>}
      {status === 'disconnected' && <div>Stranger disconnected. Click Next to find a new person.</div>}
      
      <div style={{ marginTop: 20 }}>
        <button onClick={handleNext}>Next</button>
      </div>
      
      <video width={400} height={400} ref={remoteVideoRef} autoPlay />
    </>
  )
}

export default Room