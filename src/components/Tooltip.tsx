import { cloneElement, isValidElement, useRef } from 'react';
import type { ReactElement } from 'react';
import {
  useFloating,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  offset,
  flip,
  shift,
  arrow,
  FloatingArrow,
  autoUpdate,
} from '@floating-ui/react';
import { useState } from 'react';

interface TooltipProps {
  /** Tekst tooltipa — jeśli pusty/falsy, tooltip się nie renderuje (np. warunkowy title) */
  content: string;
  children: ReactElement;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export default function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 300,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 }),
      arrow({ element: arrowRef }),
    ],
  });

  const hover = useHover(context, {
    delay: { open: delay, close: 0 },
    move: false,
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  if (!isValidElement(children)) return children;

  // Brak treści -> nie renderujemy w ogóle (odpowiednik title="" w oryginale)
  if (!content) return children;

  const childProps = children.props as Record<string, unknown>;
  const isDisabled = Boolean(childProps.disabled);

  // EDGE CASE: disabled buttons nie odpalają pointer/focus eventów w przeglądarce,
  // więc useHover na samym <button disabled> nigdy się nie uruchomi.
  // Rozwiązanie: owijamy w <span>, referencję i propsy dajemy na span,
  // a dziecku wyłączamy pointer-events (i tak jest disabled, więc klik nic nie robi).
  if (isDisabled) {
    const disabledChild = cloneElement(children, {
      style: { ...(childProps.style as object), pointerEvents: 'none' },
    } as any);

    return (
      <>
        <span
          ref={refs.setReference}
          style={{ display: 'inline-flex' }}
          {...getReferenceProps()}
        >
          {disabledChild}
        </span>
        {isOpen && (
          <TooltipBubble
            floatingRef={refs.setFloating}
            floatingStyles={floatingStyles}
            floatingProps={getFloatingProps()}
            context={context}
            arrowRef={arrowRef}
            content={content}
          />
        )}
      </>
    );
  }

  const child = cloneElement(children, {
    ref: refs.setReference,
    ...getReferenceProps(childProps),
  } as any);

  return (
    <>
      {child}
      {isOpen && (
        <TooltipBubble
          floatingRef={refs.setFloating}
          floatingStyles={floatingStyles}
          floatingProps={getFloatingProps()}
          context={context}
          arrowRef={arrowRef}
          content={content}
        />
      )}
    </>
  );
}

// Wydzielony bubble, żeby nie duplikować JSX w dwóch gałęziach powyżej
function TooltipBubble({
  floatingRef,
  floatingStyles,
  floatingProps,
  context,
  arrowRef,
  content,
}: {
  floatingRef: (node: HTMLElement | null) => void;
  floatingStyles: React.CSSProperties;
  floatingProps: Record<string, unknown>;
  context: Parameters<typeof FloatingArrow>[0]['context'];
  arrowRef: React.MutableRefObject<SVGSVGElement | null>;
  content: string;
}) {
  return (
    <div
      ref={floatingRef}
      style={{
        ...floatingStyles,
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-md)',
        fontSize: 'var(--font-size-sm)',
        border: '1px solid var(--color-border)',
        transition: 'opacity var(--transition-fast)',
        opacity: context.isPositioned ? 1 : 0,
        zIndex: 1000,
        pointerEvents: 'none',
        maxWidth: '240px',
      }}
      {...floatingProps}
    >
      {content}
      <FloatingArrow
        ref={arrowRef}
        context={context}
        fill="var(--color-surface)"
        stroke="var(--color-border)"
        strokeWidth={1}
      />
    </div>
  );
}
