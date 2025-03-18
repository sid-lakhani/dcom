"use client";
import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [connectionMode, setConnectionMode] = useState<"webrtc" | "websocket">("webrtc");
  const [isConnected, setIsConnected] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [messages, setMessages] = useState<{ user: string; text: string }[]>([]);
  const [message, setMessage] = useState("");

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const ws = useRef<WebSocket | null>(null);

  const STUN_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  useEffect(() => {
    // Clean up connections when component unmounts
    return () => {
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  // WebRTC setup functions
  const setupPeerConnection = () => {
    peerConnection.current = new RTCPeerConnection(STUN_SERVERS);

    // Handle ICE Candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ 
          type: "ice-candidate", 
          candidate: event.candidate 
        }));
      }
    };

    // Handle when the other peer adds a data channel
    peerConnection.current.ondatachannel = (event) => {
      console.log("Received data channel");
      dataChannel.current = event.channel;
      setupDataChannel();
    };
  };

  const setupDataChannel = () => {
    if (!dataChannel.current) return;

    dataChannel.current.onopen = () => {
      console.log("Data channel opened");
      setIsConnected(true);
      setMessages(prev => [...prev, { user: "system", text: "Connected to peer!" }]);
    };

    dataChannel.current.onclose = () => {
      console.log("Data channel closed");
      setIsConnected(false);
      setMessages(prev => [...prev, { user: "system", text: "Disconnected from peer" }]);
    };

    dataChannel.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setMessages(prev => [...prev, msg]);
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };
  };

  const createOffer = async () => {
    try {
      console.log("Creating offer as initiator");
      setMessages(prev => [...prev, { user: "system", text: "Creating room..." }]);
      
      // Create data channel (only the initiator creates the channel)
      dataChannel.current = peerConnection.current!.createDataChannel("chat");
      setupDataChannel();
      
      // Create and send offer
      const offer = await peerConnection.current!.createOffer();
      await peerConnection.current!.setLocalDescription(offer);
      
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: "offer", offer }));
      }
    } catch (error) {
      console.error("Error creating offer:", error);
      setMessages(prev => [...prev, { user: "system", text: "Failed to create room" }]);
      setIsJoining(false);
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    try {
      console.log("Received offer, creating answer");
      setMessages(prev => [...prev, { user: "system", text: "Joining room..." }]);
      
      await peerConnection.current!.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current!.createAnswer();
      await peerConnection.current!.setLocalDescription(answer);
      
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: "answer", answer }));
      }
    } catch (error) {
      console.error("Error handling offer:", error);
      setMessages(prev => [...prev, { user: "system", text: "Failed to join room" }]);
      setIsJoining(false);
    }
  };

  // WebRTC Connection Setup
  const startWebRTCConnection = () => {
    if (!roomId.trim()) return alert("Enter a Room ID");
    if (!username.trim()) return alert("Enter a Username");
    
    setIsJoining(true);
    setMessages([{ user: "system", text: "Connecting via WebRTC..." }]);
    
    // Connect to WebSocket signaling server
    ws.current = new WebSocket(`ws://localhost:8000/signal/${roomId}`);
    
    ws.current.onopen = () => {
      console.log("WebSocket signaling connected");
      setupPeerConnection();
      
      // Check if we're the first one in the room (create offer)
      // or if we're joining an existing room (wait for offer)
      setTimeout(() => {
        if (!isConnected && peerConnection.current) {
          createOffer();
        }
      }, 1000);
    };
    
    ws.current.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log("Received Signal:", data);

      if (data.type === "offer") {
        await handleOffer(data.offer);
      } else if (data.type === "answer") {
        await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
      } else if (data.type === "ice-candidate" && peerConnection.current) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("Error adding ICE candidate:", e);
        }
      }
    };
    
    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setMessages(prev => [...prev, { user: "system", text: "Connection error" }]);
      setIsJoining(false);
    };
    
    ws.current.onclose = () => {
      console.log("WebSocket closed");
      if (!isConnected) {
        setMessages(prev => [...prev, { user: "system", text: "Connection failed" }]);
        setIsJoining(false);
      }
    };
  };

  // WebSocket Connection Setup
  const startWebSocketConnection = () => {
    if (!username.trim()) return alert("Enter a Username");
    
    setIsJoining(true);
    setMessages([{ user: "system", text: "Connecting via WebSocket..." }]);
    
    // Connect to WebSocket chat server
    ws.current = new WebSocket(`ws://localhost:8000/ws`);
    
    ws.current.onopen = () => {
      console.log("WebSocket chat connected");
    };
    
    ws.current.onmessage = (event) => {
      const data = event.data;
      console.log("Received message:", data);
      
      try {
        // If it's a JSON message
        if (data.startsWith("{") && data.endsWith("}")) {
          const parsedData = JSON.parse(data);
          setMessages(prev => [...prev, parsedData]);
        } else {
          // If it's plain text
          if (data === "Enter your username:") {
            ws.current?.send(username);
            setIsConnected(true);
            setIsJoining(false);
          } else {
            // Handle other plain text messages
            if (data.includes(":")) {
              const [user, ...textParts] = data.split(":");
              const text = textParts.join(":");
              setMessages(prev => [...prev, { user: user.trim(), text: text.trim() }]);
            } else {
              setMessages(prev => [...prev, { user: "system", text: data }]);
            }
          }
        }
      } catch (error) {
        console.error("Error handling message:", error);
        setMessages(prev => [...prev, { user: "system", text: data }]);
      }
    };
    
    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setMessages(prev => [...prev, { user: "system", text: "Connection error" }]);
      setIsJoining(false);
    };
    
    ws.current.onclose = () => {
      console.log("WebSocket closed");
      setIsConnected(false);
      setMessages(prev => [...prev, { user: "system", text: "Disconnected from server" }]);
    };
  };

  const startConnection = () => {
    if (connectionMode === "webrtc") {
      startWebRTCConnection();
    } else {
      startWebSocketConnection();
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    
    const msg = { user: username, text: message };
    
    if (connectionMode === "webrtc" && dataChannel.current?.readyState === "open") {
      // Send via WebRTC
      try {
        dataChannel.current.send(JSON.stringify(msg));
        setMessages(prev => [...prev, msg]);
      } catch (error) {
        console.error("Error sending WebRTC message:", error);
        setMessages(prev => [...prev, { user: "system", text: "Failed to send message" }]);
      }
    } else if (connectionMode === "websocket" && ws.current?.readyState === WebSocket.OPEN) {
      // Send via WebSocket
      try {
        ws.current.send(message);
        setMessages(prev => [...prev, msg]);
      } catch (error) {
        console.error("Error sending WebSocket message:", error);
        setMessages(prev => [...prev, { user: "system", text: "Failed to send message" }]);
      }
    }
    
    setMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gray-900 min-h-screen text-white">
      <h1 className="text-xl font-bold mb-4">DCOM - Decentralized Communication</h1>

      {!isConnected && !isJoining ? (
        <div className="flex flex-col space-y-4 w-full max-w-md">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border border-gray-600 bg-gray-800 text-white p-2 rounded-md"
            placeholder="Your Username..."
            disabled={isJoining}
          />
          
          <div className="flex space-x-2 items-center">
            <label className="text-sm">Connection Mode:</label>
            <select 
              value={connectionMode}
              onChange={(e) => setConnectionMode(e.target.value as "webrtc" | "websocket")}
              className="border border-gray-600 bg-gray-800 text-white p-2 rounded-md"
            >
              <option value="webrtc">WebRTC (P2P)</option>
              <option value="websocket">WebSocket</option>
            </select>
          </div>
          
          {connectionMode === "webrtc" && (
            <input
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="border border-gray-600 bg-gray-800 text-white p-2 rounded-md"
              placeholder="Enter Room ID..."
              disabled={isJoining}
            />
          )}
          
          <button
            onClick={startConnection}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md disabled:bg-gray-500"
            disabled={isJoining || !username.trim() || (connectionMode === "webrtc" && !roomId.trim())}
          >
            {isJoining ? "Connecting..." : connectionMode === "webrtc" ? "Join Room" : "Join Chat"}
          </button>
        </div>
      ) : (
        <div className="mb-2 text-center">
          {connectionMode === "webrtc" && (
            <span className="bg-blue-600 rounded-md px-2 py-1 text-sm mr-2">Room: {roomId}</span>
          )}
          <span className="bg-green-600 rounded-md px-2 py-1 text-sm">User: {username}</span>
          <span className="bg-purple-600 rounded-md px-2 py-1 text-sm ml-2">Mode: {connectionMode === "webrtc" ? "P2P" : "WebSocket"}</span>
        </div>
      )}

      <div className="border border-gray-700 p-4 mt-4 w-full max-w-2xl bg-gray-800 rounded-md h-96 overflow-y-auto flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 italic">
            No messages yet
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`mb-1 ${
                  msg.user === username 
                    ? "text-right" 
                    : msg.user === "system" 
                      ? "text-center text-yellow-400 italic" 
                      : "text-left"
                }`}
              >
                {msg.user !== "system" && (
                  <span className={`font-bold ${msg.user === username ? "text-green-400" : "text-blue-400"}`}>
                    {msg.user}:{" "}
                  </span>
                )}
                <span className={msg.user === username ? "bg-green-900 px-2 py-1 rounded-md inline-block" : ""}>
                  {msg.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isConnected && (
        <div className="flex space-x-2 w-full max-w-2xl mt-4">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border border-gray-600 bg-gray-800 text-white p-2 flex-1 rounded-md"
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            disabled={!message.trim()}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}