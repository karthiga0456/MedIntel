import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PaperPlaneRight, Robot, User, Microphone, Paperclip,
  WarningCircle, Globe, Trash, ShieldCheck, FirstAid, Lightning,
} from '@phosphor-icons/react';
import { api } from '../services/api';

// ── Session user ID ───────────────────────────────────────────────────────────
function getOrCreateUserId() {
  const key = 'medintel_user_id';
  let id = localStorage.getItem(key);
  if (!id) { id = 'user-' + Math.random().toString(36).slice(2, 10); localStorage.setItem(key, id); }
  return id;
}

// ── Simple markdown renderer ──────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:12px;">$1</code>')
    .replace(/^### (.*?)$/gm, '<h4 style="color:var(--accent-cyan);font-size:15px;font-weight:700;margin:14px 0 8px 0;">$1</h4>')
    .replace(/^## (.*?)$/gm, '<h3 style="color:#e2e8f0;font-size:16px;font-weight:700;margin:14px 0 8px 0;">$1</h3>')
    .replace(/^- (.*?)$/gm, '<div style="display:flex;gap:8px;margin:3px 0;"><span style="color:var(--accent-cyan);margin-top:1px;flex-shrink:0;">•</span><span>$1</span></div>')
    .replace(/^\d+\. (.*?)$/gm, '<div style="display:flex;gap:8px;margin:3px 0;"><span style="color:var(--accent-yellow);flex-shrink:0;font-weight:600;">→</span><span>$1</span></div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

const WELCOME_MSG = {
  text: "Hello! I'm **MedIntel AI** — your public health assistant.\n\nI can help you with:\n- Disease awareness, symptoms & prevention\n- Vaccination schedules and immunisation\n- Indian government health schemes (PM-JAY, ASHA, NHM)\n- Maternal & child health, nutrition\n\nHow can I help you today?",
  sender: 'bot',
};

const EMERGENCY_KEYWORDS = [
  'chest pain', 'heart attack', 'stroke', "can't breathe", 'cannot breathe',
  'difficulty breathing', 'unconscious', 'unresponsive', 'severe bleeding',
  'allergic reaction', 'anaphylaxis', 'seizure', 'convulsion',
];

const QUICK_QUESTIONS = [
  'What are symptoms of dengue fever?',
  'Tell me about Ayushman Bharat PM-JAY',
  'Vaccination schedule for children',
  'How to prevent malaria?',
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return;

    const currentInput = input.trim();
    setMessages(prev => [...prev, { text: currentInput, sender: 'user' }]);
    setInput('');
    setIsTyping(true);

    const lower = currentInput.toLowerCase();
    const isEmergency = EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));

    if (isEmergency) {
      setIsTyping(false);
      setEmergencyAlert(true);
      setMessages(prev => [...prev, {
        text: '🚨 **MEDICAL EMERGENCY DETECTED**\n\nPlease call **112** (India Emergency) or go to your nearest hospital immediately.\n\nDo NOT wait — ask someone nearby for help right now.',
        sender: 'bot',
        isEmergency: true,
      }]);
      return;
    }

    try {
      const data = await api.assistant.chat(currentInput, language, userId);
      setMessages(prev => [...prev, {
        text:    data.reply || 'No response received.',
        sender:  'bot',
        scheme:  data.matched_scheme || null,
        disclaimer: data.disclaimer || null,
        provider: data.provider || null,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        text: '⚠️ Could not reach the AI service. Please check your internet connection and try again.\n\nFor urgent health queries, visit your nearest Primary Health Centre (PHC) or call **112**.',
        sender: 'bot',
        isError: true,
      }]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }, [input, isTyping, language, userId]);

  // ── Clear chat ────────────────────────────────────────────────────────────
  const handleClearHistory = async () => {
    try { await api.assistant.clearHistory(userId); } catch { /* ignore */ }
    setMessages([WELCOME_MSG]);
    setEmergencyAlert(false);
  };

  // ── Voice recording ───────────────────────────────────────────────────────
  const toggleRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Voice input not supported. Use Chrome or Edge.'); return; }
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); return; }
    const rec = new SpeechRecognition();
    recognitionRef.current = rec;
    rec.lang = language === 'en' ? 'en-IN' : `${language}-IN`;
    rec.interimResults = false;
    rec.onstart = () => setIsRecording(true);
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend   = () => setIsRecording(false);
    rec.start();
  };

  const handleFileUpload = (e) => {
    if (e.target.files?.length) {
      setInput(`Please explain the medical findings from: ${e.target.files[0].name}`);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="module-view" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <header className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lightning size={24} color="var(--accent-yellow)" weight="fill" />
            AI Medical Assistant
          </h2>
          <p className="subtitle">Powered by Groq → Ollama fallback · Multilingual · Health Scheme Aware</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="control-pill">
            <Globe weight="bold" size={16} color="var(--text-secondary)" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', cursor: 'pointer', fontSize: '13px' }}
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
          <button id="clear-chat-btn" onClick={handleClearHistory} className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <Trash size={16} /> New Chat
          </button>
        </div>
      </header>

      {/* Emergency Banner */}
      {emergencyAlert && (
        <div className="emergency-banner" role="alert" style={{ marginBottom: '12px' }}>
          <div className="emergency-icon"><WarningCircle size={28} weight="bold" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>🚨 MEDICAL EMERGENCY DETECTED</div>
            <div style={{ fontSize: '14px', color: 'rgba(255,200,200,0.9)', lineHeight: 1.5 }}>
              Call <strong>112</strong> immediately or go to the nearest hospital. Do not wait.
            </div>
          </div>
          <button className="btn-secondary" onClick={() => setEmergencyAlert(false)}
            style={{ marginLeft: '12px', borderColor: 'rgba(239,68,68,0.5)', color: '#fca5a5' }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Chat Window */}
      <div className="chat-container glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="chat-window" id="chat-window" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

          {/* Quick question chips — shown only on fresh chat */}
          {messages.length === 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', justifyContent: 'center' }}>
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 0); }}
                  style={{
                    padding: '7px 14px', borderRadius: '20px', fontSize: '12px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                    color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; e.currentTarget.style.color = 'var(--accent-cyan)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.sender}`}
              style={{ marginBottom: '16px', ...(msg.isEmergency ? { borderColor: 'var(--danger-red)', background: 'rgba(239,68,68,0.08)' } : {}) }}>
              <div className={`message-avatar ${msg.isEmergency ? 'avatar-emergency' : ''}`}>
                {msg.sender === 'bot' ? <Robot weight="fill" size={18} /> : <User weight="bold" size={18} />}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '100%', minWidth: 0 }}>
                {/* Message bubble */}
                <div
                  className="message-content"
                  style={{
                    lineHeight: '1.7',
                    ...(msg.isEmergency ? { color: '#fca5a5', borderColor: 'var(--danger-red)' } : {}),
                    ...(msg.isError ? { color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)' } : {}),
                    ...(msg.sender === 'user' ? { background: 'rgba(228,255,0,0.08)', borderColor: 'rgba(228,255,0,0.2)' } : {}),
                  }}
                >
                  {msg.sender === 'bot'
                    ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
                    : <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                  }
                </div>

                {/* Provider badge */}
                {msg.provider && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Lightning size={11} weight="fill" color="var(--accent-yellow)" />
                    via {msg.provider === 'groq' ? 'Groq Cloud' : msg.provider === 'ollama' ? 'Ollama (local)' : 'Offline Engine'}
                  </div>
                )}

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
            <div className="chat-message bot" style={{ marginBottom: '16px' }}>
              <div className="message-avatar"><Robot weight="fill" size={18} /></div>
              <div className="message-content" style={{ padding: '14px 18px' }}>
                <div className="typing-indicator">
                  <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <div className="chat-input-wrapper">
          <div className="chat-input-area">
            <label style={{ position: 'absolute', left: '14px', cursor: 'pointer', zIndex: 10, margin: 0, display: 'flex', alignItems: 'center' }}>
              <Paperclip weight="bold" size={18} color="var(--text-muted)" />
              <input id="file-upload-input" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleFileUpload} />
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

            <button id="voice-btn" onClick={toggleRecording}
              style={{
                position: 'absolute', right: '52px', background: 'transparent', border: 'none', cursor: 'pointer',
                color: isRecording ? 'var(--danger-red)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'color 0.2s',
              }}
              title={isRecording ? 'Stop recording' : 'Start voice input'}>
              <Microphone weight={isRecording ? 'fill' : 'bold'} size={20} />
            </button>

            <button id="send-btn" className="btn-primary" onClick={handleSend}
              disabled={isTyping || !input.trim()}
              style={{ position: 'absolute', right: '8px', padding: '10px', borderRadius: '50%', width: '38px', height: '38px' }}>
              <PaperPlaneRight weight="bold" size={16} />
            </button>
          </div>

          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Lightning size={11} weight="fill" color="var(--accent-yellow)" />
            MedIntel AI · Groq → Ollama fallback · For awareness only · Not a substitute for medical advice
          </div>
        </div>
      </div>
    </div>
  );
}
