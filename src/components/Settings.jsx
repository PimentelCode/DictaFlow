import React, { useState, useEffect } from 'react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' or 'history'
  const [provider, setProvider] = useState('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [defaultMode, setDefaultMode] = useState('general');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [historyItems, setHistoryItems] = useState([]);

  useEffect(() => {
    // Load config from localStorage
    const savedProvider = localStorage.getItem('dictaflow_provider') || 'gemini';
    const savedGeminiKey = localStorage.getItem('dictaflow_gemini_key') || '';
    const savedOpenaiKey = localStorage.getItem('dictaflow_openai_key') || '';
    const savedGroqKey = localStorage.getItem('dictaflow_groq_key') || '';
    const savedDefaultMode = localStorage.getItem('dictaflow_default_mode') || 'general';

    setProvider(savedProvider);
    setGeminiKey(savedGeminiKey);
    setOpenaiKey(savedOpenaiKey);
    setGroqKey(savedGroqKey);
    setDefaultMode(savedDefaultMode);

    // Load history
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const savedHistory = localStorage.getItem('dictaflow_history') || '[]';
      setHistoryItems(JSON.parse(savedHistory));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = () => {
    localStorage.setItem('dictaflow_provider', provider);
    localStorage.setItem('dictaflow_gemini_key', geminiKey);
    localStorage.setItem('dictaflow_openai_key', openaiKey);
    localStorage.setItem('dictaflow_groq_key', groqKey);
    localStorage.setItem('dictaflow_default_mode', defaultMode);

    triggerToast('Configurações salvas!');
    setTimeout(() => {
      if (window.api && window.api.closeSettings) {
        window.api.closeSettings();
      }
    }, 1200);
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    triggerToast('Copiado para a área de transferência!');
  };

  const pasteHistoryItem = (text) => {
    if (window.api && window.api.pasteText) {
      window.api.pasteText(text);
      triggerToast('Injetado no campo ativo!');
    }
  };

  const clearHistory = () => {
    if (window.confirm('Tem certeza que deseja apagar todo o histórico?')) {
      localStorage.setItem('dictaflow_history', '[]');
      setHistoryItems([]);
      triggerToast('Histórico limpo!');
    }
  };

  return (
    <div className="settings-container interactive-element">
      <div className="settings-header">DictaFlow</div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Configurações
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => {
            loadHistory();
            setActiveTab('history');
          }}
        >
          Histórico
        </button>
      </div>

      {activeTab === 'settings' ? (
        <div className="tab-content">
          <div className="form-group">
            <label className="form-label">Provedor de IA Padrão</label>
            <select 
              className="form-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="gemini">Google Gemini API (Recomendado - Áudio Direto)</option>
              <option value="openai">OpenAI (Whisper + GPT)</option>
              <option value="groq">Groq (Whisper LLaMA-Fast)</option>
            </select>
          </div>

          {provider === 'gemini' && (
            <div className="form-group">
              <label className="form-label">Gemini API Key</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="AIzaSy..." 
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
              />
            </div>
          )}

          {provider === 'openai' && (
            <div className="form-group">
              <label className="form-label">OpenAI API Key</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="sk-proj-..." 
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
            </div>
          )}

          {provider === 'groq' && (
            <div className="form-group">
              <label className="form-label">Groq API Key</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="gsk_..." 
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Modo de Ditado Padrão</label>
            <select 
              className="form-select"
              value={defaultMode}
              onChange={(e) => setDefaultMode(e.target.value)}
            >
              <option value="general">Geral / Correção Padrão</option>
              <option value="professional">E-mail / Profissional</option>
              <option value="casual">WhatsApp / Casual</option>
              <option value="programming">Modo Programação (Técnico)</option>
              <option value="prompt">Modo Prompt IA</option>
            </select>
          </div>

          <div className="shortcut-info">
            <strong>Atalhos Globais de Gravação:</strong>
            <ul>
              <li><code>Ctrl + Win + Space</code> (Recomendado)</li>
              <li><code>Ctrl + Alt + D</code> (Alternativo)</li>
            </ul>
            <p>Pressione qualquer um dos atalhos para iniciar a gravação, e pressione novamente para enviar para a IA e colar automaticamente.</p>
          </div>

          <button className="btn-save" onClick={handleSave}>
            Salvar Configurações
          </button>
        </div>
      ) : (
        <div className="tab-content history-tab">
          <div className="history-header">
            <span>Últimos Textos Ditados</span>
            {historyItems.length > 0 && (
              <button className="btn-clear-history" onClick={clearHistory}>
                Limpar Tudo
              </button>
            )}
          </div>

          <div className="history-list">
            {historyItems.length === 0 ? (
              <div className="history-empty">Nenhum texto no histórico ainda.</div>
            ) : (
              historyItems.map((item) => (
                <div key={item.id} className="history-card">
                  <div className="history-card-header">
                    <span className="history-badge">{item.mode.toUpperCase()}</span>
                    <span className="history-time">{item.timestamp}</span>
                  </div>
                  <div className="history-card-body">
                    {item.text}
                  </div>
                  <div className="history-card-footer">
                    <button className="btn-card-action" onClick={() => copyToClipboard(item.text)}>
                      Copiar
                    </button>
                    <button className="btn-card-action btn-paste-action" onClick={() => pasteHistoryItem(item.text)}>
                      Injetar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showToast && <div className="toast">{toastMessage}</div>}
    </div>
  );
}
