import React, { useEffect, useRef, useState } from 'react';
import { FiVideo, FiVideoOff, FiMic, FiMicOff, FiMessageSquare, FiPlay } from 'react-icons/fi';
import { io } from 'socket.io-client';
import './App.css';

function App() {
  const socketRef = useRef(null);
  const [inCall, setInCall] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [partnerId, setPartnerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);

  useEffect(() => {
    // Initialize socket and events
    // Dopo – URL relativo: sfrutta il proxy appena configurato
    const sock = io();
    socketRef.current = sock;

    sock.on('connect', () => console.log('Socket connected:', sock.id));
    sock.on('disconnect', () => console.log('Socket disconnected'));

    sock.on('chatMessage', ({ text }) => {
      setMessages(prev => [...prev, { fromSelf: false, text }]);
    });

    sock.on('matchWaiting', () => {
      console.log('Server: matchWaiting');
      setIsWaiting(true);
    });

    sock.on('matched', ({ users }) => {
      console.log('Server: matched', users);
      const me = sock.id;
      const other = users.find(u => u !== me);
      setPartnerId(other);
      setIsInitiator(users[0] === me);
      setIsWaiting(false);
      setInCall(true);
    });

    sock.on('rtcOffer', async ({ from, offer }) => {
      console.log('Received offer from', from);
      await setupPeer(from);
      await peerConnectionRef.current.setRemoteDescription(offer);
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      socketRef.current.emit('rtcAnswer', { to: from, answer });
    });

    sock.on('rtcAnswer', async ({ from, answer }) => {
      console.log('Received answer from', from);
      await peerConnectionRef.current.setRemoteDescription(answer);
    });

    sock.on('iceCandidate', ({ from, candidate }) => {
      peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
    });

    return () => {
      sock.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!inCall) return;
    // Start media
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        setIsCameraOn(true);
        setIsMicOn(true);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // If initiator, create offer
        if (isInitiator && partnerId) {
          setupPeer(partnerId).then(() => {
            peerConnectionRef.current.createOffer()
              .then(offer => peerConnectionRef.current.setLocalDescription(offer))
              .then(() => {
                socketRef.current.emit('rtcOffer', { to: partnerId, offer: peerConnectionRef.current.localDescription });
              });
          });
        }
      })
      .catch(err => console.error('getUserMedia error:', err));
  }, [inCall, isInitiator, partnerId]);

  const setupPeer = async otherId => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerConnectionRef.current = pc;
    // Add local tracks
    localStreamRef.current?.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    pc.onicecandidate = ({ candidate }) => candidate && socketRef.current.emit('iceCandidate', { to: otherId, candidate });
    pc.ontrack = event => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]; };
    return pc;
  };

  const startCall = () => {
    console.log('Client: startCall -> joinQueue');
    setIsWaiting(true);
    socketRef.current.emit('joinQueue');
  };

  const toggleCamera = () => {
    localStreamRef.current.getVideoTracks().forEach(t => {
      t.enabled = !t.enabled;
      setIsCameraOn(t.enabled);
    });
  };

  const toggleMicrophone = () => {
    localStreamRef.current.getAudioTracks().forEach(t => {
      t.enabled = !t.enabled;
      setIsMicOn(t.enabled);
    });
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      socketRef.current.emit('chatMessage', { text: newMessage });
      setMessages(prev => [...prev, { fromSelf: true, text: newMessage }]);
      setNewMessage('');
    }
  };

  if (!inCall) {
    return (
      <div className="app-container start-screen">
        {isWaiting ? (
          <div className="waiting-message">In attesa di un partner...</div>
        ) : (
          <button className="start-button" onClick={startCall}><FiPlay /> Inizia</button>
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="video-section">
        <div className="header">
          <h2>Benvenuti su omegletop</h2>
          <button className="small chat-toggle-button" onClick={() => setIsChatOpen(o => !o)}><FiMessageSquare /></button>
        </div>
        <div className="video-wrapper">
          <video ref={localVideoRef} autoPlay muted playsInline className="video-element mirrored" />
          <video ref={remoteVideoRef} autoPlay playsInline className="video-element mirrored" />
          <div className="controls">
            <button className="control-button circle" onClick={toggleCamera}>{isCameraOn ? <FiVideo /> : <FiVideoOff />}</button>
            <button className="control-button circle" onClick={toggleMicrophone}>{isMicOn ? <FiMic /> : <FiMicOff />}</button>
          </div>
        </div>
      </div>
      <div className={`chat-container ${isChatOpen ? 'open' : 'closed'}`}>
        <div className="chat-messages">
          {messages.map((m,i) => <div key={i} className={`chat-message ${m.fromSelf ? 'self' : 'other'}`}>{m.text}</div>)}
        </div>
        <div className="chat-input">
          <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key==='Enter' && sendMessage()} placeholder="Type a message..." />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}
export default App;
