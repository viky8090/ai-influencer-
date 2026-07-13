import {ClerkProvider} from '@clerk/react';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { clerkAppearance } from './ui/clerkAppearance'
import './index.css'
// Astryx: prebuilt component CSS only — skip reset.css (fights Vymotion base).
// Brand tokens come from defineTheme(vymotionTheme) injected by AstryxProvider.
import '@astryxdesign/core/astryx.css'
import './ui/ax/astryx-polish.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider afterSignOutUrl="/" appearance={clerkAppearance}>
      <App />
    </ClerkProvider>
  </React.StrictMode>,
)