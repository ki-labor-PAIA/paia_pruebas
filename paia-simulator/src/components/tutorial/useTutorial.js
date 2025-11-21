// src/components/tutorial/useTutorial.js
import { useState, useCallback } from 'react';

export default function useTutorial(steps = []) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const next = useCallback(() => setIndex(i => Math.min(i + 1, steps.length - 1)), [steps.length]);
  const prev = useCallback(() => setIndex(i => Math.max(i - 1, 0)), []);
  const goTo = useCallback(i => setIndex(Math.max(0, Math.min(i, steps.length - 1))), [steps.length]);

  const finish = useCallback(() => {
    setOpen(false);
    setIndex(0);
  }, []);

  const reset = useCallback(() => {
    setOpen(true);
    setIndex(0);
  }, []);

  return { open, setOpen, index, step: steps[index], steps, next, prev, goTo, finish, reset };
}
