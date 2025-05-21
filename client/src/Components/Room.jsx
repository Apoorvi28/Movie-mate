import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import './Room.css';
import EmojiPicker from 'emoji-picker-react';



function Room() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const chatBoxRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const copyTimeout = useRef(null);
  const socket = useRef(io("http://localhost:4000")).current;
  const [username, setUsername] = useState("");
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const [genre, setGenre] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRoomCreator, setIsRoomCreator] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoSrc, setVideoSrc] = useState("");

  useEffect(() => {
    // Log connection once socket connects
    socket.on("connect", () => {
      console.log("Connected to the server with socket ID:", socket.id);
    });

    return () => {
      socket.off("connect");
    };
  }, []); 

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const formData = new FormData();
    formData.append("video", file);
  
    try {
      const res = await fetch("http://localhost:4000/upload", {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json(); // Fails if response is HTML (e.g. error page)
      console.log("Uploaded video URL:", data.videoURL);
      setVideoSrc(data.videoURL);
      socket.emit("video-url", { roomId: id, url: data.videoURL });
    } catch (err) {
      console.error("Video upload failed:", err);
    }
  };
  
  
  const handleCopyLink = () => {
    const roomLink = `${window.location.origin}/room/${id}`;
    navigator.clipboard.writeText(roomLink)
      .then(() => {
        setIsCopied(true);
        copyTimeout.current = setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => console.error("Copy failed:", err));
  };

  const handleUsernameSubmit = () => {
    if (!username || !genre) return;
    socket.emit("joinRoom", { roomId: id, username }, ({ isCreator }) => {
      setIsRoomCreator(isCreator);
      setIsUsernameSet(true);
    });
  };

  const handleEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  const handlePlayPause = () => {
    if (!isRoomCreator || !videoRef.current) return;

    if (playing) {
      videoRef.current.pause();
      socket.emit("pause", id);
    } else {
      videoRef.current.play();
      socket.emit("play", id);
    }
    setPlaying(!playing);
  };


  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit("chatImage", { roomId: id, username, image: reader.result });
      setMessages(prev => [...prev, { username, image: reader.result }]);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    socket.emit("chatMessage", { roomId: id, username, message });
    
    setMessage("");
  };

  const handleLeaveRoom = () => {
    if (window.confirm("Are you sure you want to leave the room?")) {
      socket.emit("leaveRoom", id);
      navigate('/');
    }
  };

  const handleFullscreen = () => {
    const elem = document.querySelector('.room-container');
    if (elem?.requestFullscreen) {
      elem.requestFullscreen();
    }
  };
  const handleSeek = () => {
    if (isRoomCreator && videoRef.current) {
      socket.emit("seek", { roomId: id, time: videoRef.current.currentTime });
    }
  };
  

  useEffect(() => {
    socket.on("video-url", ({ url }) => {
      console.log("Received video URL:", url);
      setVideoSrc(url);
    });
  
    return () => {
      socket.off("video-url");
    };
  }, []);
  
  useEffect(() => {
    if (isUsernameSet) {
      socket.on("userJoined", (name) => {
        setMessages((prev) => [...prev, { username: "System", message: `${name} joined.` }]);
      });
  
      socket.on("userLeft", (name) => {
        setMessages((prev) => [...prev, { username: "System", message: `${name} left.` }]);
      });
  
      socket.on("play", ({ time }) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        videoRef.current.play();
        setPlaying(true);
      }
    });

    socket.on("pause", () => {
      if (videoRef.current) {
        videoRef.current.pause();
        setPlaying(false);
      }
      });
  
      socket.on("seek", (time) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      });
  
      socket.on("chatMessage", ({ username, message }) => {
        setMessages((prev) => [...prev, { username, message }]);
      });
  
      socket.on("chatImage", ({ username, image }) => {
        setMessages((prev) => [...prev, { username, image }]);
      });
  
      socket.on("videoUploaded", ({ videoURL }) => {
        setVideoSrc(videoURL);
      });
  
      // Listen for video sync events
      socket.on("video-play", ({ roomId, time }) => {
        socket.to(roomId).emit("video-play", { time });
      });
      
      socket.on("video-pause", ({ roomId, time }) => {
        socket.to(roomId).emit("video-pause", { time });
      });
      
    }
  
    // Cleanup
    return () => {
      socket.off("play");
      socket.off("pause");
      socket.off("seek");
      socket.off("chatMessage");
      socket.off("chatImage");
      socket.off("videoUploaded");
      socket.off("video-play");
      socket.off("video-pause");
    };
  }, [isUsernameSet]);
  
  

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target) &&
        !emojiButtonRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  if (!isUsernameSet) {
    return (
      <div className="username-box">
        <h1>Enter your name to join Room</h1>
        <input className="username-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Your name" />
        <br></br>
        <select className="username-input" value={genre} onChange={e => setGenre(e.target.value)}>
          <option value="">Select Genre</option>
          <option value="horror">Horror</option>
          <option value="romance">Romance</option>
          <option value="action">Action</option>
          <option value="comedy">Comedy</option>
        </select>
        <br></br>
        <br></br>
        <button onClick={handleUsernameSubmit}>Join</button>
      </div>
    );
  }

  return (
    <div className={`room-container genre-${genre}`}>
      <div className="video-section">
  <button onClick={handleCopyLink}>Copy Room Link</button>
  {isCopied && <div className="copy-popup">Link copied!</div>}

  {isRoomCreator && (
    <div style={{ marginBottom: "10px" }}>
      <label htmlFor="video-upload">Upload Video:</label>
      <input
        id="video-upload"
        type="file"
        accept="video/mp4"
        onChange={handleVideoUpload}
      />
    </div>
  )}

  <video
  ref={videoRef}
  width="720"
  height="400"
  controls
  src={videoSrc}
  onPlay={() => {
    if (isRoomCreator && videoRef.current) {
      socket.emit("video-play", {
        roomId: id,
        time: videoRef.current.currentTime,
      });
    }
  }}
  onPause={() => {
    if (isRoomCreator && videoRef.current) {
      socket.emit("video-pause", {
        roomId: id,
        time: videoRef.current.currentTime,
      });
    }
  }}
  onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
  onSeeked={handleSeek}
>

  {/* Add your additional content like console logs */}
  console.log("videoSrc:", videoSrc);
</video>

<div className="video-controls-row">
  {isRoomCreator && (
    <button onClick={handlePlayPause}>
      {playing ? "Pause" : "Play"}
    </button>
  )}
  <button onClick={handleFullscreen}>Fullscreen</button>
</div>

<div className="video-time">
  <span>Time: {currentTime.toFixed(2)}s</span>
</div>

<div className="leave-button">
  <button onClick={handleLeaveRoom}>Leave Room</button>
</div>
</div>

      <div className="chat-section">
        <h3>Chat</h3>
        <input type="file" accept="image/*" onChange={handleFileUpload} />
        <div className="chat-box" ref={chatBoxRef}>
          {messages.map((msg, idx) => (
            <div key={idx} className="chat-message">
              {msg.image ? (
                <div><strong>{msg.username}:</strong><br /><img src={msg.image} alt="shared" style={{ maxWidth: '100%' }} /></div>
              ) : (
                <div><strong>{msg.username}:</strong> {msg.message}</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type message..."
          />
          <button ref={emojiButtonRef} onClick={() => setShowEmojiPicker(prev => !prev)}>😀</button>
          <button onClick={handleSendMessage}>Send</button>
          {showEmojiPicker && (
            <div ref={emojiPickerRef} style={{ position: 'absolute', bottom: '50px', right: 0, zIndex: 2 }}>
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Room;
