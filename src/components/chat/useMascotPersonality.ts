"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

const HINT_KEY = "nova-assistant-hint-seen-v1";
type Reaction = "none" | "hover-greeting" | "clicked";
type Hint = "none" | "discovery" | "hover";

// All personality is temporary and independent of the persisted conversation.
export function useMascotPersonality({ ready, open, working, dragging, error, launcher }: {
  ready: boolean; open: boolean; working: boolean; dragging: boolean; error: boolean;
  launcher: RefObject<HTMLButtonElement | null>;
}) {
  const [reaction, setReaction] = useState<Reaction>("none");
  const [hint, setHint] = useState<Hint>("none");
  const hovered = useRef(false), seen = useRef(false);
  const flags = useRef({ open, working, dragging, error });
  const timers = useRef<Partial<Record<"greeting" | "reaction" | "discovery" | "dismiss", ReturnType<typeof setTimeout>>>>({});
  function clear(name: keyof typeof timers.current) { clearTimeout(timers.current[name]); delete timers.current[name]; }
  function markSeen() {
    seen.current = true;
    clear("discovery"); clear("dismiss");
    try { sessionStorage.setItem(HINT_KEY, "1"); } catch { /* In-memory suppression still works. */ }
  }
  function centerEyes(button = launcher.current) {
    button?.style.setProperty("--eye-x", "0px"); button?.style.setProperty("--eye-y", "0px");
  }
  useEffect(() => {
    flags.current = { open, working, dragging, error };
    if (!open && !working && !dragging && !error) return;
    clear("greeting"); clear("reaction"); clear("discovery"); clear("dismiss");
    if (open || dragging) markSeen();
    centerEyes();
    // Invalidate any previous hover expression without changing chat state.
    // Keep the brief opening expression when open becomes true.
    const timer = setTimeout(() => {
      setHint("none");
      if (working || dragging || error) setReaction("none");
      else setReaction((r) => r === "hover-greeting" ? "none" : r);
    }, 0);
    // Opening still needs a finite happy-expression lifetime after effect cleanup.
    if (open && !working && !dragging && !error) timers.current.reaction = setTimeout(() => setReaction("none"), 300);
    return () => clearTimeout(timer);
    // Helpers only operate on stable refs and timers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, working, dragging, error]);
  useEffect(() => {
    if (!ready) return;
    try { seen.current = seen.current || sessionStorage.getItem(HINT_KEY) === "1"; } catch { /* Session storage may be disabled. */ }
    if (seen.current) return;
    timers.current.discovery = setTimeout(() => {
      const f = flags.current;
      if (seen.current || f.open || f.working || f.dragging || f.error) return;
      markSeen(); setHint("discovery");
      timers.current.dismiss = setTimeout(() => setHint((h) => h === "discovery" ? "none" : h), 4000);
    }, 1000);
    return () => clear("discovery");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  useEffect(() => () => { for (const timer of Object.values(timers.current)) clearTimeout(timer); }, []);

  function trackEyes(e: React.PointerEvent<HTMLButtonElement>) {
    const f = flags.current, button = e.currentTarget;
    if (e.pointerType === "touch" || !hovered.current || f.working || f.dragging || f.error || !button.matches(":hover") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { centerEyes(button); return; }
    const bounds = button.getBoundingClientRect();
    const x = Math.max(-4.5, Math.min(4.5, (e.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2) * 4.5));
    const y = Math.max(-3, Math.min(3, (e.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2) * 3));
    button.style.setProperty("--eye-x", `${x}px`); button.style.setProperty("--eye-y", `${y}px`);
  }
  function enter(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.pointerType === "touch" || !window.matchMedia("(hover: hover)").matches) return;
    hovered.current = true; trackEyes(e);
    const f = flags.current;
    if (f.open || f.working || f.dragging || f.error) return;
    clear("greeting");
    timers.current.greeting = setTimeout(() => {
      const f = flags.current;
      if (!hovered.current || f.open || f.working || f.dragging || f.error || launcher.current?.classList.contains("is-ready")) return;
      markSeen(); setHint("hover"); setReaction("hover-greeting");
      clear("reaction"); timers.current.reaction = setTimeout(() => setReaction("none"), 350);
    }, 600);
  }
  function leave(e: React.PointerEvent<HTMLButtonElement>) {
    hovered.current = false; clear("greeting");
    clear("dismiss"); timers.current.dismiss = setTimeout(() => setHint("none"), 120);
    setReaction((r) => r === "hover-greeting" ? "none" : r); centerEyes(e.currentTarget);
  }
  function dragStarted() {
    flags.current.dragging = true; hovered.current = false; markSeen(); clear("greeting"); clear("reaction");
    setHint("none"); setReaction("none"); centerEyes();
  }
  function clicked(opening: boolean) {
    markSeen(); clear("greeting"); clear("reaction"); setHint("none");
    setReaction(opening ? "clicked" : "none");
    if (opening) timers.current.reaction = setTimeout(() => setReaction("none"), 300);
  }
  const blocked = working || dragging || error;
  return { reaction: blocked ? "none" : reaction, hintVisible: !open && !blocked && hint !== "none", enter, leave, trackEyes, dragStarted, clicked,
    hintEnter: () => clear("dismiss"), hintLeave: () => { clear("dismiss"); timers.current.dismiss = setTimeout(() => setHint("none"), 120); } };
}
