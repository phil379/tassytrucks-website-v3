import { Fragment } from 'react';

/**
 * Renders a policy body, turning **double-asterisk** spans into emphasis.
 *
 * Returns inline content only (no wrapper), so it drops into whatever <p> or
 * <span> already holds it without changing layout. The original three policies
 * contain no ** and render as plain text, byte-identical to before — which is
 * what keeps the seven-policy list visually uniform.
 */
export function PolicyBody({ text }: { text: string }) {
  // split() with a capturing group yields [plain, bold, plain, bold, ...]
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-medium text-[color:var(--ink)]">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
