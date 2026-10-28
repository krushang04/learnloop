import { useEffect, useRef, useState } from 'react';

export type ProbeStatus = 'idle' | 'probing' | 'ready' | 'error';

export interface DurationProbe {
  status: ProbeStatus;
  seconds: number | null;
  error: string | null;
}

const IDLE: DurationProbe = { status: 'idle', seconds: null, error: null };

export function useVideoDuration(url: string, debounceMs = 600): DurationProbe {
  const [probe, setProbe] = useState<DurationProbe>(IDLE);
  const elementRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const trimmed = url.trim();

    if (!/^https?:\/\/\S+$/i.test(trimmed)) {
      setProbe(IDLE);
      return;
    }

    setProbe({ status: 'probing', seconds: null, error: null });

    const timeout = setTimeout(() => {
      const video = document.createElement('video');
      elementRef.current = video;
      video.preload = 'metadata';

      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);

        video.src = '';
        video.load();
      };

      const onLoaded = () => {
        const seconds = video.duration;

        if (!Number.isFinite(seconds) || seconds <= 0) {
          setProbe({
            status: 'error',
            seconds: null,
            error: 'This source does not report a duration. Enter it manually.',
          });
        } else {
          setProbe({ status: 'ready', seconds: Math.round(seconds), error: null });
        }
        cleanup();
      };

      const onError = () => {
        setProbe({
          status: 'error',
          seconds: null,
          error: 'Could not load this video. Check the URL, or enter the duration manually.',
        });
        cleanup();
      };

      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
      video.src = trimmed;
    }, debounceMs);

    return () => {
      clearTimeout(timeout);
      const video = elementRef.current;
      if (video) {
        video.src = '';
        video.load();
        elementRef.current = null;
      }
    };
  }, [url, debounceMs]);

  return probe;
}
