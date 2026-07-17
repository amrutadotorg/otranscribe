/**
 * FormatToolbar.tsx — Bold/Italic/Underline toolbar for editor
 *
 * Rendered inside the TopBar between player controls and actions.
 * Uses TipTap editor instance via a ref passed from Editor.tsx.
 *
 * Since TipTap's `useEditor` lives inside Editor.tsx, we use a
 * custom DOM event approach: editor dispatches format-toggle events
 * which are handled by the editor itself.
 */

import { IconBold, IconItalic, IconUnderline } from '@tabler/icons-react';
import { useTranslation } from '../modules/shell/i18n/I18nContext';
import Tooltip from './Tooltip';

interface Props {
  /** Called when a format button is clicked */
  onFormat: (format: 'bold' | 'italic' | 'underline') => void;
  /** Current active formats */
  activeFormats: Set<'bold' | 'italic' | 'underline'>;
}

export default function FormatToolbar({ onFormat, activeFormats }: Props) {
  const { t } = useTranslation();

  const formatBtns: Array<{
    format: 'bold' | 'italic' | 'underline';
    icon: React.ReactNode;
    titleKey: string;
    shortcut: string;
  }> = [
    {
      format: 'bold',
      icon: <IconBold size={18} />,
      titleKey: 'title-bold',
      shortcut: 'Mod+B',
    },
    {
      format: 'italic',
      icon: <IconItalic size={18} />,
      titleKey: 'title-italic',
      shortcut: 'Mod+I',
    },
    {
      format: 'underline',
      icon: <IconUnderline size={18} />,
      titleKey: 'title-underline',
      shortcut: 'Mod+U',
    },
  ];

  return (
    <div
      className="format-toolbar"
      role="toolbar"
      aria-label={t('aria-format-toolbar')}
      id="format-toolbar"
    >
      {formatBtns.map(({ format, icon, titleKey, shortcut }) => {
        const titleText = t(titleKey);
        return (
          <Tooltip key={format} content={`${titleText} (${shortcut})`}>
            <button
              className={`format-btn ${activeFormats.has(format) ? 'active' : ''}`}
              onClick={() => onFormat(format)}
              aria-label={titleText}
              aria-pressed={activeFormats.has(format)}
              id={`format-btn-${format}`}
            >
              {icon}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
