import React, { useState, useEffect, useRef } from 'react';
import logoTransparent from '../assets/logo_transparent.png';

const SYSTEM_PROMPTS = {
  general: `Você é um assistente de ditado inteligente. Transcreva o áudio corrigindo gagueiras, repetições, erros de concordância e vícios de linguagem. Mantenha o texto limpo, fluido e pontuado de maneira natural. Retorne APENAS o texto corrigido final.`,
  professional: `Você é um redator profissional. Transforme o áudio falado em um e-mail ou mensagem corporativa impecável. Ajuste o tom para formal, corrija pontuação, organize parágrafos e remova gagueiras/expressões informais. Retorne APENAS o texto formatado final.`,
  casual: `Você é um assistente de conversação informal. Ajuste o áudio para uma mensagem amigável e natural do WhatsApp. Remova repetições desnecessárias e gagueiras, mas mantenha a simplicidade e a informalidade natural de uma conversa. Retorne APENAS o texto final.`,
  programming: `Você é um analista de requisitos de software sênior. Transforme o áudio em uma especificação técnica estruturada em Markdown para um programador ou IA programadora.
Formate a saída com as seguintes seções exatamente:
# [Título Sucinto da Demanda]
## Problema
## Objetivo
## Requisitos
## Comportamento Atual vs Comportamento Esperado
## Critérios de Aceite
## Stack & Etapas Sugeridas
Remova qualquer ambiguidade. Retorne APENAS a documentação técnica estruturada final.`,
  prompt: `Você é um engenheiro de prompts especialista. Refine o áudio fornecido em um prompt de IA altamente eficaz, claro, com instruções precisas, contexto e variáveis se necessário. Retorne APENAS o prompt final pronto para ser colado em ferramentas como ChatGPT/Claude/Gemini.`
};

