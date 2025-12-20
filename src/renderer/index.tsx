import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App';

console.log('React renderer starting...');

// Mount React app
const container = document.getElementById('root');
console.log('Container found:', container);

if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error('Root container not found!');
}