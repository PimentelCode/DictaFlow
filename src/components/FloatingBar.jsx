import React, { useState, useEffect, useRef } from 'react';

export default function FloatingBar() {
  const [status, setStatus] = useState('Idle'); // Idle, Recording, Processing, Success, Error
  const [statusText, setStatusText] = useState('Pronto');
  const [mode, setMode] = useState('general');
  const [isExpanded, setIsExpanded] = useState(false);
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
    // Load default mode from settings
    const savedMode = localStorage.getItem('dictaflow_default_mode') || 'general';
    setMode(savedMode);

    // Setup global key event listener once
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

    const provider = localStorage.getItem('dictaflow_provider') || 'gemini';
    const geminiKey = localStorage.getItem('dictaflow_gemini_key') || '';
    const openaiKey = localStorage.getItem('dictaflow_openai_key') || '';
    const groqKey = localStorage.getItem('dictaflow_groq_key') || '';

    const apiKey = provider === 'gemini' ? geminiKey : (provider === 'openai' ? openaiKey : groqKey);
    const audioType = audioBlob.type || 'audio/webm';

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      try {
        const base64Audio = reader.result.split(',')[1];
        
        const response = await window.api.callAiApi({
          provider,
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

    // 1. Save to history in localStorage
    try {
      const historyStr = localStorage.getItem('dictaflow_history') || '[]';
      const history = JSON.parse(historyStr);
      history.unshift({
        id: Date.now(),
        text: text,
        mode: modeRef.current,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });
      // Limit to last 50 items
      localStorage.setItem('dictaflow_history', JSON.stringify(history.slice(0, 50)));
    } catch (e) {
      console.error('Failed to save history', e);
    }

    // 2. Trigger simulated paste
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
    // Alert the user with the exact error message so they can see why the API failed
    alert(`Erro no Ditado:\n${msg}`);
    setTimeout(() => {
      setStatus('Idle');
      setStatusText('Pronto');
    }, 4000);
  };

  const openSettings = () => {
    if (window.api && window.api.openSettings) {
      window.api.openSettings();
    }
  };

  // Safe hover expand handlers with 400ms collapse delay to prevent accidental collapse (fechando à toa)
  const handleMouseEnter = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    setIsExpanded(true);
    if (window.api && window.api.setIgnoreMouseEvents) {
      window.api.setIgnoreMouseEvents(false);
    }
  };

  const handleMouseLeave = () => {
    // If we are actively recording or processing, do not collapse
    if (status !== 'Idle') return;

    collapseTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
      if (window.api && window.api.setIgnoreMouseEvents) {
        window.api.setIgnoreMouseEvents(true, { forward: true });
      }
    }, 400); // 400ms delay to make it feel robust
  };

  const isBarExpanded = isExpanded || status !== 'Idle';

  return (
    <div 
      className={`capsule-container ${isBarExpanded ? 'active-status' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Record button */}
      <button 
        className={`record-btn interactive-element ${status === 'Recording' ? 'recording' : ''}`}
        onClick={handleToggleRecord}
        title="Gravar (Ctrl+Win+Espaço ou Ctrl+Alt+D)"
      >
        {status === 'Recording' ? (
          <svg className="record-icon" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg className="record-icon" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 14H5c0 3.41 2.72 6.23 6 6.72V24h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
          </svg>
        )}
      </button>

      {/* Status indicator */}
      <div className={`status-text ${status === 'Recording' ? 'recording' : ''} ${status === 'Processing' ? 'processing' : ''}`}>
        {statusText}
      </div>

      {/* Mode selection dropdown */}
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

      {/* Settings icon */}
      <button 
        className="settings-btn interactive-element" 
        onClick={openSettings}
        title="Histórico e Configurações"
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>
  );
}
