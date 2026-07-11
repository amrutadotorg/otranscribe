/**
 * pasteCleanup.ts — Paste handler for TipTap
 *
 * Strips inline styles, non-semantic attributes, and unwanted wrappers
 * from pasted HTML. Preserves b/i/em/strong/p/span/br/a.
 *
 * Uses browser's native DOMParser instead of sanitize-html to avoid
 * Node.js dependency (path/fs) leaking into the browser bundle.
 *
 * Matches original oTranscribe clean-html.js + stripInlineStyles behaviour.
 * See PLAN.md section 1.2 Table B, 2.4
 */

const ALLOWED_TAGS = new Set([
  'b', 'i', 'em', 'strong', 'a', 'p', 'span', 'br',
  'h1', 'h2', 'h3', 'ul', 'ol', 'li',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a:    new Set(['href']),
  span: new Set(['class', 'data-timestamp', 'data-seconds']),
};

/**
 * Clean HTML from paste / .otr import.
 * - Strips inline styles
 * - Converts div→p
 * - Keeps timestamp spans (data-timestamp / data-seconds)
 * - Keeps b/i/em/strong/a/p/span/br
 * - Removes all other tags (keeping their text content)
 */
export function cleanHTML(dirty: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${dirty}</body>`, 'text/html');

  // Convert div → p
  doc.body.querySelectorAll('div').forEach((div) => {
    const p = doc.createElement('p');
    p.innerHTML = div.innerHTML;
    div.replaceWith(p);
  });

  // Walk all elements and clean
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const toUnwrap: Element[] = [];

  let node = walker.nextNode() as Element | null;
  while (node) {
    const tag = node.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      toUnwrap.push(node);
    } else {
      // Strip disallowed attributes
      const allowedForTag = ALLOWED_ATTRS[tag];
      Array.from(node.attributes).forEach((attr) => {
        if (!allowedForTag?.has(attr.name)) {
          node!.removeAttribute(attr.name);
        }
      });
    }
    node = walker.nextNode() as Element | null;
  }

  // Unwrap disallowed elements (keep their text content)
  toUnwrap.reverse().forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
  });

  return doc.body.innerHTML;
}

/**
 * Strip inline styles from an HTML string.
 * Used before paste into editor.
 */
export function stripInlineStyles(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');

  doc.body.querySelectorAll<HTMLElement>('*').forEach((el) => {
    el.removeAttribute('style');
    Array.from(el.attributes).forEach((attr) => {
      if (
        attr.name.startsWith('data-path') ||
        attr.name.startsWith('data-index') ||
        attr.name === 'aria-live' ||
        attr.name === 'aria-busy' ||
        attr.name.startsWith('_ng')
      ) {
        el.removeAttribute(attr.name);
      }
    });
  });

  doc.body.querySelectorAll('div').forEach((div) => {
    const p = doc.createElement('p');
    p.innerHTML = div.innerHTML;
    div.replaceWith(p);
  });

  return doc.body.innerHTML;
}
