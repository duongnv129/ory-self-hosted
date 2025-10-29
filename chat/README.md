# WebRTC Chat Demo

A simple peer-to-peer chat application using WebRTC data channels for real-time communication.

## Features

- **Real-time P2P messaging**: Direct communication between peers using WebRTC data channels
- **Web-based interface**: Simple HTML interface accessible via browser
- **Command-line client**: Terminal-based client for testing
- **Signaling server**: WebSocket-based signaling for WebRTC handshake
- **Auto-connection**: Automatic peer discovery and connection establishment

## Architecture

```
┌─────────────┐    WebSocket     ┌─────────────┐    WebSocket     ┌─────────────┐
│   Client 1  │◄────────────────►│   Server    │◄────────────────►│   Client 2  │
│  (Browser)  │                  │ (Signaling) │                  │ (Terminal)  │
└─────────────┘                  └─────────────┘                  └─────────────┘
       ▲                                                                  ▲
       │                     WebRTC Data Channel                          │
       └──────────────────────────────────────────────────────────────────┘
```

The server acts as a signaling intermediary to establish the WebRTC connection, after which peers communicate directly.

## Quick Start

### 1. Start the Signaling Server

```bash
cd chat/server
go run main.go
```

The server will start on `http://localhost:8080` and display:
```
Starting WebRTC Chat server on http://localhost:8080
Open multiple browser tabs to test the chat
```

### 2. Open Web Interface

Open your browser and navigate to `http://localhost:8080`. The page will automatically connect to the signaling server.

### 3. Test with Multiple Clients

**Option A: Multiple Browser Tabs**
- Open multiple tabs of `http://localhost:8080`
- Start typing in one tab and see messages appear in others

**Option B: Browser + Command Line**
- Keep one browser tab open
- In a new terminal, run the command-line client:
```bash
cd chat/client
go run main.go ws://localhost:8080/ws initiator
```

**Option C: Multiple Command Line Clients**
- Terminal 1 (initiator):
```bash
cd chat/client
go run main.go ws://localhost:8080/ws initiator
```
- Terminal 2 (responder):
```bash
cd chat/client
go run main.go ws://localhost:8080/ws
```

## Usage Instructions

### Web Interface
- The page automatically connects when loaded
- Type messages in the input field and press Enter or click Send
- Messages are color-coded:
  - **Blue**: Your messages
  - **Green**: Messages from peers
  - **Red**: System messages (connection status, etc.)

### Command Line Client
- Run with: `go run main.go <websocket-url> [initiator]`
- Add `initiator` parameter for the first client to initiate the connection
- Type messages and press Enter to send
- Press Ctrl+C to quit

## How It Works

1. **Signaling Phase**:
   - Clients connect to the WebSocket server
   - First client creates a WebRTC offer
   - Server forwards the offer to other clients
   - Second client creates an answer
   - ICE candidates are exchanged for NAT traversal

2. **Connection Phase**:
   - WebRTC peer connection is established
   - Data channel is created for messaging
   - Signaling server is no longer needed

3. **Messaging Phase**:
   - Messages are sent directly between peers
   - No server involvement in message delivery
   - Low latency communication

## Configuration

### Server Configuration
- **Port**: Change in `server/main.go`, default is `:8080`
- **Origin Policy**: Currently allows all origins for development

### WebRTC Configuration
- **STUN Server**: Uses Google's public STUN server
- **ICE Candidates**: Automatic gathering and exchange
- **Data Channel**: Reliable ordered delivery

## Development

### Dependencies
- `github.com/gorilla/websocket`: WebSocket handling
- `github.com/pion/webrtc/v4`: WebRTC implementation

### Project Structure
```
chat/
├── README.md           # This file
├── server/
│   └── main.go         # WebSocket signaling server + web interface
└── client/
    └── main.go         # Command-line WebRTC client
```

### Extending the Demo
- Add user authentication
- Implement rooms/channels
- Add file transfer capabilities
- Support for voice/video calls
- Add message persistence

## Troubleshooting

### Connection Issues
- Ensure server is running on the correct port
- Check firewall settings
- Verify WebSocket URL format (`ws://` for HTTP, `wss://` for HTTPS)

### WebRTC Issues
- Check browser console for WebRTC errors
- Verify STUN server accessibility
- For production, consider using TURN servers for NAT traversal

### Common Errors
- **"Data channel not open"**: Wait for connection to establish
- **"WebSocket error"**: Check server URL and connectivity
- **"Failed to create offer"**: Ensure WebRTC is supported in browser

## License

SPDX-FileCopyrightText: 2025 The Pion community <https://pion.ly>
SPDX-License-Identifier: MIT
