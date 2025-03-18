# **DCOM - Decentralized Communication**  

A seamless real-time chat application built with **FastAPI (backend) and Next.js (frontend).**  
This application supports **both browser-based and terminal clients**, providing a versatile and extensible communication platform.  

![DCOM - Decentralized Communication](./frontend/public/logo.png)  

## **Features**  

- ⚡ **Real-time messaging** using WebSockets & WebRTC  
- 💻 **Support for both browser and terminal clients**  
- 🔔 **User join/leave notifications**  
- 🎨 **Clean, responsive UI for web clients**  
- 📱 **Mobile-friendly design**  
- 🔒 **Future: Decentralized terminal chat via P2P**  

## **Tech Stack**  

### **Backend**  
- **FastAPI** - High-performance web framework for APIs  
- **WebSockets** - For real-time communication  
- **Python 3.8+** - For server-side logic  

### **Frontend**  
- **Next.js** - React framework with server-side rendering  
- **TypeScript** - For type safety and better DX  
- **Tailwind CSS** - For responsive styling  

## **Decentralized Communication Approach**  

DCOM currently supports **two modes of communication**:  

1. **Decentralized P2P (WebRTC)**
   - Direct **peer-to-peer (P2P) messaging** without a server in between.  
   - Messages are exchanged securely without central storage.  

2. **Centralized (WebSockets)**
   - Messages are routed via the backend WebSocket server.  
   - Useful for ensuring real-time communication with a central control point.  

🚀 **Upcoming Feature:**  
📡 **Decentralized P2P Terminal Communication** – Soon, terminal clients will be able to communicate **fully peer-to-peer without any central server**.  

---

## **Getting Started**  

### **Prerequisites**  
- Python **3.8+**  
- Node.js **14+**  
- npm or yarn  

### **Installation**  

#### **Backend Setup**  

```bash
# Navigate to backend directory
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn websockets

# Start the server
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

#### **Frontend Setup**  

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

### **Accessing the Application**  

- **Web client:** Open your browser and navigate to `http://localhost:3000`  
- **Terminal client (WebSockets - Centralized)**  
  ```bash
  npm install -g wscat
  wscat -c ws://127.0.0.1:8000/ws
  ```

---

## **Usage**  

### **Browser Client**  
Browser clients can connect using **either WebRTC (P2P) or WebSockets (centralized):**  

#### **1. WebRTC Mode (P2P - Decentralized)**  
- Clients communicate **directly** without a central server.  
- Uses **`/signal/{room_id}`** for signaling.  
- Users can **create** a new room or **join an existing** one.  
- **Rooms self-destruct** when all members leave.  

#### **2. WebSockets Mode (Centralized)**  
- Messages are routed through the **WebSocket server.**  
- More reliable for persistent communication.  

### **Terminal Client**  
#### **1. WebSockets Mode (Centralized)**  
```bash
wscat -c ws://127.0.0.1:8000/ws
```
- Enter your username when prompted.  
- Start chatting by typing messages and pressing Enter.  
- Notifications show when users join or leave.  

#### **2. (Upcoming) P2P Terminal Chat (Decentralized)**  
- Terminal clients will be able to **connect directly via WebRTC P2P**.  
- Eliminates the need for a WebSocket server.  

---

## **Project Structure**  

```
.
├── .gitignore
├── LICENSE                     # Project license
├── README.md
├── backend
│   └── server.py               # FastAPI WebSocket server(upcoming)
└── frontend
    ├── README.md
    ├── next-env.d.ts
    ├── next.config.ts
    ├── package-lock.json
    ├── package.json
    ├── postcss.config.mjs
    ├── public
    │   ├── favicon.ico
    │   └── logo.png
    ├── src
    │   └── app
    │       ├── globals.css
    │       ├── layout.tsx
    │       ├── page.tsx        # Main chat page component
    └── tsconfig.json
```

---

## **Future Scope**  

As DCOM evolves, several **enhancements** can be introduced:  

### **Security Enhancements**  
- **End-to-End Encryption (E2EE)**: AES or RSA-based secure message exchange  
- **Self-Destructing Messages**: Messages that auto-delete after a set time  

### **Feature Enhancements**  
- **Fully Decentralized P2P Terminal Chat**  
- **Private Chat Rooms with Invite Codes**  
- **File Sharing** (P2P and WebSocket-based)  
- **Voice & Video Chat** (via WebRTC)  

---

## **Contributing**  

Contributions are welcome! Whether it’s **fixing bugs, optimizing performance, or adding new features**, every contribution improves DCOM.  

1. Check the **Future Scope**  
2. Fork the repository  
3. Create your feature branch (`git checkout -b feature-name`)  
4. Commit your changes (`git commit -m 'Added some amazing feature'`)  
5. Push to the branch (`git push origin feature-name`)  
6. Open a **Pull Request**  

---

## **License**  

This project is licensed under the **MIT License** – see the `LICENSE` file for details.  