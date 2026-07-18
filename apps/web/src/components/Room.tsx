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

  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const isRemoteDescriptionSet = useRef<boolean>(false);

  useEffect(() => {
    // Initialize socket with the user's name
    const socket = io(URL, { query: { name } });
    socketRef.current = socket;

    const resetConnectionState = () => {
      if (pcRef.current) {
        pcRef.current.close();
      }
      pcRef.current = null;
      iceCandidateQueue.current = [];
      isRemoteDescriptionSet.current = false;
    }

    socket.on("send-offer", async ({ roomId }) => {
      resetConnectionState();
      setStatus('connected');
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Add local tracks to send to the peer
      if (localAudioTrack) pc.addTrack(localAudioTrack, new MediaStream([localAudioTrack]));
      if (localVideoTrack) pc.addTrack(localVideoTrack, new MediaStream([localVideoTrack]));

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
      resetConnectionState();
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

      await pc.setRemoteDescription({ sdp: sdp.sdp, type: "offer" });
      isRemoteDescriptionSet.current = true;

      for (const candidate of iceCandidateQueue.current) {
        await pc.addIceCandidate(candidate).catch(console.error);
      }
      iceCandidateQueue.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", {
        sdp: answer.sdp,
        roomId
      });
    });

    socket.on("answer", async ({ sdp }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription({ sdp, type: "answer" }).catch(console.error);
        isRemoteDescriptionSet.current = true;

        for (const candidate of iceCandidateQueue.current) {
          await pcRef.current.addIceCandidate(candidate).catch(console.error);
        }
        iceCandidateQueue.current = [];
      }
    });

    socket.on("lobby", () => {
      resetConnectionState();
      setStatus('lobby');
    });

    socket.on("lobby-disconnected", () => {
      resetConnectionState();
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
      if (pcRef.current && isRemoteDescriptionSet.current) {
        await pcRef.current.addIceCandidate(candidate).catch(console.error);
      } else {
        iceCandidateQueue.current.push(candidate);
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

      <video width={400} height={400} ref={remoteVideoRef} autoPlay muted style={{ transform: "scaleX(-1)" }} />
    </>
  )
}

export default Room