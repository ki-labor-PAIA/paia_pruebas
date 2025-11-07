// src/components/tutorial/useTutorial.js
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'paia_tutorial_seen_v1';

export default function useTutorial(steps = [], skipAutoOpen = false) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  // abrir solo si no se ha visto (a menos que skipAutoOpen sea true)
  useEffect(() => {
    if (skipAutoOpen) return; // No abrir automáticamente

    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen && steps.length > 0) {
        setOpen(true);
        setIndex(0);
      }
    } catch {
      if (steps.length > 0) setOpen(true);
    }
  }, [steps.length, skipAutoOpen]);

  const next = useCallback(() => setIndex(i => Math.min(i + 1, steps.length - 1)), [steps.length]);
  const prev = useCallback(() => setIndex(i => Math.max(i - 1, 0)), []);
  const goTo = useCallback(i => setIndex(Math.max(0, Math.min(i, steps.length - 1))), [steps.length]);

  const finish = useCallback(() => {
    setOpen(false);
    setIndex(0);
    // NO guardar en localStorage - el tutorial siempre debe estar disponible
    // if (!skipAutoOpen) {
    //   try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    // }
  }, [skipAutoOpen]);

  const reset = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setOpen(true);
    setIndex(0);
  }, []);

  return { open, setOpen, index, step: steps[index], steps, next, prev, goTo, finish, reset };
}
