import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { runMigrationIfNeeded } from './modules/storage/migrateLegacyData.ts'

// Run legacy data migration before React mounts
runMigrationIfNeeded();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
