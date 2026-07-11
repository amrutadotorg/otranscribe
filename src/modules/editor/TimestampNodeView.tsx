/**
 * TimestampNodeView.tsx — React component for timestamp node rendering
 *
 * Renders the clickable timestamp span inside TipTap's NodeView.
 */

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useTranslation } from '../shell/i18n/I18nContext';
import Tooltip from '../../components/Tooltip';

export default function TimestampNodeView({ node, extension }: NodeViewProps) {
  const { t } = useTranslation();
  const seconds = node.attrs.seconds as number;
  const displayText = node.attrs.displayText as string;

  const handleClick = () => {
    const opts = extension.options as { onTimestampClick?: (s: number) => void };
    opts.onTimestampClick?.(seconds);
  };

  return (
    <NodeViewWrapper as="span" className="timestamp-wrapper">
      <Tooltip content={t('title-jump-to', { time: displayText })}>
        <span
          className="timestamp"
          data-timestamp={String(seconds)}
          contentEditable={false}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
        >
          {displayText}
        </span>
      </Tooltip>
    </NodeViewWrapper>
  );
}
