import React from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './styles/main.css'
import App from './App'
import { SettingsProvider } from './context/SettingsContext'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </React.StrictMode>
)
