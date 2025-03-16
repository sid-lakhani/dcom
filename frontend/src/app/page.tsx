"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<{ user: string; text: string }[]>([]);
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/ws");
    
    socket.onopen = () => {
      console.log("WebSocket connection established");
    };
    
    socket.onmessage = (event) => {
      const data = event.data;
      console.log("Raw message received:", data);
      
      try {
        // Try parsing as JSON
        const parsedData = JSON.parse(data);
        setMessages((prev) => [...prev, parsedData]);
      } catch (error) {
        // If it's not JSON, it's probably the initial username prompt
        if (data === "Enter your username:") {
          console.log("Username prompt received");
        } else {
          console.error("Failed to parse message:", error);
        }
      }
    };
    
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };
    
    setWs(socket);
    
    return () => {
      socket.close();
    };
  }, []);

  const sendUsername = () => {
    if (ws && username.trim()) {
      ws.send(username);
      setIsConnected(true);
      
      // Add a local message to show the user joined
      setMessages((prev) => [
        ...prev,
        { user: "system", text: `You joined as ${username}` }
      ]);
    }
  };

  const sendMessage = () => {
    if (ws && message.trim()) {
      ws.send(message);
      
      // Add the message to the local state immediately
      setMessages((prev) => [
        ...prev, 
        { user: username, text: message }
      ]);
      
      setMessage(""); // Clear input after sending
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!isConnected) {
        sendUsername();
      } else {
        sendMessage();
      }
    }
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gray-900 h-screen text-white">
      <h1 className="text-lg font-bold mb-4">Chat Room</h1>
      {!isConnected ? (
        <div className="flex space-x-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            className="border border-gray-600 bg-gray-800 text-white p-2 w-80 rounded-md"
            placeholder="Enter your username..."
            autoFocus
          />
          <button
            onClick={sendUsername}
            className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-md"
          >
            Join
          </button>
        </div>
      ) : (
        <>
          <div className="border border-gray-700 p-4 m-4 w-1/2 bg-black rounded-md h-96 overflow-y-auto">
            {messages.map((msg, i) => (
              <p
                key={i}
                className={`mb-1 ${
                  msg.user === username ? "text-right text-green-400" : 
                  msg.user === "system" ? "text-center text-yellow-400 italic" : "text-left"
                }`}
              >
                {msg.user === "system" ? (
                  msg.text
                ) : (
                  <>
                    <span className="font-bold text-blue-400">{msg.user}: </span>
                    {msg.text}
                  </>
                )}
              </p>
            ))}
          </div>
          <div className="flex space-x-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="border border-gray-600 bg-gray-800 text-white p-2 w-80 rounded-md"
              placeholder="Type a message..."
              autoFocus
            />
            <button
              onClick={sendMessage}
              className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md"
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}