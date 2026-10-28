import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch } from '@/app/hooks';
import type { Progress } from '@/types';
import { saveStateChanged } from './playerSlice';
import { useSaveProgressMutation } from './learningApi';

const AUTOSAVE_INTERVAL_MS = 5000;

export function useProgressAutosave(
  videoId: string,
  getPosition: () => number | null,
  onSaved?: (progress: Progress) => void,
) {
  const dispatch = useAppDispatch();
  const [saveProgress] = useSaveProgressMutation();

  const lastSavedRef = useRef<number>(-1);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const durationRef = useRef<number | undefined>(undefined);

  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const setDuration = useCallback((seconds: number) => {
    if (Number.isFinite(seconds) && seconds > 0) durationRef.current = Math.round(seconds);
  }, []);

  const flush = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (inFlightRef.current) {
        if (!options.force) return;
        await inFlightRef.current;
      }

      const position = getPosition();
      if (position === null || !Number.isFinite(position)) return;

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

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void flush({ force: true });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);

      void flush({ force: true });
    };
  }, [flush]);

  return { flush, setDuration };
}
