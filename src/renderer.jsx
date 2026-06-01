import React from 'react';
import { createRoot } from 'react-dom/client';
import DictaApp from './components/DictaApp';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <DictaApp />
    </React.StrictMode>
  );
}
