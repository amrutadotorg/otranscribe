/**
 * TranscribeView.tsx — Main transcription workspace
 *
 * Manages:
 * - TopBar (player + format toolbar)
 * - TextPanel (TipTap editor)
 * - SettingsPanel, BackupPanel (slide-in)
 * - Global keyboard shortcuts
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppView } from '../App';
import type { AppSettings } from '../types/settings';
import type { ActiveFormat } from '../modules/editor/Editor';
import TopBar from './TopBar';
import TextPanel from './TextPanel';
import SettingsPanel from './SettingsPanel';
import BackupPanel from './BackupPanel';
import HelpPanel from './HelpPanel';
import { usePlayer } from '../modules/audio-engine/PlayerContext';
import { saveBackup, startPeriodicBackup, stopPeriodicBackup } from '../modules/storage/backupManager';
import type { MediaDetails, OtrDocument } from '../types/otr';
import {
  exportToMarkdown,
  exportToPlainText,
  exportToOtr,
  downloadFile,
  generateFilename,
} from '../modules/file-io/exportFormats';
import { useTranslation } from '../modules/shell/i18n/I18nContext';

interface Props {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  onNavigate: (view: AppView) => void;
  pendingOtrDoc?: OtrDocument | null;
  onOtrConsumed?: () => void;
}

export default function TranscribeView({ settings, updateSettings, resetSettings, onNavigate, pendingOtrDoc, onOtrConsumed }: Props) {
  const { t } = useTranslation();
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [backupPanelOpen, setBackupPanelOpen] = useState(false);
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [editorHtml, setEditorHtml] = useState('');
  const [initialHtml, setInitialHtml] = useState('');
  const [activeFormats, setActiveFormats] = useState<Set<ActiveFormat>>(new Set());
  const { playerState, play, pause, skip, skipTo, speedUp, speedDown } = usePlayer();
  const editorHtmlRef = useRef('');
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // True when driver renders a visible video (not pure audio)
  const isVideoDriver =
    playerState.driverType === 'YOUTUBE' ||
    playerState.driverType === 'HTML5_VIDEO';

  // Export disabled when editor is empty (only whitespace / empty paragraph)
  const isExportDisabled = !editorHtml || editorHtml.replace(/<[^>]*>/g, '').trim() === '';

  useEffect(() => { editorHtmlRef.current = editorHtml; }, [editorHtml]);

  // Consume a pending OTR document once editor mounts
  useEffect(() => {
    if (!pendingOtrDoc) return;
    setInitialHtml(pendingOtrDoc.html);
    onOtrConsumed?.();
  }, [pendingOtrDoc, onOtrConsumed]);

  // Restore editor focus after player loads (flushSync in loadDriver steals focus)
  const wasReady = useRef(false);
  useEffect(() => {
    if (playerState.isReady && !wasReady.current) {
      wasReady.current = true;
      // Small delay to let the DOM settle after flushSync layout changes
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('editor:focus'));
      }, 50);
    }
    if (!playerState.isReady) {
      wasReady.current = false;
    }
  }, [playerState.isReady]);

  // Close export menu on outside click
  useEffect(() => {
    if (!exportMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
        // Refocus editor when menu dismissed by clicking outside
        setTimeout(() => document.dispatchEvent(new CustomEvent('editor:focus')), 0);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportMenuOpen]);

  /** Refocus the editor after any panel or menu closes */
  const refocusEditor = useCallback(() => {
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('editor:focus'));
    }, 0);
  }, []);

  // Close side panels on outside click
  useEffect(() => {
    if (!settingsPanelOpen && !backupPanelOpen && !helpPanelOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      // Ignore clicks inside the panel itself or on the topbar actions that toggle the panels
      if (target.closest('.side-panel') || target.closest('.topbar-actions')) return;
      
      if (settingsPanelOpen) setSettingsPanelOpen(false);
      if (backupPanelOpen) setBackupPanelOpen(false);
      if (helpPanelOpen) setHelpPanelOpen(false);
      
      refocusEditor();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [settingsPanelOpen, backupPanelOpen, helpPanelOpen, refocusEditor]);

  const handleExport = useCallback((format: 'txt' | 'md' | 'otr') => {
    setExportMenuOpen(false);
    refocusEditor();
    const html = editorHtmlRef.current;
    const mediaName = playerState.mediaName;
    const filename = generateFilename(mediaName || undefined, t);
    if (format === 'txt') {
      downloadFile(exportToPlainText(html), `${filename}.txt`, 'text/plain');
    } else if (format === 'md') {
      downloadFile(exportToMarkdown(html), `${filename}.md`, 'text/markdown');
    } else {
      const otrJson = exportToOtr({
        html,
        mediaName,
        mediaSource: '',
        mediaTime: playerState.currentTime,
      });
      downloadFile(otrJson, `${filename}.otr`, 'application/json');
    }
  }, [playerState, refocusEditor]);

  // Global keyboard shortcuts
  const handleGlobalKey = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const { shortcuts } = settings.keyboardShortcuts;

      const matches = (keys: string[], event: KeyboardEvent) =>
        keys.some((k) => {
          const parts = k.split('+');
          const key = parts[parts.length - 1];
          const needsMod = parts.includes('mod');
          const needsShift = parts.includes('shift');
          const needsAlt = parts.includes('alt');
          return (
            event.key.toLowerCase() === key.toLowerCase() &&
            (!needsMod || mod) &&
            (!needsShift || event.shiftKey) &&
            (!needsAlt || event.altKey)
          );
        });

      // Don't steal from inputs
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';
      // Allow Escape from anywhere, others only from non-input context
      const isEscape = e.key === 'Escape';
      if (isInput && !isEscape) return;

      if (matches(shortcuts.playPause, e)) {
        e.preventDefault();
        if (playerState.isPlaying) {
          pause();
        } else {
          play();
        }
      } else if (matches(shortcuts.backwards, e)) {
        e.preventDefault();
        skip('backwards');
      } else if (matches(shortcuts.forwards, e)) {
        e.preventDefault();
        skip('forwards');
      } else if (matches(shortcuts.returnToStart, e)) {
        e.preventDefault();
        skipTo(0);
      } else if (matches(shortcuts.timeSelection, e)) {
        e.preventDefault();
        const input = prompt(t('jump-to-time') + t('dialog-suffix-mm-ss'));
        if (input) {
          const trimmed = input.trim();
          let seconds = 0;
          if (trimmed.includes(':')) {
            const parts = trimmed.split(':').map(Number);
            seconds = parts.length === 3
              ? parts[0] * 3600 + parts[1] * 60 + parts[2]
              : parts[0] * 60 + parts[1];
          } else {
            seconds = parseFloat(trimmed) * 60;
          }
          if (!isNaN(seconds)) skipTo(seconds);
        }
      } else if (matches(shortcuts.speedDown, e)) {
        e.preventDefault();
        speedDown();
      } else if (matches(shortcuts.speedUp, e)) {
        e.preventDefault();
        speedUp();
      } else if (matches(shortcuts.saveBackup, e)) {
        e.preventDefault();
        const mediaDetails: MediaDetails = { name: playerState.mediaName };
        saveBackup(editorHtmlRef.current, mediaDetails, settings.backupsPerFile);
      }
    },
    [settings, playerState, play, pause, skip, skipTo, speedUp, speedDown]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleGlobalKey]);

  // Start/stop periodic backup based on settings
  useEffect(() => {
    startPeriodicBackup(
      () => ({
        html: editorHtmlRef.current,
        mediaDetails: { name: playerState.mediaName },
      }),
      settings.backupIntervalMinutes,
      settings.backupsPerFile,
    );
    return () => stopPeriodicBackup();
  }, [settings.backupIntervalMinutes, settings.backupsPerFile, playerState.mediaName]);

  const handleRestore = useCallback((html: string) => {
    setInitialHtml(html);
  }, []);

  const handleFormat = useCallback((format: ActiveFormat) => {
    document.dispatchEvent(new CustomEvent('editor:format', { detail: { format } }));
  }, []);


  return (
    <div className="transcribe-view">
      <TopBar
        settings={settings}
        activeFormats={activeFormats}
        onFormat={handleFormat}
        onOpenSettings={() => { setBackupPanelOpen(false); setHelpPanelOpen(false); setSettingsPanelOpen(true); }}
        onOpenBackup={() => { setSettingsPanelOpen(false); setHelpPanelOpen(false); setBackupPanelOpen(true); }}
        onOpenHelp={() => { setSettingsPanelOpen(false); setBackupPanelOpen(false); setHelpPanelOpen(true); }}
        onGoHome={() => onNavigate('start')}
        onExport={() => setExportMenuOpen((o) => !o)}
        exportMenuOpen={exportMenuOpen}
        exportDisabled={isExportDisabled}
        exportMenuRef={exportMenuRef}
        onExportFormat={handleExport}
      />

      <div className="main-area" style={{ display: 'flex', width: '100%', height: '100%' }}>
        {/* Always in DOM so video drivers can appendChild() before playerState updates */}
        <div
          id="media-container"
          style={{
            flexGrow: isVideoDriver ? 1 : 0,
            flexShrink: 0,
            flexBasis: isVideoDriver ? 'auto' : '0',
            width: isVideoDriver ? undefined : 0,
            maxWidth: isVideoDriver ? '38%' : 0,
            overflow: 'hidden',
            backgroundColor: '#000',
          }}
        />
        <div style={{ flexGrow: 1, flexShrink: 1, flexBasis: 'auto', height: '100%', overflow: 'hidden', minWidth: 0 }}>
          <TextPanel
            settings={settings}
            initialHtml={initialHtml}
            onContentChange={setEditorHtml}
            onActiveFormatsChange={setActiveFormats}
            pauseOnTyping={settings.pauseOnTyping}
          />
        </div>
      </div>

      <SettingsPanel
        open={settingsPanelOpen}
        onClose={() => { setSettingsPanelOpen(false); refocusEditor(); }}
        settings={settings}
        onUpdate={updateSettings}
        onReset={resetSettings}
      />

      <BackupPanel
        open={backupPanelOpen}
        onClose={() => { setBackupPanelOpen(false); refocusEditor(); }}
        onRestore={handleRestore}
      />

      <HelpPanel
        open={helpPanelOpen}
        onClose={() => { setHelpPanelOpen(false); refocusEditor(); }}
      />
    </div>
  );
}
