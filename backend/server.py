from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List, Tuple
import json

app = FastAPI()

# Store (username, websocket) pairs
active_connections: List[Tuple[str, WebSocket]] = []

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Ask for username
    await websocket.send_text("Enter your username:")
    username = await websocket.receive_text()
    
    # Store the connection
    active_connections.append((username, websocket))
    
    # Notify others that the user joined
    await broadcast({"user": "system", "text": f"🔹 {username} joined the chat."}, exclude=username)
    
    try:
        while True:
            text = await websocket.receive_text()
            # Broadcast the message to others
            await broadcast({"user": username, "text": text}, exclude=username)
    except WebSocketDisconnect:
        # Remove user on disconnection
        active_connections.remove((username, websocket))
        await broadcast({"user": "system", "text": f"🔻 {username} left the chat."})
    except Exception as e:
        # Handle any other exceptions
        print(f"Error: {e}")
        if (username, websocket) in active_connections:
            active_connections.remove((username, websocket))
            await broadcast({"user": "system", "text": f"🔻 {username} left the chat."})

async def broadcast(message_data: dict, exclude: str = None):
    """
    Send message to all users except the excluded one.
    - For browser clients: Send as JSON
    - For terminal clients: Send as plain text
    """
    for user, conn in active_connections:
        if user == exclude:  # Don't send the message back to the sender
            continue
        
        try:
            if user.lower() in ["terminal", "cli", "console", "shell"]:
                # For terminal users, send plain text
                if message_data["user"] == "system":
                    await conn.send_text(message_data["text"])
                else:
                    await conn.send_text(f"{message_data['user']}: {message_data['text']}")
            else:
                # For browser clients, send as JSON
                await conn.send_json(message_data)
        except Exception as e:
            print(f"Error sending to {user}: {e}")