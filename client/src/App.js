import React, { useEffect, useRef, useState } from 'react';
import { FiVideo, FiVideoOff, FiMic, FiMicOff, FiMessageSquare } from 'react-icons/fi';
import { io } from 'socket.io-client';
import './App.css';

function App() {
  const [socket, setSocket] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('chatMessage', ({ text }) => {
      setMessages(prev => [...prev, { fromSelf: false, text }]);
    });

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        setIsCameraOn(true);
        setIsMicOn(true);
      })
      .catch(err => {
        console.error('getUserMedia error:', err);
        setIsCameraOn(false);
        setIsMicOn(false);
      });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (isCameraOn && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [isCameraOn]);

  const toggleCamera = async () => {
    if (isCameraOn) {
      // Stop video tracks
      localStreamRef.current.getVideoTracks().forEach(track => track.stop());
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      setIsCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        // Preserve existing audio tracks
        const audioTracks = localStreamRef.current ? localStreamRef.current.getAudioTracks() : [];
        audioTracks.forEach(track => stream.addTrack(track));
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setIsCameraOn(true);
      } catch (error) {
        console.error('Error accessing camera', error);
      }
    }
  };

  const toggleMicrophone = async () => {
    if (isMicOn) {
      // Stop audio tracks
      localStreamRef.current.getAudioTracks().forEach(track => track.stop());
      setIsMicOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        // Preserve existing video tracks
        const videoTracks = localStreamRef.current ? localStreamRef.current.getVideoTracks() : [];
        videoTracks.forEach(track => stream.addTrack(track));
        localStreamRef.current = stream;
        if (localVideoRef.current && isCameraOn) localVideoRef.current.srcObject = stream;
        setIsMicOn(true);
      } catch (error) {
        console.error('Error accessing microphone', error);
      }
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && socket) {
      socket.emit('chatMessage', { text: newMessage });
      setMessages(prev => [...prev, { fromSelf: true, text: newMessage }]);
      setNewMessage('');
    }
  };

  const toggleChat = () => setIsChatOpen(open => !open);

  return (
    <div className="app-container">
      <div className="video-section">
        <div className="header">
          <h2>Benvenuti su Omegletop</h2>
          <button className="chat-toggle-button" onClick={toggleChat}>
            <FiMessageSquare />
          </button>
        </div>
        <div className="video-wrapper">
          {isCameraOn ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="video-element mirrored"
            />
          ) : (
            <div className="video-element video-off" />
          )}
          <div className="controls">
            <button className="control-button circle" onClick={toggleCamera}>
              {isCameraOn ? <FiVideo /> : <FiVideoOff />}
            </button>
            <button className="control-button circle" onClick={toggleMicrophone}>
              {isMicOn ? <FiMic /> : <FiMicOff />}
            </button>
          </div>
        </div>
      </div>

      <div className={`chat-container ${isChatOpen ? 'open' : 'closed'}`}>
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`chat-message ${m.fromSelf ? 'self' : 'other'}`}>{m.text}</div>
          ))}
        </div>
        <div className="chat-input">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default App;
