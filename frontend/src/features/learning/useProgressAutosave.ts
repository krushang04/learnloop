import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch } from '@/app/hooks';
import type { Progress } from '@/types';
import { saveStateChanged } from './playerSlice';
import { useSaveProgressMutation } from './learningApi';

/** How often playback position is written while the video plays. */
const AUTOSAVE_INTERVAL_MS = 5000;

/**
 * Persists the playhead so a learner can resume after a refresh.
 *
 * Saves on a timer while playing, and immediately on pause, seek, question,
 * tab-hide and unmount. The last of these matters most: closing the tab is the
 * common case, and without it the final few seconds of watching are lost.
 *
 * `onSaved` receives the server's recalculated progress, so the UI reflects the
 * real completion percentage rather than the stale value from page load.
 */
export function useProgressAutosave(
  videoId: string,
  getPosition: () => number | null,
  onSaved?: (progress: Progress) => void,
) {
  const dispatch = useAppDispatch();
  const [saveProgress] = useSaveProgressMutation();

  // Refs rather than state: these change constantly and must not re-render.
  const lastSavedRef = useRef<number>(-1);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const durationRef = useRef<number | undefined>(undefined);

  // Held in a ref so a new callback identity each render does not rebuild the
  // autosave timer (which would reset the interval on every tick).
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const setDuration = useCallback((seconds: number) => {
    if (Number.isFinite(seconds) && seconds > 0) durationRef.current = Math.round(seconds);
  }, []);

  const flush = useCallback(
    async (options: { force?: boolean } = {}) => {
      // A forced flush waits for any save already running rather than giving
      // up. Callers await it to guarantee the server knows where they are —
      // the answer endpoint refuses questions past the saved position, so
      // dropping this write would refuse a legitimate answer.
      if (inFlightRef.current) {
        if (!options.force) return;
        await inFlightRef.current;
      }

      const position = getPosition();
      if (position === null || !Number.isFinite(position)) return;

      // Skip no-op writes: without this, a paused video would save the same
      // second every five seconds forever.
      if (!options.force && Math.abs(position - lastSavedRef.current) < 1) return;

      const request = (async () => {
        dispatch(saveStateChanged('saving'));
        try {
          const saved = await saveProgress({
            videoId,
            positionSeconds: Math.floor(position),
            durationSeconds: durationRef.current,
          }).unwrap();

          lastSavedRef.current = position;
          onSavedRef.current?.(saved);
          dispatch(saveStateChanged('saved'));
        } catch {
          // Autosave failing is not worth interrupting playback over; the
          // indicator shows it and the next tick will try again.
          dispatch(saveStateChanged('error'));
        }
      })();

      inFlightRef.current = request;
      try {
        await request;
      } finally {
        if (inFlightRef.current === request) inFlightRef.current = null;
      }
    },
    [videoId, getPosition, saveProgress, dispatch],
  );

  useEffect(() => {
    const interval = setInterval(() => void flush(), AUTOSAVE_INTERVAL_MS);

    // Switching tabs or minimising is effectively leaving — save now.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void flush({ force: true });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      // Navigating away within the SPA: unmount is the only signal we get.
      void flush({ force: true });
    };
  }, [flush]);

  return { flush, setDuration };
}
