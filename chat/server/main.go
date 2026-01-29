// SPDX-FileCopyrightText: 2025 The Pion community <https://pion.ly>
// SPDX-License-Identifier: MIT

package main

import (
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow connections from any origin
	},
}

type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type Room struct {
	clients map[*websocket.Conn]bool
	mutex   sync.RWMutex
}

func NewRoom() *Room {
	return &Room{
		clients: make(map[*websocket.Conn]bool),
	}
}

func (r *Room) AddClient(conn *websocket.Conn) {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	r.clients[conn] = true
}

func (r *Room) RemoveClient(conn *websocket.Conn) {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	delete(r.clients, conn)
	conn.Close()
}

func (r *Room) Broadcast(message Message, sender *websocket.Conn) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	for client := range r.clients {
		if client != sender {
			err := client.WriteJSON(message)
			if err != nil {
				log.Printf("Error broadcasting message: %v", err)
				delete(r.clients, client)
				client.Close()
			}
		}
	}
}

func (r *Room) GetClientCount() int {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	return len(r.clients)
}

var room = NewRoom()

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	room.AddClient(conn)
	defer room.RemoveClient(conn)

	log.Printf("New client connected. Total clients: %d", room.GetClientCount())

	for {
		var msg Message
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error reading message: %v", err)
			break
		}

		log.Printf("Received message: %s", msg.Type)

		switch msg.Type {
		case "offer", "answer", "ice-candidate":
			// Forward WebRTC signaling messages to other clients
			room.Broadcast(msg, conn)
		default:
			log.Printf("Unknown message type: %s", msg.Type)
		}
	}
}

func handleIndex(w http.ResponseWriter, r *http.Request) {
	html := `<!DOCTYPE html>
<html>
<head>
    <title>WebRTC Chat Demo</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        #messages { border: 1px solid #ccc; height: 300px; overflow-y: scroll; padding: 10px; margin: 10px 0; }
        #messageInput { width: 70%; padding: 10px; }
        #sendButton { padding: 10px 20px; }
        .message { margin: 5px 0; }
        .local { color: blue; }
        .remote { color: green; }
        .system { color: red; font-style: italic; }
        #status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .connected { background-color: #d4edda; color: #155724; }
        .disconnected { background-color: #f8d7da; color: #721c24; }
        .connecting { background-color: #fff3cd; color: #856404; }
    </style>
</head>
<body>
    <h1>WebRTC Chat Demo</h1>
    <div id="status" class="disconnected">Disconnected</div>
    <div id="messages"></div>
    <input type="text" id="messageInput" placeholder="Type your message here..." disabled>
    <button id="sendButton" disabled>Send</button>
    <button id="connectButton">Connect</button>

    <script>
        let ws;
        let pc;
        let dataChannel;
        let isInitiator = false;

        const messages = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const connectButton = document.getElementById('connectButton');
        const status = document.getElementById('status');

        function addMessage(text, className = '') {
            const div = document.createElement('div');
            div.className = 'message ' + className;
            div.textContent = new Date().toLocaleTimeString() + ': ' + text;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollTop + 1000;
        }

        function updateStatus(text, className) {
            status.textContent = text;
            status.className = className;
        }

        function setupWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(protocol + '//' + window.location.host + '/ws');

            ws.onopen = function() {
                addMessage('Connected to signaling server', 'system');
                updateStatus('Connected to signaling server', 'connecting');
                setupWebRTC();
            };

            ws.onmessage = function(event) {
                const message = JSON.parse(event.data);
                handleSignalingMessage(message);
            };

            ws.onclose = function() {
                addMessage('Disconnected from signaling server', 'system');
                updateStatus('Disconnected', 'disconnected');
                messageInput.disabled = true;
                sendButton.disabled = true;
                connectButton.disabled = false;
            };

            ws.onerror = function(error) {
                addMessage('WebSocket error: ' + error, 'system');
                updateStatus('Connection error', 'disconnected');
            };
        }

        function setupWebRTC() {
            const configuration = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            };

            pc = new RTCPeerConnection(configuration);

            pc.onicecandidate = function(event) {
                if (event.candidate) {
                    ws.send(JSON.stringify({
                        type: 'ice-candidate',
                        data: event.candidate
                    }));
                }
            };

            pc.ondatachannel = function(event) {
                const channel = event.channel;
                setupDataChannel(channel);
            };

            pc.onconnectionstatechange = function() {
                addMessage('Connection state: ' + pc.connectionState, 'system');
                if (pc.connectionState === 'connected') {
                    updateStatus('Connected to peer', 'connected');
                } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    updateStatus('Disconnected from peer', 'disconnected');
                    messageInput.disabled = true;
                    sendButton.disabled = true;
                }
            };

            // Create data channel if we're the initiator (optimized timing)
            setTimeout(() => {
                if (!dataChannel) {
                    isInitiator = true;
                    dataChannel = pc.createDataChannel('chat');
                    setupDataChannel(dataChannel);
                    createOffer();
                }
            }, 200); // Reduced from 1000ms to 200ms for faster connection
        }

        function setupDataChannel(channel) {
            dataChannel = channel;

            dataChannel.onopen = function() {
                addMessage('Data channel opened', 'system');
                messageInput.disabled = false;
                sendButton.disabled = false;
            };

            dataChannel.onmessage = function(event) {
                addMessage(event.data, 'remote');
            };

            dataChannel.onclose = function() {
                addMessage('Data channel closed', 'system');
                messageInput.disabled = true;
                sendButton.disabled = true;
            };
        }

        async function createOffer() {
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                ws.send(JSON.stringify({
                    type: 'offer',
                    data: offer
                }));
                addMessage('Sent offer', 'system');
            } catch (error) {
                addMessage('Error creating offer: ' + error, 'system');
            }
        }

        async function createAnswer(offer) {
            try {
                await pc.setRemoteDescription(offer);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                ws.send(JSON.stringify({
                    type: 'answer',
                    data: answer
                }));
                addMessage('Sent answer', 'system');
            } catch (error) {
                addMessage('Error creating answer: ' + error, 'system');
            }
        }

        async function handleSignalingMessage(message) {
            try {
                switch (message.type) {
                    case 'offer':
                        if (!isInitiator) {
                            addMessage('Received offer', 'system');
                            await createAnswer(message.data);
                        }
                        break;
                    case 'answer':
                        if (isInitiator) {
                            addMessage('Received answer', 'system');
                            await pc.setRemoteDescription(message.data);
                        }
                        break;
                    case 'ice-candidate':
                        await pc.addIceCandidate(message.data);
                        break;
                }
            } catch (error) {
                addMessage('Error handling signaling message: ' + error, 'system');
            }
        }

        function sendMessage() {
            const text = messageInput.value.trim();
            if (text && dataChannel && dataChannel.readyState === 'open') {
                dataChannel.send(text);
                addMessage(text, 'local');
                messageInput.value = '';
            }
        }

        connectButton.onclick = function() {
            connectButton.disabled = true;
            setupWebSocket();
        };

        sendButton.onclick = sendMessage;

        messageInput.onkeypress = function(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        };

        // Auto-connect on page load
        window.onload = function() {
            connectButton.click();
        };
    </script>
</body>
</html>`
	w.Header().Set("Content-Type", "text/html")
	fmt.Fprint(w, html)
}

func main() {
	http.HandleFunc("/", handleIndex)
	http.HandleFunc("/ws", handleWebSocket)

	port := ":8080"
	log.Printf("Starting WebRTC Chat server on http://localhost%s", port)
	log.Printf("Open multiple browser tabs to test the chat")

	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
