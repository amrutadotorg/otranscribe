/**
 * QuickTutorial.tsx — Onboarding overlay shown when editor is empty
 *
 * Displays placeholder text and keyboard shortcut tips.
 * Dismisses on click or when the editor receives content.
 * Platform-aware: shows ⌘ on Mac, Ctrl on other platforms.
 */

import { modKey } from '../modules/platform/detectPlatform';
import { useTranslation } from '../modules/shell/i18n/I18nContext';

interface Props {
  onDismiss: () => void;
}

export default function QuickTutorial({ onDismiss }: Props) {
  const { t } = useTranslation();
  const mod = modKey();

  const placeholder = t('quick-tutorial-placeholder');
  const heading = t('quick-tutorial-heading');
  const italic = t('quick-tutorial-italic', { mod });
  const bold = t('quick-tutorial-bold', { mod });
  const playpause = t('quick-tutorial-playpause');
  const timestamp = t('quick-tutorial-timestamp', { mod });

  return (
    <div
      className="quick-tutorial"
      onClick={onDismiss}
      role="presentation"
    >
      <p className="quick-tutorial-placeholder">{placeholder}</p>
      <div className="quick-tutorial-tips">
        <p className="quick-tutorial-heading">{heading}</p>
        <ul>
          <li>{italic}</li>
          <li>{bold}</li>
          <li>
            {playpause} {timestamp}
          </li>
        </ul>
      </div>
    </div>
  );
}
