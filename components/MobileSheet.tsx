"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** True for any element a sighted user could actually tab to — works for
 * `position: fixed` descendants (a sticky footer button, say), unlike an
 * `offsetParent !== null` check, which reports `null` for fixed elements
 * even though they are visible and focusable. */
function isVisible(el: HTMLElement): boolean {
  if (typeof el.checkVisibility === "function") {
    return el.checkVisibility();
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0;
}

/**
 * A generic bottom-sheet modal dialog: it owns focus while it is open (focus
 * moves in on open, Tab is trapped inside it, Escape closes it, focus returns
 * to the previously-focused control — or `restoreFocusTo` — on close), and it
 * closes itself if the viewport grows past the desktop breakpoint where the
 * caller hides the sheet in CSS. It carries no filter/catalogue coupling —
 * callers own all content and state.
 */
export function MobileSheet({
  label,
  title,
  closeLabel = "Close",
  onClose,
  restoreFocusTo,
  describedById,
  children,
  footer,
}: {
  /** Accessible name for the `role="dialog"` element. */
  label: string;
  title: string;
  closeLabel?: string;
  onClose: () => void;
  /** Ref to a focus target to fall back to if the element that opened the
   * sheet is no longer visible when it closes (e.g. a trigger hidden by a
   * breakpoint change while the sheet was open). Read at close time, not
   * render time, so a plain ref object is passed rather than `.current`. */
  restoreFocusTo?: RefObject<HTMLElement | null>;
  describedById?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    dialog.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => isVisible(el) || el === dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    // A viewport that grows past the desktop breakpoint hides the sheet in CSS;
    // close it so focus and scroll lock cannot be stranded behind the rail.
    const desktop = window.matchMedia("(min-width: 1024px)");
    function onBreakpointChange(event: MediaQueryListEvent) {
      if (event.matches) closeRef.current();
    }

    // Bound on the dialog node itself (bubble phase), not `document` in the
    // capture phase: capturing on document would intercept Escape before a
    // native <select> popup gets to handle it, closing the whole sheet
    // instead of just dismissing the popup.
    dialog.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpointChange);

    return () => {
      dialog.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpointChange);
      body.style.overflow = previousOverflow;
      // Intentionally read at close time, not captured at mount: the whole
      // point of this fallback is to catch the DOM state as it is when the
      // sheet actually closes (e.g. a trigger hidden by a breakpoint change
      // that happened while the sheet was open).
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const fallback = restoreFocusTo?.current;
      const restoreTarget = previouslyFocused && isVisible(previouslyFocused) ? previouslyFocused : fallback;
      restoreTarget?.focus?.();
    };
    // restoreFocusTo is read once at close time via closure; re-running this
    // effect on every render would reopen the trap unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mobile-sheet lg:hidden">
      <button
        type="button"
        className="mobile-sheet__backdrop"
        aria-label={closeLabel}
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-describedby={describedById}
        tabIndex={-1}
        className="mobile-sheet__dialog"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="display text-[28px]">{title}</h2>
          <button type="button" className="btn btn--outline min-h-[44px] px-4 py-2" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
        <div className="mt-5">{children}</div>
        {footer && <div className="mobile-sheet__footer">{footer}</div>}
      </div>
    </div>
  );
}
