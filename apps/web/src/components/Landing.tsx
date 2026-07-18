import { useEffect, useRef, useState } from "react";
import Room from "./Room";

const Landing = () => {
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | undefined>();
  const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | undefined>();

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {

    let currentAudioTrack: MediaStreamTrack | null = null;
    let currentVideoTrack: MediaStreamTrack | null = null;

    const getCam = async () => {
      try {
        const stream = await window.navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        currentAudioTrack = stream.getAudioTracks()[0];
        currentVideoTrack = stream.getVideoTracks()[0];
        setLocalAudioTrack(currentAudioTrack);
        setLocalVideoTrack(currentVideoTrack);
        if (videoRef.current) {
          const stream2 = new MediaStream();
          stream2.addTrack(currentVideoTrack);
          videoRef.current.srcObject = new MediaStream([currentVideoTrack]);
          videoRef.current.play();
        }
      } catch (error) {
        console.error("Error ascending media devices: ", error);
      }
    }
    getCam();

    return () => {
      currentAudioTrack?.stop();
      currentVideoTrack?.stop();
    }
  }, [setLocalAudioTrack, setLocalVideoTrack]);
  const handleClick = () => {
    if (!name.trim()) {
      alert("Please enter a name first: ");
      return;
    }
    setJoined(true);
  }

  if (!joined) {
    return (
      <>
        <video autoPlay ref={videoRef} width={400} height={400} style={{ transform: 'scaleX(-1)' }}></video>
        <input type="text" onChange={(e) => setName(e.target.value)} />
        <button onClick={handleClick}>Join</button>
      </>
    )
  }
  if (localAudioTrack && localVideoTrack) {
    return (
      <>
        <Room name={name} localAudioTrack={localAudioTrack} localVideoTrack={localVideoTrack} />
      </>
    )
  }
}

export default Landing;