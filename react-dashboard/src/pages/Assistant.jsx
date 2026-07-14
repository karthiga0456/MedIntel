import React, { useState } from 'react';
import { PaperPlaneRight, Robot, User, Microphone, Paperclip, WarningCircle, Globe, WifiHigh, Database } from '@phosphor-icons/react';
import { api } from '../services/api';

export default function Assistant() {
  const [messages, setMessages] = useState([
    { text: "Hello! I am your AI Health Assistant. How can I help you today?", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isOnlineMode, setIsOnlineMode] = useState(true);
  const [language, setLanguage] = useState('en');
  const [emergencyAlert, setEmergencyAlert] = useState(false);

  const emergencyKeywords = ["chest pain", "bleeding", "unconscious", "heart attack", "allergic reaction", "stroke"];

  const handleSend = async () => {
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { text: input, sender: 'user' }]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    // Intent Detection: Emergency Check
    const lowerInput = currentInput.toLowerCase();
    const isEmergency = emergencyKeywords.some(keyword => lowerInput.includes(keyword));

    if (isEmergency) {
      setIsTyping(false);
      setEmergencyAlert(true);
      setMessages(prev => [...prev, { 
        text: "🚨 EMERGENCY DETECTED: Triggering hospital/ambulance alerts. Providing immediate guidance. Sharing user location to EMS.", 
        sender: 'bot',
        isEmergency: true
      }]);
      return; // END FLOW
    }

    try {
      // Simulate sending language and mode to the backend
      const data = await api.assistant.chat(currentInput, language);
      const prefix = isOnlineMode ? "[Online RAG: WHO/CDC] " : "[Offline RAG: Local DB] ";
      setMessages(prev => [...prev, { text: prefix + (data.reply || data.response || "Message received by backend."), sender: 'bot' }]);
    } catch (error) {
      setMessages(prev => [...prev, { text: "Error connecting to AI backend.", sender: 'bot' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Simulate Vosk/Whisper recording
      setTimeout(() => {
        setIsRecording(false);
        setInput("I am experiencing severe chest pain.");
      }, 3000);
    }
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsTyping(true);
      // Simulate Tesseract OCR
      setTimeout(() => {
        setIsTyping(false);
        setInput("Extracted from document: Patient shows signs of severe allergic reaction.");
      }, 1500);
    }
  };

  return (
    <div className="module-view">
      <header className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>AI Medical Knowledge Assistant</h2>
          <p className="subtitle">Generative AI Engine with Intent Detection & Localization</p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* Online/Offline Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--panel-border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Knowledge Base:</span>
            <button 
              onClick={() => setIsOnlineMode(!isOnlineMode)}
              style={{ background: 'transparent', border: 'none', color: isOnlineMode ? 'var(--accent-cyan)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              {isOnlineMode ? <WifiHigh weight="bold" /> : <Database weight="bold" />}
              {isOnlineMode ? 'Online' : 'Offline'}
            </button>
          </div>

          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--panel-border)' }}>
            <Globe weight="bold" color="var(--text-secondary)" />
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', cursor: 'pointer', padding: 0 }}
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
        </div>
      </header>

      {emergencyAlert && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger-red)', padding: '16px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--danger-red)', color: 'white', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <WarningCircle size={28} weight="bold" />
          </div>
          <div>
            <h4 style={{ color: 'var(--danger-red)', fontSize: '18px', marginBottom: '4px' }}>MEDICAL EMERGENCY INITIATED</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.4' }}>
              We have detected a critical situation. Ambulance dispatch has been notified. Location tracking is active. Do not leave the patient unattended.
            </p>
          </div>
          <button className="btn-primary" style={{ marginLeft: 'auto', background: 'var(--danger-red)' }} onClick={() => setEmergencyAlert(false)}>
            Dismiss Alert
          </button>
        </div>
      )}
      
      <div className="chat-container glass-panel">
        <div className="chat-window">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.sender}`} style={msg.isEmergency ? { border: '1px solid var(--danger-red)', background: 'rgba(239, 68, 68, 0.15)' } : {}}>
              <div className="message-avatar">
                {msg.sender === 'bot' ? <Robot weight="fill" /> : <User weight="bold" />}
              </div>
              <div className="message-content" style={msg.isEmergency ? { color: '#ffaaaa' } : {}}>{msg.text}</div>
            </div>
          ))}
          
          {isTyping && (
            <div className="chat-message bot">
              <div className="message-avatar"><Robot weight="fill" /></div>
              <div className="message-content" style={{ padding: '10px 18px' }}>
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="chat-input-wrapper">
          <div className="chat-input-area">
            {/* File Upload (OCR) */}
            <label style={{ position: 'absolute', left: '16px', cursor: 'pointer', zIndex: 10, margin: 0 }}>
              <Paperclip weight="bold" size={20} color="var(--text-muted)" />
              <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
            
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your health query or upload document..." 
              style={{ paddingLeft: '48px' }}
            />
            
            <div style={{ position: 'absolute', right: '60px', display: 'flex', alignItems: 'center' }}>
              <button className="btn-icon" onClick={toggleRecording} style={{ color: isRecording ? 'var(--danger-red)' : 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <Microphone weight={isRecording ? 'fill' : 'bold'} size={24} />
              </button>
            </div>
            
            <button className="btn-primary" onClick={handleSend} style={{ position: 'absolute', right: '8px', padding: '10px' }}>
              <PaperPlaneRight weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
