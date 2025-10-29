// SPDX-FileCopyrightText: 2025 The Pion community <https://pion.ly>
// SPDX-License-Identifier: MIT

package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v4"
)

type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type Client struct {
	ws          *websocket.Conn
	pc          *webrtc.PeerConnection
	dataChannel *webrtc.DataChannel
	isInitiator bool
}

func NewClient() *Client {
	return &Client{}
}

func (c *Client) Connect(serverURL string) error {
	u, err := url.Parse(serverURL)
	if err != nil {
		return err
	}

	log.Printf("Connecting to %s", serverURL)

	c.ws, _, err = websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		return err
	}

	go c.handleSignaling()
	return nil
}

func (c *Client) setupWebRTC() error {
	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{
				URLs: []string{
					"stun:stun.l.google.com:19302",
					"stun:stun1.l.google.com:19302",
					"stun:stun2.l.google.com:19302",
				},
			},
		},
		ICETransportPolicy: webrtc.ICETransportPolicyAll,
	}

	// Create a settings engine to include localhost candidates alongside STUN
	settingEngine := webrtc.SettingEngine{}
	// Enable localhost candidates for local testing
	settingEngine.SetIncludeLoopbackCandidate(true)
	// Set NAT 1:1 mapping to include localhost
	settingEngine.SetNAT1To1IPs([]string{"127.0.0.1"}, webrtc.ICECandidateTypeHost)

	// Create API with custom settings
	api := webrtc.NewAPI(webrtc.WithSettingEngine(settingEngine))

	pc, err := api.NewPeerConnection(config)
	if err != nil {
		return err
	}
	c.pc = pc

	// Handle ICE candidates - don't send them individually since we wait for gathering completion
	c.pc.OnICECandidate(func(candidate *webrtc.ICECandidate) {
		if candidate != nil {
			log.Printf("STUN Generated ICE candidate: Type=%s, Address=%s:%d, Protocol=%s, Foundation=%s",
				candidate.Typ.String(), candidate.Address, candidate.Port, candidate.Protocol.String(), candidate.Foundation)
			// Don't send individual candidates - they're included in the complete SDP
		} else {
			log.Printf("STUN ICE candidate gathering completed")
		}
	})

	// Handle data channel from remote peer
	c.pc.OnDataChannel(func(d *webrtc.DataChannel) {
		log.Printf("New DataChannel %s %d", d.Label(), d.ID())
		c.setupDataChannel(d)
	})

	// Handle connection state changes
	c.pc.OnConnectionStateChange(func(s webrtc.PeerConnectionState) {
		log.Printf("Peer Connection State has changed: %s", s.String())
		if s == webrtc.PeerConnectionStateConnected {
			log.Println("WebRTC connection established! You can now send messages.")
		} else if s == webrtc.PeerConnectionStateFailed {
			log.Println("WebRTC connection failed!")
			// Reset connection for potential retry
			go c.resetWebRTCConnection()
		} else if s == webrtc.PeerConnectionStateClosed {
			log.Println("WebRTC connection closed!")
			// Reset connection for potential retry
			go c.resetWebRTCConnection()
		}
	})

	// Add ICE connection state logging
	c.pc.OnICEConnectionStateChange(func(connectionState webrtc.ICEConnectionState) {
		log.Printf("ICE Connection State has changed: %s", connectionState.String())
	})

	// Add ICE gathering state logging
	c.pc.OnICEGatheringStateChange(func(gatheringState webrtc.ICEGatheringState) {
		log.Printf("ICE Gathering State has changed: %s", gatheringState.String())
	})

	return nil
}

func (c *Client) setupDataChannel(dc *webrtc.DataChannel) {
	c.dataChannel = dc

	dc.OnOpen(func() {
		log.Printf("Data channel '%s' opened", dc.Label())
	})

	dc.OnMessage(func(msg webrtc.DataChannelMessage) {
		fmt.Printf(">> %s\n", string(msg.Data))
	})

	dc.OnClose(func() {
		log.Println("Data channel closed")
	})
}

func (c *Client) resetWebRTCConnection() {
	log.Println("Resetting WebRTC connection...")

	// Close existing connection if it exists
	if c.pc != nil {
		c.pc.Close()
	}

	// Reset data channel reference
	c.dataChannel = nil
	c.isInitiator = false

	// Small delay before recreating
	time.Sleep(1 * time.Second)

	// Recreate WebRTC connection using the standard setup
	err := c.setupWebRTC()
	if err != nil {
		log.Printf("Failed to reset WebRTC connection: %v", err)
		return
	}

	log.Println("WebRTC connection reset complete, ready for new offers/answers")
}

func (c *Client) createOffer() error {
	// Create data channel
	dc, err := c.pc.CreateDataChannel("chat", nil)
	if err != nil {
		return err
	}
	c.setupDataChannel(dc)
	c.isInitiator = true

	offer, err := c.pc.CreateOffer(nil)
	if err != nil {
		return err
	}

	// Create a channel to wait for ICE gathering to complete
	gatherComplete := webrtc.GatheringCompletePromise(c.pc)

	err = c.pc.SetLocalDescription(offer)
	if err != nil {
		return err
	}

	log.Printf("Waiting for ICE gathering to complete...")
	<-gatherComplete
	log.Printf("ICE gathering completed, sending offer...")
	log.Printf("Offer SDP:\n%s", c.pc.LocalDescription().SDP)

	msg := Message{
		Type: "offer",
		Data: *c.pc.LocalDescription(),
	}
	return c.ws.WriteJSON(msg)
}

