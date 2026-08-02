import { useEffect, useRef, useState } from "react";
import axios from "axios";
import EmojiPicker from "emoji-picker-react";
import { FiArrowLeft, FiSend, FiSmile } from "react-icons/fi";
import { io } from "socket.io-client";
import Avatar from "./Avatar";
import "./Styles.css";

const CHAT_SERVER_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
const getPartner = (username) => (username === "Ritisha" ? "Manan" : "Ritisha");

const formatTime = (value) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
    new Date(value)
  );

function ChatScreen({ currentUser, profilePictures, onBack }) {
  const partner = getPartner(currentUser);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const typingTimerRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!CHAT_SERVER_URL) {
      setError("Chat service is unavailable.");
      return undefined;
    }

    try {
      const socket = io(CHAT_SERVER_URL);
      socketRef.current = socket;

      axios
        .get(`${CHAT_SERVER_URL}/messages?username=${encodeURIComponent(currentUser)}`)
        .then((response) => {
          setMessages((previous) => {
            const merged = [...previous, ...(response.data || [])];
            return merged.filter(
              (message, index) => merged.findIndex((item) => item._id === message._id) === index
            );
          });
          socket.emit("chat:seen");
        })
        .catch(() => setError("Could not load your conversation."));

      socket.on("connect", () => socket.emit("chat:join", { username: currentUser }));
      socket.on("connect_error", () => setError("Chat service is unavailable. Please try again later."));
      socket.on("chat:message", (message) => {
        setMessages((previous) =>
          previous.some((item) => item._id === message._id) ? previous : [...previous, message]
        );
        if (message.recipient === currentUser) socket.emit("chat:seen");
      });
      socket.on("chat:typing", ({ username, isTyping }) => {
        if (username === partner) setIsPartnerTyping(isTyping);
      });
      socket.on("chat:presence", ({ onlineUsers }) => {
        setIsPartnerOnline(onlineUsers.includes(partner));
      });
      socket.on("chat:seen", ({ recipient, seenAt }) => {
        if (recipient !== partner) return;
        setMessages((previous) =>
          previous.map((message) =>
            message.sender === currentUser && !message.seenAt ? { ...message, seenAt } : message
          )
        );
      });
      socket.on("chat:error", ({ message }) => setError(message));

      return () => {
        clearTimeout(typingTimerRef.current);
        socket.disconnect();
      };
    } catch (connectionError) {
      console.error("Unable to initialize chat socket", connectionError);
      setError("Chat service is unavailable. Please try again later.");
      return undefined;
    }
  }, [currentUser, partner]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPartnerTyping]);

  const sendTyping = (isTyping) => socketRef.current?.emit("chat:typing", { isTyping });

  const handleDraftChange = (event) => {
    setDraft(event.target.value);
    sendTyping(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTyping(false), 1200);
  };

  const sendMessage = () => {
    if (!draft.trim()) return;
    socketRef.current?.emit("chat:send", { text: draft });
    setDraft("");
    setShowEmojiPicker(false);
    clearTimeout(typingTimerRef.current);
    sendTyping(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <section className="chat-screen" aria-label={`Chat with ${partner}`}>
      <header className="chat-header">
        <button type="button" className="chat-back-button" onClick={onBack} aria-label="Back to feed">
          <FiArrowLeft />
        </button>
        <Avatar
          username={partner}
          imageUrl={profilePictures?.[partner.toLowerCase()]}
          className="chat-avatar"
        />
        <div>
          <h2>{partner}</h2>
          <p className={isPartnerOnline ? "online-status" : "offline-status"}>
            {isPartnerOnline ? "Online" : "Offline"}
          </p>
        </div>
      </header>

      <div className="chat-messages" aria-live="polite">
        {messages.map((message) => {
          const isMine = message.sender === currentUser;
          return (
            <article className={`chat-message ${isMine ? "chat-message-mine" : "chat-message-theirs"}`} key={message._id}>
              <p>{message.text}</p>
              <span>{formatTime(message.createdAt)}</span>
            </article>
          );
        })}
        {isPartnerTyping && <p className="typing-indicator">{partner} is typing...</p>}
        <div ref={messagesEndRef} />
      </div>

      {messages.some((message) => message.sender === currentUser && message.seenAt) && (
        <p className="seen-status">Seen</p>
      )}
      {error && <p className="error-message chat-error">{error}</p>}

      <div className="chat-composer-wrap">
        {showEmojiPicker && (
          <div className="emoji-picker-wrap">
            <EmojiPicker onEmojiClick={(emoji) => setDraft((previous) => previous + emoji.emoji)} />
          </div>
        )}
        <div className="chat-composer">
          <button type="button" className="emoji-button" onClick={() => setShowEmojiPicker((value) => !value)} aria-label="Choose emoji">
            <FiSmile />
          </button>
          <textarea
            value={draft}
            onChange={handleDraftChange}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows="1"
            aria-label="Message"
          />
          <button type="button" className="chat-send-button" onClick={sendMessage} disabled={!draft.trim()} aria-label="Send message">
            <FiSend />
          </button>
        </div>
      </div>
    </section>
  );
}

export default ChatScreen;