export default function DictaApp() {
  // App States
  const [status, setStatus] = useState('Idle'); // Idle, Recording, Processing, Success, Error
  const [statusText, setStatusText] = useState('Pronto');
  const [mode, setMode] = useState('general');
  const [isExpanded, setIsExpanded] = useState(false); // Capsule hover expansion
  const [showDashboard, setShowDashboard] = useState(false); // Dashboard drawer visibility
  const [activeTab, setActiveTab] = useState('settings'); // settings, history, styles

  // Settings state
  const [provider, setProvider] = useState('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [theme, setTheme] = useState('neon-purple'); // neon-purple, cyber-green, ocean-blue, monochrome

  // History state
  const [historyItems, setHistoryItems] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const expandTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const collapseTimerRef = useRef(null);

  // Refs for active listeners
  const statusRef = useRef(status);
  const modeRef = useRef(mode);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    // Load config from localStorage
    const savedProvider = localStorage.getItem('dictaflow_provider') || 'gemini';
    const savedGeminiKey = localStorage.getItem('dictaflow_gemini_key') || '';
    const savedOpenaiKey = localStorage.getItem('dictaflow_openai_key') || '';
    const savedGroqKey = localStorage.getItem('dictaflow_groq_key') || '';
    const savedDefaultMode = localStorage.getItem('dictaflow_default_mode') || 'general';
    const savedTheme = localStorage.getItem('dictaflow_theme') || 'neon-purple';

    setProvider(savedProvider);
    setGeminiKey(savedGeminiKey);
    setOpenaiKey(savedOpenaiKey);
    setGroqKey(savedGroqKey);
    setMode(savedDefaultMode);
    applyTheme(savedTheme);

    loadHistory();

    // Setup global shortcut listener once
    if (window.api && window.api.onToggleRecord) {
      const unsubscribe = window.api.onToggleRecord(() => {
        const curStatus = statusRef.current;
        if (curStatus === 'Recording') {
          stopRecording();
        } else if (curStatus === 'Idle' || curStatus === 'Error' || curStatus === 'Success') {
          startRecording();
        }
      });
      return unsubscribe;
    }
  }, []);

  const loadHistory = () => {
    try {
      const savedHistory = localStorage.getItem('dictaflow_history') || '[]';
      setHistoryItems(JSON.parse(savedHistory));
    } catch (e) {
      console.error(e);
    }
  };

  const applyTheme = (themeName) => {
    setTheme(themeName);
    localStorage.setItem('dictaflow_theme', themeName);
    
    // Apply CSS variables dynamically to documentElement
    const root = document.documentElement;
    if (themeName === 'neon-purple') {
      root.style.setProperty('--accent-color', '#8b5cf6');
      root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #8b5cf6, #3b82f6)');
    } else if (themeName === 'cyber-green') {
      root.style.setProperty('--accent-color', '#10b981');
      root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #10b981, #06b6d4)');
    } else if (themeName === 'ocean-blue') {
      root.style.setProperty('--accent-color', '#3b82f6');
      root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #3b82f6, #06b6d4)');
    } else if (themeName === 'monochrome') {
      root.style.setProperty('--accent-color', '#e5e7eb');
      root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #f3f4f6, #9ca3af)');
    }
  };

  const handleToggleRecord = () => {
    if (status === 'Recording') {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        processAudio(audioBlob);
      };

      mediaRecorder.start(250);
      setStatus('Recording');
      setStatusText('Gravando...');
    } catch (err) {
      console.error('Error starting recording:', err);
      setStatus('Error');
      setStatusText('Erro Microfone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const processAudio = async (audioBlob) => {
    setStatus('Processing');
    setStatusText('Processando IA...');

    const savedProvider = localStorage.getItem('dictaflow_provider') || 'gemini';
    const savedGeminiKey = localStorage.getItem('dictaflow_gemini_key') || '';
    const savedOpenaiKey = localStorage.getItem('dictaflow_openai_key') || '';
    const savedGroqKey = localStorage.getItem('dictaflow_groq_key') || '';

    const apiKey = savedProvider === 'gemini' ? savedGeminiKey : (savedProvider === 'openai' ? savedOpenaiKey : savedGroqKey);
    const audioType = audioBlob.type || 'audio/webm';

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      try {
        const base64Audio = reader.result.split(',')[1];
        
        const response = await window.api.callAiApi({
          provider: savedProvider,
          apiKey,
          mode: modeRef.current,
          base64Audio,
          audioType: audioType
        });

        if (response.success) {
          handleDelivery(response.text);
        } else {
          handleError(response.error || 'Erro desconhecido');
        }
      } catch (err) {
        handleError(err.message);
      }
    };
  };

  const handleDelivery = (text) => {
    if (!text || !text.trim()) {
      handleError('Áudio sem texto.');
      return;
    }

    setStatus('Success');
    setStatusText('Copiado!');

    // Save to history in localStorage
    try {
      const historyStr = localStorage.getItem('dictaflow_history') || '[]';
      const history = JSON.parse(historyStr);
      history.unshift({
        id: Date.now(),
        text: text,
        mode: modeRef.current,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });
      const updatedHistory = history.slice(0, 50);
      localStorage.setItem('dictaflow_history', JSON.stringify(updatedHistory));
      setHistoryItems(updatedHistory);
    } catch (e) {
      console.error('Failed to save history', e);
    }

    if (window.api && window.api.pasteText) {
      window.api.pasteText(text);
    }

    setTimeout(() => {
      setStatus('Idle');
      setStatusText('Pronto');
    }, 2000);
  };

  const handleError = (msg) => {
    console.error('API Error:', msg);
    setStatus('Error');
    setStatusText(msg.length > 18 ? msg.slice(0, 15) + '...' : msg);
    alert(`Erro no Ditado:\n${msg}`);
    setTimeout(() => {
      setStatus('Idle');
      setStatusText('Pronto');
    }, 4000);
  };

  // Safe hover handlers with 1.5s delay before visual expansion
  const handleMouseEnter = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    
    // Enable mouse events/clicks instantly when mouse moves over the window
    if (window.api && window.api.setIgnoreMouseEvents) {
      window.api.setIgnoreMouseEvents(false);
    }

    // Set delay of 1.5 seconds (1500ms) before expanding the capsule visually
    expandTimerRef.current = setTimeout(() => {
      setIsExpanded(true);
    }, 1500);
  };

  const handleMouseLeave = () => {
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }

    // If recording, processing, or dashboard is open, do not collapse or ignore mouse events
    if (status !== 'Idle' || showDashboard) return;

    collapseTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
      if (window.api && window.api.setIgnoreMouseEvents) {
        window.api.setIgnoreMouseEvents(true, { forward: true });
      }
    }, 400);
  };

  // Toggle Dashboard drawer inside the single window
  const toggleDashboard = () => {
    const nextState = !showDashboard;
    setShowDashboard(nextState);
    
    // Toggle Window Size in Electron Main Process
    if (window.api && window.api.resizeWindow) {
      if (nextState) {
        // Expand height to 460px
        window.api.resizeWindow(380, 460);
      } else {
        // Shrink height back to 70px
        window.api.resizeWindow(380, 70);
      }
    }
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const saveSettings = () => {
    localStorage.setItem('dictaflow_provider', provider);
    localStorage.setItem('dictaflow_gemini_key', geminiKey);
    localStorage.setItem('dictaflow_openai_key', openaiKey);
    localStorage.setItem('dictaflow_groq_key', groqKey);
    localStorage.setItem('dictaflow_default_mode', mode);

    triggerToast('Configurações salvas!');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    triggerToast('Copiado!');
  };

  const pasteHistoryItem = (text) => {
    if (window.api && window.api.pasteText) {
      window.api.pasteText(text);
      triggerToast('Injetado!');
    }
  };

  const clearHistory = () => {
    if (window.confirm('Deseja limpar o histórico?')) {
      localStorage.setItem('dictaflow_history', '[]');
      setHistoryItems([]);
      triggerToast('Histórico limpo!');
    }
  };

  const isBarExpanded = (isExpanded && status !== 'Recording') || 
                        (status !== 'Idle' && status !== 'Recording') || 
                        showDashboard;

  return (
    <div 
      className="main-layout"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Floating Capsule Bar */}
      <div className={`capsule-container ${isBarExpanded ? 'active-status' : ''}`}>
        <button 
          className={`record-btn interactive-element ${status === 'Recording' ? 'recording' : ''}`}
          onClick={handleToggleRecord}
          title="Gravar (Ctrl+Win+Espaço / Ctrl+Alt+D)"
        >
          {status === 'Recording' ? (
            <div className="sound-wave interactive-element">
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </div>
          ) : (
            <svg className="record-icon" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 14H5c0 3.41 2.72 6.23 6 6.72V24h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
          )}
        </button>

        <div className={`status-text ${status === 'Recording' ? 'recording' : ''} ${status === 'Processing' ? 'processing' : ''}`}>
          {statusText}
        </div>

        <select 
          className="mode-selector interactive-element"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            localStorage.setItem('dictaflow_default_mode', e.target.value);
          }}
        >
          <option value="general">Geral</option>
          <option value="professional">E-mail</option>
          <option value="casual">WhatsApp</option>
          <option value="programming">Programação</option>
          <option value="prompt">Prompt IA</option>
        </select>

        {/* Dash/Settings Icon (rotates when active) */}
        <button 
          className={`settings-btn interactive-element ${showDashboard ? 'active-dash' : ''}`}
          onClick={toggleDashboard}
          title="Ver Histórico / Configurações"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Expanded Dashboard Panel */}
      {showDashboard && (
        <div className="dashboard-panel interactive-element">
          <img src={logoTransparent} className="app-logo-header" alt="DictaFlow" />
          
          {/* Dashboard Header Tabs */}
          <div className="tab-navigation">
            <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              IA & Modo
            </button>
            <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              Histórico
            </button>
            <button className={`tab-btn ${activeTab === 'styles' ? 'active' : ''}`} onClick={() => setActiveTab('styles')}>
              Temas
            </button>
          </div>

          {/* Tab Content */}
          <div className="dashboard-content">
            {activeTab === 'settings' && (
              <div className="tab-panel">
                <div className="form-group">
                  <label className="form-label">Provedor</label>
                  <select className="form-select" value={provider} onChange={(e) => setProvider(e.target.value)}>
                    <option value="gemini">Google Gemini API (Direto)</option>
                    <option value="openai">OpenAI (Whisper + GPT)</option>
                    <option value="groq">Groq (Whisper + LLaMA)</option>
                  </select>
                </div>

                {provider === 'gemini' && (
                  <div className="form-group">
                    <label className="form-label">Gemini API Key</label>
                    <input type="password" className="form-input" placeholder="AIzaSy..." value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} />
                  </div>
                )}
                {provider === 'openai' && (
                  <div className="form-group">
                    <label className="form-label">OpenAI API Key</label>
                    <input type="password" className="form-input" placeholder="sk-proj-..." value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} />
                  </div>
                )}
                {provider === 'groq' && (
                  <div className="form-group">
                    <label className="form-label">Groq API Key</label>
                    <input type="password" className="form-input" placeholder="gsk_..." value={groqKey} onChange={(e) => setGroqKey(e.target.value)} />
                  </div>
                )}

                <button className="btn-save" onClick={saveSettings}>Salvar</button>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="tab-panel history-panel">
                <div className="history-header">
                  <span>Ditados recentes</span>
                  {historyItems.length > 0 && <button className="btn-clear-history" onClick={clearHistory}>Limpar</button>}
                </div>
                <div className="history-list">
                  {historyItems.length === 0 ? (
                    <div className="history-empty">Histórico vazio.</div>
                  ) : (
                    historyItems.map((item) => (
                      <div key={item.id} className="history-card">
                        <div className="history-card-header">
                          <span className="history-badge">{item.mode}</span>
                          <span className="history-time">{item.timestamp}</span>
                        </div>
                        <div className="history-card-body">{item.text}</div>
                        <div className="history-card-footer">
                          <button className="btn-card-action" onClick={() => copyToClipboard(item.text)}>Copiar</button>
                          <button className="btn-card-action btn-paste-action" onClick={() => pasteHistoryItem(item.text)}>Colar</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'styles' && (
              <div className="tab-panel styles-panel">
                <label className="form-label">Escolha um Tema Visual</label>
                <div className="theme-grid">
                  <button className={`theme-card ${theme === 'neon-purple' ? 'selected' : ''}`} onClick={() => applyTheme('neon-purple')}>
                    <div className="theme-preview purple-gradient"></div>
                    <span>Neon Violet</span>
                  </button>
                  <button className={`theme-card ${theme === 'cyber-green' ? 'selected' : ''}`} onClick={() => applyTheme('cyber-green')}>
                    <div className="theme-preview green-gradient"></div>
                    <span>Emerald Cyber</span>
                  </button>
                  <button className={`theme-card ${theme === 'ocean-blue' ? 'selected' : ''}`} onClick={() => applyTheme('ocean-blue')}>
                    <div className="theme-preview blue-gradient"></div>
                    <span>Ocean Blue</span>
                  </button>
                  <button className={`theme-card ${theme === 'monochrome' ? 'selected' : ''}`} onClick={() => applyTheme('monochrome')}>
                    <div className="theme-preview mono-gradient"></div>
                    <span>Monochrome</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showToast && <div className="toast">{toastMessage}</div>}
    </div>
  );
}
