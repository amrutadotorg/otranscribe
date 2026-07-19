/**
 * SettingsPanel.tsx — Settings slide-in panel
 *
 * Sections:
 * - Appearance (theme)
 * - Timestamps (offset, milliseconds)
 * - Backup (interval, max per file)
 * - Editor (pause on typing)
 * - Keyboard shortcuts (list with edit capability)
 */

import type { AppSettings } from '../types/settings';
import { IconX } from '@tabler/icons-react';
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
    <div className="settings-row">
      <span className="settings-row-label">{label}</span>
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
    <div className="settings-section">
      <h3 className="settings-section-title">{title}</h3>
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
          <IconX size={18} />
        </button>
      </div>

      <div className="side-panel-body">
        {/* Appearance */}
        <Section title={t('theme')}>
          <LabelRow label={t('language')}>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="settings-select medium"
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
              className="settings-select"
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
              className="settings-checkbox"
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
                className="settings-input medium"
              />
            </Tooltip>
          </LabelRow>
        </Section>

        {/* Backup */}
        <Section title={t('backup-settings-title')}>
          <LabelRow label={t('backup-interval')}>
            <span className="settings-input-group">
              <input
                type="number"
                min={1}
                max={60}
                value={settings.backupIntervalMinutes}
                onChange={(e) =>
                  onUpdate({ backupIntervalMinutes: Number(e.target.value) })
                }
                id="setting-backup-interval"
                className="settings-input small"
              />
              <span className="settings-input-suffix">{t('minutes')}</span>
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
              className="settings-input small"
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
                className="settings-checkbox"
              />
            </Tooltip>
          </LabelRow>
          <LabelRow label={t('settings-phonetic-input-enabled')}>
            <input
              type="checkbox"
              checked={settings.phoneticInput.enabled}
              onChange={(e) =>
                onUpdate({
                  phoneticInput: {
                    ...settings.phoneticInput,
                    enabled: e.target.checked,
                  },
                })
              }
              id="setting-phonetic-input-enabled"
              className="settings-checkbox"
            />
          </LabelRow>
          {settings.phoneticInput.enabled && (
            <LabelRow label={t('settings-phonetic-input-lang')}>
              <select
                value={settings.phoneticInput.lang}
                onChange={(e) =>
                  onUpdate({
                    phoneticInput: {
                      ...settings.phoneticInput,
                      lang: e.target.value as TransliterationLang,
                    },
                  })
                }
                id="setting-phonetic-input-lang"
                className="settings-select large"
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
              className="settings-shortcuts-instrux"
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
          className="btn settings-btn-reset"
          onClick={() => {
            if (window.confirm(t('dialog-reset-settings'))) onReset();
          }}
          id="btn-reset-settings"
        >
          {t('restore-shortcuts')}
        </button>

        <div className="settings-shortcuts-footer">
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
