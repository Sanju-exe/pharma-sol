import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import GlobalToast from './GlobalToast.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalToast />
    <App />
  </StrictMode>,
)
