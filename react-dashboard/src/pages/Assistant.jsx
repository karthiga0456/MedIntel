import React, { useState, useEffect, useRef } from 'react';
import {
  PaperPlaneRight, Robot, User, Microphone, Paperclip,
  WarningCircle, Globe, Trash, ShieldCheck, FirstAid,
} from '@phosphor-icons/react';
import { api } from '../services/api';

// ── Generate or restore a stable session user ID ─────────────────────────────
function getOrCreateUserId() {
  const key = 'medintel_user_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'user-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(key, id);
  }
  return id;
}

const WELCOME_MSG = {
  text: "Hello! I'm MedIntel AI — your public health assistant. I can help you with disease awareness, symptoms, prevention, vaccination schedules, and Indian government health schemes.\n\nHow can I help you today?",
  sender: 'bot',
};

const EMERGENCY_KEYWORDS = [
  'chest pain', 'heart attack', 'stroke', 'can\'t breathe', 'cannot breathe',
  'difficulty breathing', 'unconscious', 'unresponsive', 'severe bleeding',
  'allergic reaction', 'anaphylaxis', 'seizure', 'convulsion',
];

export default function Assistant() {
  const [userId]    = useState(getOrCreateUserId);
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input,    setInput]    = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [language, setLanguage] = useState('en');
  const [emergencyAlert, setEmergencyAlert] = useState(false);

  const chatEndRef   = useRef(null);
  const inputRef     = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const currentInput = input.trim();
    setMessages(prev => [...prev, { text: currentInput, sender: 'user' }]);
    setInput('');
    setIsTyping(true);

    // Emergency intent detection (frontend-level, before API call)
    const lower = currentInput.toLowerCase();
    const isEmergency = EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));

    if (isEmergency) {
      setIsTyping(false);
      setEmergencyAlert(true);
      setMessages(prev => [...prev, {
        text: '🚨 EMERGENCY DETECTED\n\nPlease call **112** (India Emergency) or go to your nearest hospital immediately.\n\nDo NOT wait — ask someone nearby for help right now.',
        sender: 'bot',
        isEmergency: true,
      }]);
      return;
    }

    // Normal API call
    try {
      const data = await api.assistant.chat(currentInput, language, userId);
      setMessages(prev => [...prev, {
        text:    data.reply || 'No response received.',
        sender:  'bot',
        scheme:  data.matched_scheme || null,
        disclaimer: data.disclaimer || null,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        text:   'Error connecting to the AI backend. Please ensure the server is running.',
        sender: 'bot',
      }]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  // ── Clear chat history ──────────────────────────────────────────────────────
  const handleClearHistory = async () => {
    try {
      await api.assistant.clearHistory(userId);
    } catch { /* ignore — history is also cleared locally */ }
    setMessages([WELCOME_MSG]);
    setEmergencyAlert(false);
  };

  // ── Voice recording (Web Speech API) ───────────────────────────────────────
  const toggleRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = language === 'en' ? 'en-IN' : `${language}-IN`;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend   = () => setIsRecording(false);
    recognition.start();
  };

  // ── File upload (OCR placeholder — wired to RAG in Module 3) ───────────────
  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileName = e.target.files[0].name;
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setInput(`Please explain the medical findings from: ${fileName}`);
        inputRef.current?.focus();
      }, 1200);
    }
  };

  // ── Keyboard handler ────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="module-view">
      {/* Header */}
      <header className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2>AI Medical Knowledge Assistant</h2>
          <p className="subtitle">Powered by Google Gemini · Multilingual · Health Scheme Aware</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Language selector */}
          <div className="control-pill">
            <Globe weight="bold" size={16} color="var(--text-secondary)" />
            <select
              id="language-selector"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', cursor: 'pointer', fontSize: '14px' }}
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="bn">বাংলা (Bengali)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="ml">മലയാളം (Malayalam)</option>
            </select>
          </div>

          {/* Clear history */}
          <button
            id="clear-chat-btn"
            onClick={handleClearHistory}
            className="btn-secondary"
            title="Clear conversation history"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Trash size={16} />
            New Chat
          </button>
        </div>
      </header>

      {/* Emergency Banner */}
      {emergencyAlert && (
        <div className="emergency-banner" role="alert">
          <div className="emergency-icon">
            <WarningCircle size={28} weight="bold" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
              🚨 MEDICAL EMERGENCY DETECTED
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,200,200,0.9)', lineHeight: 1.5 }}>
              Please call <strong>112</strong> (India Emergency) immediately or go to the nearest hospital.
              Do not wait — get help right now.
            </div>
          </div>
          <button
            className="btn-secondary"
            onClick={() => setEmergencyAlert(false)}
            style={{ marginLeft: '12px', whiteSpace: 'nowrap', borderColor: 'rgba(239,68,68,0.5)', color: '#fca5a5' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Chat Window */}
      <div className="chat-container glass-panel" style={{ flex: 1 }}>
        <div className="chat-window" id="chat-window">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`chat-message ${msg.sender}`}
              style={msg.isEmergency ? { borderColor: 'var(--danger-red)', background: 'rgba(239,68,68,0.08)' } : {}}
            >
              {/* Avatar */}
              <div className={`message-avatar ${msg.isEmergency ? 'avatar-emergency' : ''}`}>
                {msg.sender === 'bot'
                  ? <Robot weight="fill" size={18} />
                  : <User weight="bold" size={18} />}
              </div>

              {/* Bubble */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '100%' }}>
                <div
                  className="message-content"
                  style={{
                    whiteSpace: 'pre-wrap',
                    ...(msg.isEmergency ? { color: '#fca5a5', borderColor: 'var(--danger-red)' } : {}),
                    ...(msg.sender === 'user' ? { background: 'rgba(228,255,0,0.08)', borderColor: 'rgba(228,255,0,0.2)' } : {}),
                  }}
                >
                  {msg.text}
                </div>

                {/* Government scheme badge */}
                {msg.scheme && (
                  <div className="scheme-badge">
                    <ShieldCheck size={14} weight="fill" />
                    <span>{msg.scheme}</span>
                  </div>
                )}

                {/* Health disclaimer */}
                {msg.disclaimer && (
                  <div className="disclaimer-box">
                    <FirstAid size={13} weight="fill" />
                    <span>{msg.disclaimer}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="chat-message bot">
              <div className="message-avatar">
                <Robot weight="fill" size={18} />
              </div>
              <div className="message-content" style={{ padding: '12px 18px' }}>
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          {/* Auto-scroll anchor */}
          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <div className="chat-input-wrapper">
          <div className="chat-input-area">
            {/* File upload */}
            <label style={{ position: 'absolute', left: '14px', cursor: 'pointer', zIndex: 10, margin: 0, display: 'flex', alignItems: 'center' }}>
              <Paperclip weight="bold" size={18} color="var(--text-muted)" />
              <input
                id="file-upload-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </label>

            <input
              ref={inputRef}
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about symptoms, diseases, vaccines, health schemes…"
              style={{ paddingLeft: '44px', paddingRight: '96px' }}
              disabled={isTyping}
            />

            {/* Voice */}
            <button
              id="voice-btn"
              onClick={toggleRecording}
              style={{
                position: 'absolute', right: '52px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: isRecording ? 'var(--danger-red)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center',
                transition: 'color 0.2s',
              }}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              <Microphone weight={isRecording ? 'fill' : 'bold'} size={20} />
            </button>

            {/* Send */}
            <button
              id="send-btn"
              className="btn-primary"
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              style={{ position: 'absolute', right: '8px', padding: '10px', borderRadius: '50%', width: '38px', height: '38px' }}
              title="Send message"
            >
              <PaperPlaneRight weight="bold" size={16} />
            </button>
          </div>

          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
            MedIntel AI · For awareness only · Not a substitute for medical advice
          </div>
        </div>
      </div>
    </div>
  );
}
