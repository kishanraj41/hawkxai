"use client";

import { useEffect, useRef, useState } from "react";

export const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260729_102822_0e6c87e8-c141-4744-bf32-ad30db296371.mp4";

function scheduleIdle(fn: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(fn, { timeout: 2500 });
    return () => window.cancelIdleCallback(id);
  }
  const t = window.setTimeout(fn, 600);
  return () => window.clearTimeout(t);
}

/** Scroll-scrubbed cinematic layer. Dashboard is h-screen, so progress is pointer Y + idle drift. */
export default function CinematicVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetRef = useRef(0.12);
  const smoothedRef = useRef(0.12);
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    return scheduleIdle(() => setSrc(HERO_VIDEO));
  }, []);

  useEffect(() => {
    if (!src) return;
    const video = videoRef.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      video.currentTime = 0.4;
      return;
    }

    let raf = 0;
    let idle = 0;

    function onMove(event: PointerEvent) {
      targetRef.current = Math.min(1, Math.max(0, event.clientY / window.innerHeight));
    }

    function tick() {
      idle = (idle + 0.00035) % 1;
      const mixed = targetRef.current * 0.72 + idle * 0.28;
      smoothedRef.current += (mixed - smoothedRef.current) * 0.12;
      const el = videoRef.current;
      if (el && el.duration && Number.isFinite(el.duration)) {
        const next = smoothedRef.current * Math.max(0.05, el.duration - 0.05);
        if (Math.abs(el.currentTime - next) > 0.04) {
          try {
            el.currentTime = next;
          } catch {
            /* seeking before ready */
          }
        }
      }
      raf = window.requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.cancelAnimationFrame(raf);
    };
  }, [src]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0a0a0a]" aria-hidden>
      {src ? (
        <video
          ref={videoRef}
          src={src}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover opacity-55"
        />
      ) : null}
      <div className="absolute inset-0 bg-[#0a0a0a]/45" />
    </div>
  );
}
