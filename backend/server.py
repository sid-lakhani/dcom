from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Tuple, Any
import json
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development - restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active peer connections for WebRTC (room_id -> [peer1, peer2])
webrtc_rooms: Dict[str, List[WebSocket]] = {}

# Store client information for WebSocket chat
# Format: (username, websocket, client_info)
active_connections: List[Tuple[str, WebSocket, Dict[str, Any]]] = []

@app.websocket("/signal/{room_id}")
async def signaling(websocket: WebSocket, room_id: str):
    """WebRTC signaling endpoint for browser-to-browser P2P connections"""
    await websocket.accept()
    
    # Add the websocket to the room
    if room_id not in webrtc_rooms:
        logger.info(f"Creating new WebRTC room: {room_id}")
        webrtc_rooms[room_id] = []
    
    webrtc_rooms[room_id].append(websocket)
    logger.info(f"Client joined WebRTC room {room_id}. Total clients: {len(webrtc_rooms[room_id])}")
    
    try:
        while True:
            # Wait for messages from this client
            message = await websocket.receive_text()
            
            try:
                # Parse message to log the signal type
                data = json.loads(message)
                logger.info(f"Received signal type: {data.get('type')} in room {room_id}")
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON message received: {message}")
            
            # Relay the message to the other peer in the room
            for peer in webrtc_rooms[room_id]:
                if peer != websocket:
                    logger.info(f"Relaying message to peer in room {room_id}")
                    await peer.send_text(message)
    
    except WebSocketDisconnect:
        logger.info(f"Client disconnected from WebRTC room {room_id}")
        # Remove this websocket from the room
        if room_id in webrtc_rooms and websocket in webrtc_rooms[room_id]:
            webrtc_rooms[room_id].remove(websocket)
            
            # Delete room if empty
            if not webrtc_rooms[room_id]:
                logger.info(f"WebRTC room {room_id} is now empty, removing")
                del webrtc_rooms[room_id]
            else:
                logger.info(f"Clients remaining in WebRTC room {room_id}: {len(webrtc_rooms[room_id])}")
    
    except Exception as e:
        logger.error(f"Error in WebRTC websocket connection: {str(e)}")
        # Ensure cleanup even on other exceptions
        if room_id in webrtc_rooms and websocket in webrtc_rooms[room_id]:
            webrtc_rooms[room_id].remove(websocket)
            if not webrtc_rooms[room_id]:
                del webrtc_rooms[room_id]

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Traditional WebSocket endpoint for direct chat"""
    global active_connections
    await websocket.accept()
    logger.info("New WebSocket connection established")
    
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
    
    logger.info(f"Client type detected: {client_info['type']}")
    
    # Ask for username
    await websocket.send_text("Enter your username:")
    username = await websocket.receive_text()
    logger.info(f"User '{username}' connected via WebSocket")
    
    # Store the connection with client info
    active_connections.append((username, websocket, client_info))
    
    # Notify others that the user joined
    await broadcast({"user": "system", "text": f"🔹 {username} joined the chat."}, exclude=username)
    
    try:
        while True:
            text = await websocket.receive_text()
            logger.info(f"Message from {username}: {text}")
            # Broadcast the message to others
            await broadcast({"user": username, "text": text}, exclude=username)
    except WebSocketDisconnect:
        logger.info(f"User '{username}' disconnected")
        # Remove user on disconnection
        active_connections = [(u, ws, ci) for u, ws, ci in active_connections if u != username]
        await broadcast({"user": "system", "text": f"🔻 {username} left the chat."})
    except Exception as e:
        logger.error(f"Error in WebSocket connection: {str(e)}")
        # Handle any other exceptions
        active_connections = [(u, ws, ci) for u, ws, ci in active_connections if u != username]
        await broadcast({"user": "system", "text": f"🔻 {username} left the chat."})

async def broadcast(message_data: dict, exclude: str = None):
    """
    Send message to all users except the excluded one.
    - For browser clients: Send as JSON
    - For terminal clients: Send as plain text
    """
    global active_connections
    
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
            logger.error(f"Error sending to {username}: {e}")

@app.get("/")
async def root():
    return {"message": "DCOM - Decentralized Communication Server", "status": "running"}

@app.get("/stats")
async def get_stats():
    return {
        "webrtc_rooms": len(webrtc_rooms),
        "active_rooms": list(webrtc_rooms.keys()),
        "websocket_users": len(active_connections),
        "websocket_users_list": [username for username, _, _ in active_connections]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)