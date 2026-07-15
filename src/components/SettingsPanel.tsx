/**
 * SettingsPanel.tsx — Settings slide-in panel
 *
 * Sections:
 * - Appearance (theme)
 * - Timestamps (offset, milliseconds)
 * - Backup (interval, max per file)
 * - Editor (pause on typing)
 * - Keyboard shortcuts (list with edit capability)
 *
 * See PLAN.md Faza 6, Table G
 */

import type { AppSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../modules/settings/defaults';
import { formatShortcutDisplay } from '../modules/platform/detectPlatform';
import Tooltip from './Tooltip';
import ShortcutInput from './ShortcutInput';
import { useTranslation } from '../modules/shell/i18n/I18nContext';
import { TRANSLITERATION_LANGUAGES } from '../modules/editor/transliterationLanguages';
import type { TransliterationLang } from '../modules/editor/transliteration';

interface Props {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
  onReset: () => void;
}

const SHORTCUT_KEYS: Record<string, string> = {
  playPause: 'playPause',
  backwards: 'backwards',
  forwards: 'forwards',
  returnToStart: 'returnToStart',
  timeSelection: 'timeSelection',
  speedDown: 'speedDown',
  speedUp: 'speedUp',
  saveBackup: 'saveBackup',
  insertTimestamp: 'insertTimestamp',
};

function LabelRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-2) 0',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <span style={{ fontSize: 'var(--font-size-sm)' }}>{label}</span>
      {children}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <h3
        style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-2)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function SettingsPanel({
  open,
  onClose,
  settings,
  onUpdate,
  onReset,
}: Props) {
  const { t, tHtml, lang, setLang, availableLanguages } = useTranslation();
  const shortcuts = settings.keyboardShortcuts.shortcuts;

  const updateShortcut = (action: string, value: string[]) => {
    const updatedShortcuts = { ...shortcuts };
    for (const [otherAction, otherKeys] of Object.entries(updatedShortcuts)) {
      if (otherAction === action) continue;
      const filtered = (otherKeys as string[]).filter(
        (k) => !value.includes(k),
      );
      updatedShortcuts[otherAction as keyof typeof updatedShortcuts] =
        filtered as never;
    }
    updatedShortcuts[action as keyof typeof updatedShortcuts] = value as never;
    onUpdate({
      keyboardShortcuts: { shortcuts: updatedShortcuts },
    });
  };

  return (
    <div className={`side-panel ${open ? 'open' : ''}`} id="settings-panel">
      <div className="side-panel-header">
        <h2>{t('settings')}</h2>
        <button
          className="icon-btn"
          onClick={onClose}
          aria-label={t('cancel')}
          id="close-settings-btn"
        >
          ✕
        </button>
      </div>

      <div className="side-panel-body">
        {/* Appearance */}
        <Section title={t('theme')}>
          <LabelRow label={t('language')}>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{
                fontSize: 'var(--font-size-sm)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
                color: 'var(--color-text)',
                maxWidth: 140,
              }}
              id="setting-language"
            >
              {availableLanguages.map((l) => {
                let name = l;
                try {
                  const code = l.replace('_', '-');
                  name =
                    new Intl.DisplayNames([code], { type: 'language' }).of(
                      code,
                    ) || l;
                  // capitalize first letter
                  name = name.charAt(0).toUpperCase() + name.slice(1);
                } catch {
                  /* ignore unsupported codes */
                }
                return (
                  <option key={l} value={l}>
                    {name}
                  </option>
                );
              })}
            </select>
          </LabelRow>
          <LabelRow label={t('theme')}>
            <select
              value={settings.theme}
              onChange={(e) =>
                onUpdate({ theme: e.target.value as AppSettings['theme'] })
              }
              style={{
                fontSize: 'var(--font-size-sm)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
                color: 'var(--color-text)',
              }}
              id="setting-theme"
            >
              <option value="system">{t('theme-system')}</option>
              <option value="light">{t('theme-light')}</option>
              <option value="dark">{t('theme-dark')}</option>
            </select>
          </LabelRow>
        </Section>

        {/* Timestamps */}
        <Section title={t('settings-timestamps')}>
          <LabelRow label={t('timestampMilliseconds')}>
            <input
              type="checkbox"
              checked={settings.timestampMilliseconds}
              onChange={(e) =>
                onUpdate({ timestampMilliseconds: e.target.checked })
              }
              id="setting-timestamp-ms"
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
          </LabelRow>
          <LabelRow label={t('timestampOffset')}>
            <Tooltip content={t('timestampOffsetHint')}>
              <input
                type="text"
                value={settings.timestampOffset}
                onChange={(e) => onUpdate({ timestampOffset: e.target.value })}
                placeholder={t('timestamp-offset-placeholder')}
                id="setting-timestamp-offset"
                style={{
                  width: 80,
                  fontSize: 'var(--font-size-sm)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text)',
                }}
              />
            </Tooltip>
          </LabelRow>
        </Section>

        {/* Backup */}
        <Section title={t('backup-settings-title')}>
          <LabelRow label={t('backup-interval')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                min={1}
                max={60}
                value={settings.backupIntervalMinutes}
                onChange={(e) =>
                  onUpdate({ backupIntervalMinutes: Number(e.target.value) })
                }
                id="setting-backup-interval"
                style={{
                  width: 60,
                  fontSize: 'var(--font-size-sm)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text)',
                }}
              />
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {t('minutes')}
              </span>
            </span>
          </LabelRow>
          <LabelRow label={t('backup-keep')}>
            <input
              type="number"
              min={1}
              max={50}
              value={settings.backupsPerFile}
              onChange={(e) =>
                onUpdate({ backupsPerFile: Number(e.target.value) })
              }
              id="setting-backups-per-file"
              style={{
                width: 60,
                fontSize: 'var(--font-size-sm)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
                color: 'var(--color-text)',
              }}
            />
          </LabelRow>
        </Section>

        {/* Editor */}
        <Section title={t('settings-editor')}>
          <LabelRow label={t('pauseOnTyping')}>
            <Tooltip content={t('pauseOnTypingHint')}>
              <input
                type="checkbox"
                checked={settings.pauseOnTyping}
                onChange={(e) => onUpdate({ pauseOnTyping: e.target.checked })}
                id="setting-pause-on-typing"
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
            </Tooltip>
          </LabelRow>
          <LabelRow label={t('settings-phonetic-input-enabled')}>
            <input
              type="checkbox"
              checked={settings.phoneticInput.enabled}
              onChange={(e) =>
                onUpdate({ phoneticInput: { ...settings.phoneticInput, enabled: e.target.checked } })
              }
              id="setting-phonetic-input-enabled"
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
          </LabelRow>
          {settings.phoneticInput.enabled && (
            <LabelRow label={t('settings-phonetic-input-lang')}>
              <select
                value={settings.phoneticInput.lang}
                onChange={(e) =>
                  onUpdate({
                    phoneticInput: { ...settings.phoneticInput, lang: e.target.value as TransliterationLang },
                  })
                }
                id="setting-phonetic-input-lang"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text)',
                  maxWidth: 160,
                }}
              >
                {TRANSLITERATION_LANGUAGES.map(({ code, i18nKey }) => (
                  <option key={code} value={code}>
                    {t(i18nKey)}
                  </option>
                ))}
              </select>
            </LabelRow>
          )}
        </Section>

        {/* Keyboard shortcuts */}
        <Section title={t('keyboard-shortcuts')}>
          {tHtml('shortcuts-instrux') && (
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--space-2)',
              }}
              dangerouslySetInnerHTML={{ __html: tHtml('shortcuts-instrux')! }}
            />
          )}
          {Object.entries(SHORTCUT_KEYS).map(([action, key]) => (
            <LabelRow key={action} label={t(key)}>
              <ShortcutInput
                value={
                  (shortcuts[action as keyof typeof shortcuts] ??
                    []) as string[]
                }
                onChange={(value) => updateShortcut(action, value)}
                id={`shortcut-${action}`}
              />
            </LabelRow>
          ))}
        </Section>

        {/* Reset */}
        <button
          className="btn"
          style={{
            width: '100%',
            justifyContent: 'center',
            marginTop: 'var(--space-2)',
            color: 'var(--color-danger)',
            borderColor: 'var(--color-danger)',
          }}
          onClick={() => {
            if (window.confirm(t('dialog-reset-settings'))) onReset();
          }}
          id="btn-reset-settings"
        >
          {t('restore-shortcuts')}
        </button>

        <div
          style={{
            marginTop: 'var(--space-3)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
          }}
        >
          {t('settings-default-shortcuts')}
          {Object.values(DEFAULT_SETTINGS.keyboardShortcuts.shortcuts)
            .flat()
            .map(formatShortcutDisplay)
            .join(' · ')}
        </div>
      </div>
    </div>
  );
}
