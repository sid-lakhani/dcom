from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List, Tuple, Dict, Any
import json

app = FastAPI()

# Store client information with additional metadata
# Format: (username, websocket, client_info)
active_connections: List[Tuple[str, WebSocket, Dict[str, Any]]] = []

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global active_connections  # Add this line to access the global variable
    
    await websocket.accept()
    print("connection open")
    
    # Detect client type from headers
    headers = dict(websocket.headers)
    user_agent = headers.get("user-agent", "").lower()
    
    # Determine if this is likely a browser or terminal client
    is_browser = any(browser in user_agent for browser in [
        "mozilla", "chrome", "safari", "firefox", "edge", "webkit", "opera"
    ])
    
    client_info = {
        "type": "browser" if is_browser else "terminal",
        "user_agent": user_agent
    }
    
    # Ask for username
    await websocket.send_text("Enter your username:")
    username = await websocket.receive_text()
    
    # Store the connection with client info
    active_connections.append((username, websocket, client_info))
    
    # Notify others that the user joined
    await broadcast({"user": "system", "text": f"🔹 {username} joined the chat."}, exclude=username)
    
    try:
        while True:
            text = await websocket.receive_text()
            # Broadcast the message to others
            await broadcast({"user": username, "text": text}, exclude=username)
    except WebSocketDisconnect:
        # Remove user on disconnection
        active_connections = [(u, ws, ci) for u, ws, ci in active_connections if u != username]
        await broadcast({"user": "system", "text": f"🔻 {username} left the chat."})
    except Exception as e:
        # Handle any other exceptions
        print(f"Error: {e}")
        active_connections = [(u, ws, ci) for u, ws, ci in active_connections if u != username]
        await broadcast({"user": "system", "text": f"🔻 {username} left the chat."})

async def broadcast(message_data: dict, exclude: str = None):
    """
    Send message to all users except the excluded one.
    - For browser clients: Send as JSON
    - For terminal clients: Send as plain text
    """
    global active_connections  # Add this line to access the global variable
    
    for username, conn, client_info in active_connections:
        if username == exclude:  # Don't send the message back to the sender
            continue
        
        try:
            if client_info["type"] == "terminal":
                # For terminal users, send plain text
                if message_data["user"] == "system":
                    await conn.send_text(message_data["text"])
                else:
                    await conn.send_text(f"{message_data['user']}: {message_data['text']}")
            else:
                # For browser clients, send as JSON
                await conn.send_json(message_data)
        except Exception as e:
            print(f"Error sending to {username}: {e}")