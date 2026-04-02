import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Skeleton } from "../ui/skeleton";
import { MahimaGhostPlayer } from ".";
// bird logo used in both overlays
import birdOverlayLogo from "../../assets/bird-overlay-logo.png";
import { useOrientation } from "../../hooks/useOrientation";
import DriveEmbedViewer from "../course/DriveEmbedViewer";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
interface UnifiedVideoPlayerProps {
  url: string;
  title?: string;
  subtitle?: string;
  lessonId?: string;
  onEnded?: () => void;
  onReady?: () => void;
  onDurationReady?: (duration: number) => void;
  onProgress?: (state: { played: number; playedSeconds: number }) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onNextVideo?: () => void;
  nextVideoTitle?: string;
}

type Platform = "youtube" | "youtube-live" | "drive" | "docs" | "vimeo" | "archive" | "direct" | "unknown";

const detectPlatform = (url: string): Platform => {
  if (!url) return "unknown";
  if (/youtube\.com\/live\//.test(url) || /[?&]live_stream/i.test(url)) return "youtube-live";
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/docs\.google\.com\/document/.test(url)) return "docs";
  if (/drive\.google\.com/.test(url)) return "drive";
  if (/vimeo\.com/.test(url)) return "vimeo";
  if (/archive\.org/.test(url)) return "archive";
  if (/\.(mp4|webm|ogg)($|\?)/i.test(url)) return "direct";
  // Supabase Storage signed URLs → play as direct video
  if (/supabase\.co\/storage\/.*\.(mp4|webm|ogg)/i.test(url)) return "direct";
  if (/supabase\.co\/storage.*token=/i.test(url)) return "direct";
  if (/\.b-cdn\.net/i.test(url)) return "direct"; // Bunny CDN
  if (/github-storages-cdn\.vercel\.app/i.test(url)) return "drive";
  if (/storage-naveenbharat-recording\.vercel\.app/i.test(url)) return "drive";
  if (/cdn\.jsdelivr\.net/i.test(url)) return "drive";
  if (/\.pdf($|\?)/i.test(url)) return "drive";
  if (/\.(xlsx|xls|csv|docx?|pptx?)($|\?)/i.test(url)) return "docs";
  if (/supabase\.co\/storage/i.test(url)) return "drive";
  return "unknown";
};

const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

const isArchiveDocument = (url: string): boolean => {
  if (/\.(mp4|webm|ogv)($|\?)/i.test(url)) return false;
  if (/\/details\/[^/]*(?:book|text|pdf|doc)/i.test(url)) return true;
  return true;
};

const getVimeoId = (url: string) => url.match(/vimeo\.com\/(\d+)/)?.[1] || "";

const UnifiedVideoPlayer = ({
  url, title, subtitle, lessonId, onEnded, onReady, onDurationReady,
  onProgress, onTimeUpdate, onNextVideo, nextVideoTitle,
}: UnifiedVideoPlayerProps) => {
  const platform = detectPlatform(url);
  const containerRef = useRef<HTMLDivElement>(null);
  const isYouTube = platform === "youtube" || platform === "youtube-live";

  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    if (onProgress) onProgress({ played: currentTime / duration, playedSeconds: currentTime });
    if (onTimeUpdate) onTimeUpdate(currentTime, duration);
  }, [onProgress, onTimeUpdate]);

  // YouTube — always use MahimaGhostPlayer (no more Ad-Free toggle)
  if (isYouTube) {
    return (
      <MahimaGhostPlayer
        videoUrl={url}
        title={title}
        subtitle={subtitle}
        lessonId={lessonId}
        onEnded={onEnded}
        onReady={onReady}
        onDurationReady={onDurationReady}
        onTimeUpdate={handleTimeUpdate}
        onNextVideo={onNextVideo}
        nextVideoTitle={nextVideoTitle}
      />
    );
  }

  // Drive / PDF / Docs
  if (platform === "drive" || platform === "docs") {
    return <DriveEmbedViewer url={url} title={title || "Document"} />;
  }

  // Archive.org
  if (platform === "archive") {
    if (isArchiveDocument(url)) {
      return <DriveEmbedViewer url={url} title={title || "Document"} />;
    }
    const embedUrl = url.replace("/details/", "/embed/");
    return (
      <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden" ref={containerRef}>
        <iframe src={embedUrl} className="w-full h-full border-0" allowFullScreen title={title || "Archive.org Video"} />
        <BrandingOverlay />
      </div>
    );
  }

  // Vimeo
  if (platform === "vimeo") {
    return (
      <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden" ref={containerRef}>
        <iframe
          src={`https://player.vimeo.com/video/${getVimeoId(url)}?title=0&byline=0&portrait=0&badge=0&dnt=1`}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={title || "Vimeo Video"}
        />
        <BrandingOverlay />
      </div>
    );
  }

  // Direct video
  if (platform === "direct") {
    return (
      <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden">
        <video
          src={url} controls controlsList="nodownload" className="w-full h-full"
          onContextMenu={(e) => e.preventDefault()} onEnded={onEnded} onCanPlay={() => onReady?.()}
        >
          Your browser does not support video.
        </video>
        <BrandingOverlay />
      </div>
    );
  }

  // Fallback
  if (url.startsWith("http")) {
    return <DriveEmbedViewer url={url} title={title || "Document"} />;
  }

  return (
    <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden flex items-center justify-center">
      <p className="text-white/50">Unsupported format</p>
    </div>
  );
};

const BrandingOverlay = () => {
  const isPortrait = useOrientation();
  return (
    <>
      <div
        className="absolute z-[52] pointer-events-none select-none"
        style={{ bottom: isPortrait ? '10px' : '14px', left: isPortrait ? '10px' : '12px' }}
      >
        <img
          src={birdOverlayLogo} alt=""
          style={{ height: isPortrait ? '48px' : '56px', width: isPortrait ? '48px' : '56px', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.85))' }}
          draggable={false}
          loading="lazy"
        />
      </div>
      <div
        className="absolute z-[52] pointer-events-none select-none flex items-center bottom-0 right-0"
        style={{
          gap: isPortrait ? '5px' : '7px',
          padding: isPortrait ? '6px 12px 6px 10px' : '7px 14px 7px 12px',
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(6px)",
          borderTopLeftRadius: '14px',
        }}
      >
        <img src={birdOverlayLogo} alt="" style={{ height: isPortrait ? '28px' : '32px', width: isPortrait ? '28px' : '32px' }} draggable={false} loading="lazy" />
        <span className="text-black font-bold tracking-wide whitespace-nowrap" style={{ fontSize: isPortrait ? '13px' : '15px' }}>
          Sadguru Classes
        </span>
      </div>
    </>
  );
};

export default UnifiedVideoPlayer;
