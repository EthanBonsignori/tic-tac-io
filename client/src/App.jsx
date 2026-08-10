import { useEffect, useState } from "react";
import { socket } from "./socket";
import "./App.css";

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function handleConnect() {
      setIsConnected(true);
    }

    function handleDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  return (
    <div className="app">
      <h1>Tic-Tac-IO</h1>
      <p>Server status: {isConnected ? "Connected" : "Disconnected"}</p>
    </div>
  );
}

export default App;
