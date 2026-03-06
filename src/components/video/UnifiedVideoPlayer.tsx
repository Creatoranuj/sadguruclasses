import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MahimaGhostPlayer } from "@/components/video";
import refreshLogo from "@/assets/refresh-logo.png";

const DriveEmbedViewer = lazy(() => import("@/components/course/DriveEmbedViewer"));

interface UnifiedVideoPlayerProps {
  url: string;
  title?: string;
  onEnded?: () => void;
  onReady?: () => void;
}

type Platform = "youtube" | "drive" | "docs" | "vimeo" | "archive" | "direct" | "unknown";

const detectPlatform = (url: string): Platform => {
  if (!url) return "unknown";
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/docs\.google\.com\/document/.test(url)) return "docs";
  if (/drive\.google\.com/.test(url)) return "drive";
  if (/vimeo\.com/.test(url)) return "vimeo";
  if (/archive\.org/.test(url)) return "archive";
  if (/\.(mp4|webm|ogg)($|\?)/i.test(url)) return "direct";
  if (/\.pdf($|\?)/i.test(url)) return "drive"; // route PDFs to DriveEmbedViewer
  return "unknown";
};

/** Check if an Archive.org URL is likely a document (not video) */
const isArchiveDocument = (url: string): boolean => {
  // If URL explicitly references a video format, treat as video
  if (/\.(mp4|webm|ogv)($|\?)/i.test(url)) return false;
  // Book/text patterns
  if (/\/details\/[^/]*(?:book|text|pdf|doc)/i.test(url)) return true;
  // Default: treat archive as document (embed viewer handles both)
  return true;
};

const getVimeoId = (url: string) => url.match(/vimeo\.com\/(\d+)/)?.[1] || "";

const UnifiedVideoPlayer = ({ url, title, onEnded, onReady }: UnifiedVideoPlayerProps) => {
  const platform = detectPlatform(url);
  const containerRef = useRef<HTMLDivElement>(null);

  // YouTube — delegate to MahimaGhostPlayer
  if (platform === "youtube") {
    return (
      <MahimaGhostPlayer videoUrl={url} title={title} onEnded={onEnded} onReady={onReady} />
    );
  }

  // Drive / PDF / Docs — use DriveEmbedViewer
  if (platform === "drive" || platform === "docs") {
    return (
      <Suspense fallback={<Skeleton className="aspect-[4/3] w-full" />}>
        <DriveEmbedViewer url={url} title={title || "Document"} />
      </Suspense>
    );
  }

  // Archive.org — route documents to DriveEmbedViewer, videos to iframe
  if (platform === "archive") {
    if (isArchiveDocument(url)) {
      return (
        <Suspense fallback={<Skeleton className="aspect-[4/3] w-full" />}>
          <DriveEmbedViewer url={url} title={title || "Document"} />
        </Suspense>
      );
    }

    const embedUrl = url.replace("/details/", "/embed/");
    return (
      <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden" ref={containerRef}>
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          title={title || "Archive.org Video"}
        />
        <div className="absolute top-0 left-0 right-0 z-[45]" style={{ height: "50px", background: "black" }} />
        <div className="absolute bottom-0 right-0 z-[45]" style={{ width: "180px", height: "40px", background: "black" }} />
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
        <div className="absolute bottom-0 right-0 z-[45]" style={{ width: "120px", height: "44px", background: "black" }} />
        <div className="absolute top-0 right-0 z-[45]" style={{ width: "60px", height: "200px", background: "black" }} />
        <BrandingOverlay />
      </div>
    );
  }

  // Direct video
  if (platform === "direct") {
    return (
      <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden">
        <video
          src={url}
          controls
          controlsList="nodownload"
          className="w-full h-full"
          onContextMenu={(e) => e.preventDefault()}
          onEnded={onEnded}
          onCanPlay={() => onReady?.()}
        >
          Your browser does not support video.
        </video>
        <BrandingOverlay />
      </div>
    );
  }

  // Fallback
  return (
    <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden flex items-center justify-center">
      <p className="text-white/50">Unsupported video format</p>
    </div>
  );
};

const BrandingOverlay = () => (
  <div
    className="absolute bottom-0 left-0 right-0 z-[46] flex items-center justify-between px-3 py-2 select-none pointer-events-none"
    style={{ background: "transparent" }}
  >
    <div className="flex items-center gap-2" style={{ pointerEvents: 'auto', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
      <img src={refreshLogo} alt="" className="h-8 w-8 rounded" draggable={false} />
    </div>
    <div
      className="flex items-center gap-1.5 px-3 py-1 rounded-md"
      style={{ background: 'rgba(128,128,128,0.65)', backdropFilter: 'blur(4px)', pointerEvents: 'auto', cursor: 'default' }}
      onClick={(e) => e.stopPropagation()}
    >
      <img src={refreshLogo} alt="" className="h-5 w-5 rounded-sm" draggable={false} />
      <span className="text-white text-xs font-semibold tracking-wide">Sadguru Coaching Classes</span>
    </div>
  </div>
);

export default UnifiedVideoPlayer;
