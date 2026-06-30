import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const handleClick = () => {
    navigate(`/rooms/?name=${name}`)
  }

  return (
    <>
      <input type="text" onChange={(e) => setName(e.target.value)} />
      <button onClick={handleClick}>Join</button>
    </>
  )
}

export default Landing;