func (c *Client) handleOffer(offer webrtc.SessionDescription) error {
	log.Printf("Setting remote description from offer...")
	err := c.pc.SetRemoteDescription(offer)
	if err != nil {
		return fmt.Errorf("failed to set remote description: %v", err)
	}

	log.Printf("Creating answer...")
	answer, err := c.pc.CreateAnswer(nil)
	if err != nil {
		return fmt.Errorf("failed to create answer: %v", err)
	}

	// Create a channel to wait for ICE gathering to complete
	gatherComplete := webrtc.GatheringCompletePromise(c.pc)

	log.Printf("Setting local description with answer...")
	err = c.pc.SetLocalDescription(answer)
	if err != nil {
		return fmt.Errorf("failed to set local description: %v", err)
	}

	log.Printf("Waiting for ICE gathering to complete...")
	<-gatherComplete
	log.Printf("ICE gathering completed, sending answer...")
	log.Printf("Answer SDP:\n%s", c.pc.LocalDescription().SDP)

	msg := Message{
		Type: "answer",
		Data: *c.pc.LocalDescription(),
	}
	return c.ws.WriteJSON(msg)
}

func (c *Client) handleAnswer(answer webrtc.SessionDescription) error {
	log.Printf("Setting remote description from answer...")
	err := c.pc.SetRemoteDescription(answer)
	if err != nil {
		return fmt.Errorf("failed to set remote description: %v", err)
	}
	log.Printf("Answer processed successfully")
	return nil
}

func (c *Client) handleSignaling() {
	for {
		var msg Message
		err := c.ws.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error reading message: %v", err)
			return
		}

		log.Printf("Received signaling message: %s", msg.Type)

		switch msg.Type {
		case "offer":
			data, _ := json.Marshal(msg.Data)
			var offer webrtc.SessionDescription
			err := json.Unmarshal(data, &offer)
			if err != nil {
				log.Printf("Error unmarshaling offer: %v", err)
				continue
			}
			log.Printf("Handling offer...")
			err = c.handleOffer(offer)
			if err != nil {
				log.Printf("Error handling offer: %v", err)
			}
		case "answer":
			data, _ := json.Marshal(msg.Data)
			var answer webrtc.SessionDescription
			err := json.Unmarshal(data, &answer)
			if err != nil {
				log.Printf("Error unmarshaling answer: %v", err)
				continue
			}
			log.Printf("Handling answer...")
			err = c.handleAnswer(answer)
			if err != nil {
				log.Printf("Error handling answer: %v", err)
			}
		case "ice-candidate":
			// ICE candidates are now included in the complete SDP, so we ignore individual ones
			log.Printf("Ignoring individual ICE candidate (using complete SDP)")
		}
	}
}

func (c *Client) SendMessage(message string) error {
	if c.dataChannel != nil && c.dataChannel.ReadyState() == webrtc.DataChannelStateOpen {
		return c.dataChannel.SendText(message)
	}
	return fmt.Errorf("data channel not open")
}

func (c *Client) Close() {
	if c.dataChannel != nil {
		c.dataChannel.Close()
	}
	if c.pc != nil {
		c.pc.Close()
	}
	if c.ws != nil {
		c.ws.Close()
	}
}

func main() {
	if len(os.Args) < 2 {
		log.Fatal("Usage: go run main.go <server-url> [initiator] [local]")
	}

	serverURL := os.Args[1]
	isInitiator := len(os.Args) > 2 && os.Args[2] == "initiator"

	client := NewClient()
	defer client.Close()

	err := client.Connect(serverURL)
	if err != nil {
		log.Fatal("Failed to connect:", err)
	}

	err = client.setupWebRTC()
	if err != nil {
		log.Fatal("Failed to setup WebRTC:", err)
	}

	// If this client should initiate the connection
	if isInitiator {
		// Wait a bit longer for the responder to connect
		log.Println("Waiting for responder to connect...")
		time.Sleep(3 * time.Second)
		log.Println("Creating offer...")
		err = client.createOffer()
		if err != nil {
			log.Fatal("Failed to create offer:", err)
		}
	} else {
		log.Println("Waiting for offer from initiator...")
	}

	// Handle graceful shutdown
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt, syscall.SIGTERM)

	// Start input reading goroutine
	go func() {
		scanner := bufio.NewScanner(os.Stdin)
		fmt.Println("Type your messages (press Enter to send, Ctrl+C to quit):")
		for scanner.Scan() {
			text := strings.TrimSpace(scanner.Text())
			if text != "" {
				err := client.SendMessage(text)
				if err != nil {
					fmt.Printf("Failed to send message: %v\n", err)
				} else {
					fmt.Printf("<< %s\n", text)
				}
			}
		}
	}()

	// Wait for interrupt signal
	<-interrupt
	log.Println("Shutting down...")
}
