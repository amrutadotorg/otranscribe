/**
 * App.tsx — Root component
 *
 * Manages view routing (StartView / TranscribeView) and theme.
 * Wraps everything in PlayerProvider for global player access.
 */

import { useState, useEffect } from 'react';
import { useSettings } from './modules/settings/useSettings';
import { PlayerProvider } from './modules/audio-engine/PlayerContext';
import { I18nProvider, useTranslation } from './modules/shell/i18n/I18nContext';
import StartView from './components/StartView';
import TranscribeView from './components/TranscribeView';
import NarrowScreenWarning from './components/NarrowScreenWarning';
import { loadAutosave } from './modules/storage/autosave';
import { getVideoUrlParam } from './modules/shell/urlParams';
import type { OtrDocument } from './types/otr';

export type AppView = 'start' | 'transcribe';

function applyTheme(theme: 'light' | 'dark' | 'system'): void {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    root.classList.toggle('dark', prefersDark);
  }
}

function DocumentTitleUpdater() {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = t('app-title');
  }, [t]);
  return null;
}

export default function App() {
  const [view, setView] = useState<AppView>('start');
  const [pendingOtrDoc, setPendingOtrDoc] = useState<OtrDocument | null>(null);
  // Read ?video_url= once on mount (synchronous lazy initializer)
  const [pendingYouTubeUrl, setPendingYouTubeUrl] = useState<string | null>(
    () => getVideoUrlParam(),
  );
  // Read autosave once on mount (synchronous — no flash)
  const [autosaveHtml, setAutosaveHtml] = useState<string | null>(() =>
    loadAutosave(),
  );
  const { settings, updateSettings, resetSettings } = useSettings();

  // Apply theme on mount and change
  useEffect(() => {
    applyTheme(settings.theme);

    if (settings.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        if (settings.theme === 'system') {
          document.documentElement.classList.toggle('dark', e.matches);
        }
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    return undefined;
  }, [settings.theme]);

  const handleNavigate = (nextView: AppView) => {
    setView(nextView);
    // Clear pending OTR when going back to start
    if (nextView === 'start') setPendingOtrDoc(null);
  };

  return (
    <I18nProvider>
      <DocumentTitleUpdater />
      <PlayerProvider>
        <div className="app-layout">
          {view === 'start' ? (
            <StartView
              settings={settings}
              onNavigate={handleNavigate}
              onUpdateSettings={updateSettings}
              autosaveHtml={autosaveHtml}
              onAutosaveDismissed={() => setAutosaveHtml(null)}
              onOtrLoaded={(doc) => {
                setPendingOtrDoc(doc);
                handleNavigate('transcribe');
              }}
              pendingYouTubeUrl={pendingYouTubeUrl}
              onYouTubePendingConsumed={() => setPendingYouTubeUrl(null)}
            />
          ) : (
            <TranscribeView
              settings={settings}
              updateSettings={updateSettings}
              resetSettings={resetSettings}
              onNavigate={handleNavigate}
              pendingOtrDoc={pendingOtrDoc}
              onOtrConsumed={() => setPendingOtrDoc(null)}
            />
          )}
        </div>
        <NarrowScreenWarning />
      </PlayerProvider>
    </I18nProvider>
  );
}
