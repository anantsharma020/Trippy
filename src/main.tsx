import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// Auto-update the installed app: poll for a new build every minute and, when one
// lands, activate it and reload — so the home-screen app refreshes itself
// instead of needing to be removed and re-added.
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (reg) setInterval(() => reg.update().catch(() => {}), 60 * 1000)
  },
  onNeedRefresh() { updateSW(true) },
})

// Leaflet's default marker icons are broken under bundlers; we use custom
// DivIcons everywhere, but set this so any default markers still render.
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
// @ts-expect-error leaflet internal
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, shadowUrl: markerShadow })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
