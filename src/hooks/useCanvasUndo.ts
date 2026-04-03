import { useState, useCallback, useRef } from "react";

export function useCanvasUndo<T>(initial: T, maxSteps = 20) {
  const [state, setState] = useState<T>(initial);
  const historyRef = useRef<T[]>([initial]);
  const indexRef = useRef(0);

  const push = useCallback((next: T) => {
    const history = historyRef.current;
    const idx = indexRef.current;
    // Truncate any redo states
    historyRef.current = history.slice(0, idx + 1);
    historyRef.current.push(next);
    // Trim to maxSteps
    if (historyRef.current.length > maxSteps) {
      historyRef.current = historyRef.current.slice(-maxSteps);
    }
    indexRef.current = historyRef.current.length - 1;
    setState(next);
  }, [maxSteps]);

  const undo = useCallback(() => {
    if (indexRef.current > 0) {
      indexRef.current -= 1;
      const prev = historyRef.current[indexRef.current];
      setState(prev);
      return prev;
    }
    return null;
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current < historyRef.current.length - 1) {
      indexRef.current += 1;
      const next = historyRef.current[indexRef.current];
      setState(next);
      return next;
    }
    return null;
  }, []);

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length - 1;

  return { state, push, undo, redo, canUndo, canRedo, setState };
}
