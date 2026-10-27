import { useEffect, useRef, useState } from 'react';

export type ProbeStatus = 'idle' | 'probing' | 'ready' | 'error';

export interface DurationProbe {
  status: ProbeStatus;
  seconds: number | null;
  error: string | null;
}

const IDLE: DurationProbe = { status: 'idle', seconds: null, error: null };

/**
 * Reads a video's real duration straight from the URL, by loading only its
 * metadata in a detached <video> element.
 *
 * This is what lets the admin form fill the duration in for itself instead of
 * asking someone to look the number up. Metadata-only loading means we fetch
 * the file header, not the whole video, and no CORS headers are required
 * because we never touch the pixels.
 */
export function useVideoDuration(url: string, debounceMs = 600): DurationProbe {
  const [probe, setProbe] = useState<DurationProbe>(IDLE);
  const elementRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const trimmed = url.trim();

    // Nothing to probe until it at least looks like a URL — otherwise every
    // keystroke of "https://" would start and abort a request.
    if (!/^https?:\/\/\S+$/i.test(trimmed)) {
      setProbe(IDLE);
      return;
    }

    setProbe({ status: 'probing', seconds: null, error: null });

    const timeout = setTimeout(() => {
      const video = document.createElement('video');
      elementRef.current = video;
      video.preload = 'metadata';
      // Muted + playsInline keeps mobile browsers from refusing to load.
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        // Releases the pending network request straight away.
        video.src = '';
        video.load();
      };

      const onLoaded = () => {
        const seconds = video.duration;
        // A stream with no known length reports Infinity.
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
