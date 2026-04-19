import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'

// Initialize theme before React renders
const savedTheme = (() => {
  try {
    return localStorage.getItem('panicstudio-theme') || 'dark';
  } catch {
    return 'dark';
  }
})();
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
