"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { meta } from "@/lib/course";

const VIDEO_ID = meta.videoId;

/**
 * An in-page player, plus a seek() any timestamp on the page can call.
 *
 * Two deliberate choices:
 *  - **Facade, not an iframe.** Nothing loads from YouTube until someone actually
 *    presses play: no third-party scripts, no cookies, no 1MB of player JS on a
 *    page a station person opened to read. youtube-nocookie once they do.
 *  - **Seek instead of navigate.** Every concept, chapter and quote already knows
 *    its exact second. Clicking one should move the player, not throw the reader
 *    out to YouTube and lose the module they were reading.
 */

type SeekFn = (seconds: number) => void;
const VideoContext = createContext<SeekFn | null>(null);

/** Returns a seek function if a player is on this page, otherwise null. */
export function useVideoSeek(): SeekFn | null {
  return useContext(VideoContext);
}

function stamp(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function VideoProvider({
  startAt = 0,
  label,
  children,
}: {
  startAt?: number;
  label: string;
  children: React.ReactNode;
}) {
  const [start, setStart] = useState(startAt);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const seek = useCallback<SeekFn>((seconds) => {
    setStart(Math.max(0, Math.floor(seconds)));
    setPlaying(true);
    // Bring the player into view — a seek that happens off-screen looks like nothing happened.
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  return (
    <VideoContext.Provider value={seek}>
      <div ref={ref} className="scroll-mt-20">
        <VideoFrame
          start={start}
          playing={playing}
          onPlay={() => setPlaying(true)}
          label={label}
        />
      </div>
      {children}
    </VideoContext.Provider>
  );
}

function VideoFrame({
  start,
  playing,
  onPlay,
  label,
}: {
  start: number;
  playing: boolean;
  onPlay: () => void;
  label: string;
}) {
  return (
    <figure className="retro-box-lg overflow-hidden bg-card">
      <div className="relative aspect-video w-full bg-black">
        {playing ? (
          <iframe
            // key forces a reload when the timestamp changes — that IS the seek
            key={start}
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?start=${start}&autoplay=1&rel=0&modestbranding=1`}
            title={`${meta.sourceTitle} — from ${stamp(start)}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={onPlay}
            className="group absolute inset-0 grid h-full w-full place-items-center"
            aria-label={`Play the source video from ${stamp(start)} — ${label}`}
          >
            <Image
              src={`https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover opacity-70 transition-opacity group-hover:opacity-90"
              unoptimized
            />
            <span className="retro-box relative z-10 flex min-h-14 items-center gap-2 bg-primary px-4 text-black">
              <Play className="size-5 fill-black" aria-hidden />
              <span className="font-head text-sm uppercase tracking-wide">
                Play from {stamp(start)}
              </span>
            </span>
          </button>
        )}
      </div>
      <figcaption className="border-t-2 border-border px-3 py-2">
        <p className="text-[13px] leading-snug">
          <span className="font-head text-[11px] uppercase tracking-wider">Source: </span>
          {label}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Every timestamp on this page plays the video right here — you won&apos;t lose your
          place.
        </p>
      </figcaption>
    </figure>
  );
}
