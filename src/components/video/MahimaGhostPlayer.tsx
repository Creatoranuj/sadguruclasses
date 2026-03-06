import { useState, useCallback, useRef, useEffect, memo } from "react";
import { 
  Play, Pause, Volume2, VolumeX,
  RotateCcw, Loader2, MessageCircle, X, Send, SkipForward
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import EndScreenOverlay from "./EndScreenOverlay";
import refreshLogo from "@/assets/refresh-logo.png";
import settingsGearIcon from "@/assets/icons/setting-gear.png";
import rotationIcon from "@/assets/icons/rotation-icon.png";
import playButtonIcon from "@/assets/icons/play-button.png";
import skipBack10Icon from "@/assets/icons/skip-back-10.png";
import skipForward10Icon from "@/assets/icons/skip-forward-10.png";

import { useComments } from "@/hooks/useComments";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface MahimaGhostPlayerProps {
  videoUrl?: string;
  videoId?: string;
  title?: string;
  subtitle?: string;
  lessonId?: string;
  onEnded?: () => void;
  onReady?: () => void;
  onDurationReady?: (duration: number) => void;
  nextVideoUrl?: string;
  nextVideoTitle?: string;
  onNextVideo?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

const MahimaGhostPlayer = memo(({
  videoUrl,
  videoId,
  title,
  subtitle,
  lessonId,
  onEnded,
  onReady,
  onDurationReady,
  nextVideoUrl,
  nextVideoTitle,
  onNextVideo,
  onTimeUpdate,
}: MahimaGhostPlayerProps) => {
  // Player state
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('sadguru_player_volume');
    return saved ? parseFloat(saved) : 80;
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [watermarkForceVisible, setWatermarkForceVisible] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Rotation state
  const [rotation, setRotation] = useState(0);

  // Discussion state
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { user, profile } = useAuth();
  const { comments, loading: commentsLoading, createComment } = useComments(lessonId);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLIFrameElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const progressIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Extract YouTube ID
  const extractYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const youtubeId = videoId || (videoUrl ? extractYouTubeId(videoUrl) : null);

  // YouTube IFrame API Commands
  const sendCommand = useCallback((func: string, args: any = "") => {
    if (playerRef.current?.contentWindow) {
      try {
        const message = JSON.stringify({
          event: "command",
          func,
          args: args === "" ? "" : Array.isArray(args) ? args : [args],
        });
        playerRef.current.contentWindow.postMessage(message, "*");
      } catch (e) {
        console.warn("sendCommand failed:", func, e);
      }
    }
  }, []);

  const playVideo = useCallback(() => {
    if (!playerReady) return;
    sendCommand("playVideo");
    if (isMuted) {
      sendCommand("unMute");
      sendCommand("setVolume", volume);
      setIsMuted(false);
    }
    setIsPlaying(true);
  }, [sendCommand, playerReady, isMuted, volume]);

  const pauseVideo = useCallback(() => {
    if (!playerReady) return;
    sendCommand("pauseVideo");
    setIsPlaying(false);
  }, [sendCommand, playerReady]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pauseVideo();
    else playVideo();
  }, [isPlaying, playVideo, pauseVideo]);

  const seekTo = useCallback((seconds: number, allowSeekAhead: boolean = true) => {
    if (!playerReady) return;
    const clampedTime = Math.max(0, Math.min(seconds, duration || 9999));
    sendCommand("seekTo", [clampedTime, allowSeekAhead]);
    setCurrentTime(clampedTime);
  }, [sendCommand, duration, playerReady]);

  const skipForward = useCallback(() => {
    if (!playerReady) return;
    const newTime = Math.min(currentTime + 10, duration || 9999);
    seekTo(newTime);
  }, [currentTime, duration, seekTo, playerReady]);

  const skipBackward = useCallback(() => {
    if (!playerReady) return;
    const newTime = Math.max(0, currentTime - 10);
    seekTo(newTime);
  }, [currentTime, seekTo, playerReady]);

  const setPlayerVolume = useCallback((vol: number) => {
    sendCommand("setVolume", vol);
    setVolume(vol);
    localStorage.setItem('sadguru_player_volume', vol.toString());
    if (vol === 0) setIsMuted(true);
    else if (isMuted) setIsMuted(false);
  }, [sendCommand, isMuted]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      sendCommand("unMute");
      sendCommand("setVolume", volume || 80);
      setIsMuted(false);
    } else {
      sendCommand("mute");
      setIsMuted(true);
    }
  }, [isMuted, volume, sendCommand]);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  }, []);

  const preventAll = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }, []);

  const setSpeed = useCallback((speed: number) => {
    sendCommand("setPlaybackRate", speed);
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  }, [sendCommand]);

  // Derived watermark visibility: hidden first 10s, always visible last 10s or end screen
  const isInLastTenSeconds = duration > 0 && (duration - currentTime) <= 10;
  const watermarkVisible = (currentTime >= 10 || showEndScreen || isInLastTenSeconds) && (showControls || isInLastTenSeconds || showEndScreen || watermarkForceVisible);

  // Show/hide controls — prevent auto-hide in last 10 seconds
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isInLastTenSeconds) return; // Don't auto-hide in last 10 seconds
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showVolumeSlider && !showSpeedMenu && !showDiscussion) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, showVolumeSlider, showSpeedMenu, showDiscussion, isInLastTenSeconds]);

  // Single tap toggles controls only — also starts auto-hide timer when showing
  const handleOverlayTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setShowControls(prev => {
      const next = !prev;
      if (next && isPlaying) {
        // Start auto-hide timer when showing controls
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
          if (!showVolumeSlider && !showSpeedMenu && !showDiscussion) {
            setShowControls(false);
          }
        }, 3000);
      }
      return next;
    });
  }, [isPlaying, showVolumeSlider, showSpeedMenu, showDiscussion]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return;
      switch (e.key.toLowerCase()) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'arrowleft': case 'j': e.preventDefault(); skipBackward(); break;
        case 'arrowright': case 'l': e.preventDefault(); skipForward(); break;
        case 'arrowup': e.preventDefault(); setPlayerVolume(Math.min(100, volume + 5)); break;
        case 'arrowdown': e.preventDefault(); setPlayerVolume(Math.max(0, volume - 5)); break;
        case 'm': e.preventDefault(); toggleMute(); break;
        case 'f': e.preventDefault(); toggleFullscreen(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skipForward, skipBackward, toggleMute, toggleFullscreen, setPlayerVolume, volume]);

  // Anti-piracy + fullscreen listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('contextmenu', preventAll, { capture: true });
    container.addEventListener('copy', preventAll, { capture: true });
    container.addEventListener('cut', preventAll, { capture: true });
    container.addEventListener('dragstart', preventAll, { capture: true });
    const blockLinks = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' || target.closest('a')) { e.preventDefault(); e.stopPropagation(); }
    };
    container.addEventListener('click', blockLinks, { capture: true });
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      container.removeEventListener('contextmenu', preventAll);
      container.removeEventListener('copy', preventAll);
      container.removeEventListener('cut', preventAll);
      container.removeEventListener('dragstart', preventAll);
      container.removeEventListener('click', blockLinks);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [preventAll]);

  // YouTube API message listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('youtube')) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.event === 'onStateChange') {
          switch (data.info) {
            case -1: setIsBuffering(false); break;
            case 0:
              setIsPlaying(false);
              sendCommand("stopVideo"); // Kill YouTube end-screen recommendations immediately
              sendCommand("seekTo", [0, false]); // Reset YouTube internal state to prevent end-screen rendering
              setShowEndScreen(true);
              setWatermarkForceVisible(true);
              onEnded?.();
              break;
            case 1: setIsPlaying(true); setIsBuffering(false); break;
            case 2: setIsPlaying(false); setIsBuffering(false); break;
            case 3: setIsBuffering(true); break;
          }
        }
        if (data.event === 'infoDelivery') {
          if (data.info?.duration && data.info.duration > 0) {
            setDuration(data.info.duration);
            onDurationReady?.(data.info.duration);
          }
          if (data.info?.currentTime !== undefined && !isSeeking) {
            setCurrentTime(data.info.currentTime);
            onTimeUpdate?.(data.info.currentTime, data.info?.duration || duration);
          }
          if (data.info?.videoLoadedFraction !== undefined) setBufferedTime(data.info.videoLoadedFraction * (data.info?.duration || duration));
        }
      } catch {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onEnded, onDurationReady, isSeeking, duration]);

  // Poll YouTube for time updates
  useEffect(() => {
    if (!playerReady) return;
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current?.contentWindow) {
        try { playerRef.current.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1 }), "*"); } catch {}
      }
    }, 500);
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
  }, [playerReady]);

  const handleReplay = useCallback(() => { setShowEndScreen(false); setWatermarkForceVisible(false); seekTo(0); setTimeout(playVideo, 100); }, [seekTo, playVideo]);
  const handleNextVideo = useCallback(() => { setShowEndScreen(false); onNextVideo?.(); }, [onNextVideo]);

  // Progress bar handlers
  const calculateTimeFromPosition = useCallback((clientX: number) => {
    if (!progressBarRef.current || duration <= 0) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration;
  }, [duration]);

  const handleProgressMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsSeeking(true);
    const newTime = calculateTimeFromPosition(e.clientX);
    setCurrentTime(newTime);
    const handleMouseMove = (moveEvent: MouseEvent) => setCurrentTime(calculateTimeFromPosition(moveEvent.clientX));
    const handleMouseUp = (upEvent: MouseEvent) => {
      seekTo(calculateTimeFromPosition(upEvent.clientX));
      setIsSeeking(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [calculateTimeFromPosition, seekTo]);

  // Touch support for progress bar seek
  const handleProgressTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSeeking(true);
    const touch = e.touches[0];
    const newTime = calculateTimeFromPosition(touch.clientX);
    setCurrentTime(newTime);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      moveEvent.preventDefault();
      const t = moveEvent.touches[0];
      setCurrentTime(calculateTimeFromPosition(t.clientX));
    };
    const handleTouchEnd = (endEvent: TouchEvent) => {
      const t = endEvent.changedTouches[0];
      seekTo(calculateTimeFromPosition(t.clientX));
      setIsSeeking(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
    const handleTouchCancel = () => {
      setIsSeeking(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchCancel);
  }, [calculateTimeFromPosition, seekTo]);

  const handleProgressHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    setHoverTime(Math.max(0, Math.min(1, hoverX / rect.width)) * duration);
    setHoverPosition(hoverX);
  }, [duration]);

  const handleProgressLeave = useCallback(() => setHoverTime(null), []);

  const formatTime = useCallback((seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Discussion handlers
  const handlePostComment = async () => {
    if (!newComment.trim() || !lessonId) return;
    await createComment({ lessonId, message: newComment.trim() }, profile?.fullName || user?.email || 'Anonymous');
    setNewComment("");
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "";
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(diffMs / 3600000);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(diffMs / 86400000)}d ago`;
  };

  const embedUrl = youtubeId
    ? `https://www.youtube-nocookie.com/embed/${youtubeId}?` + new URLSearchParams({
        controls: '0', modestbranding: '1', rel: '0', showinfo: '0',
        iv_load_policy: '3', disablekb: '1', fs: '0', cc_load_policy: '0',
        playsinline: '1', autoplay: '1', mute: '1', enablejsapi: '1',
        origin: window.location.origin, widget_referrer: window.location.href, start: '0',
      }).toString()
    : null;

  if (!youtubeId) {
    return (
      <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
        <p className="text-muted-foreground">Video not available</p>
      </div>
    );
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercentage = duration > 0 ? (bufferedTime / duration) * 100 : 0;

  // Rotation styles — only 0° or 90° toggle
  const isRotated = rotation === 90;
  const rotationStyle: React.CSSProperties = isRotated ? {
    transform: 'rotate(90deg)',
    transformOrigin: 'center center',
    transition: 'transform 0.3s ease',
    width: '100vh',
    height: '100vw',
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    marginLeft: '-50vh',
    marginTop: '-50vw',
  } : { transition: 'transform 0.3s ease' };

  return (
    <>
      <link rel="preconnect" href="https://www.youtube-nocookie.com" />
      <link rel="preconnect" href="https://i.ytimg.com" />

      <div
        ref={containerRef}
        className={cn(
          "relative rounded-xl overflow-hidden bg-black select-none group",
          isFullscreen && "mahima-fullscreen"
        )}
        onContextMenu={(e) => e.preventDefault()}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && !showVolumeSlider && setShowControls(false)}
        tabIndex={0}
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation' }}
      >
        {/* Video Container */}
        <div className={isFullscreen ? 'mahima-video-container' : 'aspect-video'} style={{ position: 'relative', ...rotationStyle }}>
          {/* Loading spinner — stays visible until playerReady to hide YouTube's red play button */}
          {(!playerReady || isBuffering) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-30 pointer-events-none">
              <Loader2 className="w-14 h-14 text-blue-500 animate-spin" />
            </div>
          )}

          {/* YouTube iframe */}
          <iframe
            ref={playerRef}
            src={embedUrl!}
            title="Sadguru Coaching Classes Video Player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="w-full h-full border-0"
            style={{ pointerEvents: 'none' }}
            loading="eager"
            onLoad={() => {
              setIsLoaded(true);
              setTimeout(() => {
                setPlayerReady(true);
                sendCommand("pauseVideo");
                sendCommand("seekTo", [0, true]);
                sendCommand("setVolume", volume);
                setIsPlaying(false);
                onReady?.();
              }, 800);
            }}
          />

          {/* TOP OVERLAY - Title */}
          <div className={cn(
            "absolute top-0 left-0 right-0 z-[45] flex items-start justify-between p-3 md:p-4 transition-opacity duration-300",
            "bg-gradient-to-b from-black/70 via-black/30 to-transparent",
            showControls ? "opacity-100" : "opacity-0"
          )}>
            <div className="flex-1 min-w-0">
              {title && (
                <h2 className="text-white text-sm md:text-base font-semibold line-clamp-1 drop-shadow-md">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-white/70 text-xs mt-0.5 drop-shadow">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Bottom mask removed — control bar gradient handles coverage */}

          {/* BOTTOM-LEFT WATERMARK — covers YouTube channel avatar + infinity symbol */}
          <div
            className={`absolute bottom-[10px] left-0 z-[46] flex items-center justify-center select-none pointer-events-none transition-opacity duration-500 ${watermarkVisible ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: 'rgba(40,40,40,0.92)', width: '52px', height: '52px', borderRadius: '6px', ...(isInLastTenSeconds ? { animation: 'pulse-border 1.5s ease-in-out infinite' } : {}) }}
          >
            <img src={refreshLogo} alt="Sadguru" className="h-10 w-10 rounded-sm" draggable={false} />
          </div>

          {/* BOTTOM-RIGHT WATERMARK — covers YouTube label + Watch on YouTube */}
          <div
            className={`absolute bottom-[2px] right-0 z-[46] flex items-center justify-center gap-1.5 px-3 py-1.5 select-none pointer-events-none transition-opacity duration-500 ${watermarkVisible ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: 'rgba(40,40,40,0.92)', borderRadius: '6px 0 0 6px', ...(isInLastTenSeconds ? { animation: 'pulse-border 1.5s ease-in-out infinite' } : {}) }}
          >
             <img src={refreshLogo} alt="Sadguru" className="h-8 w-8 rounded-sm" draggable={false} />
             <span className="text-white text-sm font-semibold tracking-wide leading-tight">
               Sadguru Coaching
             </span>
          </div>

          {/* TOP-RIGHT WATERMARK — covers YouTube "More options" area on hover */}
          <div
            className={`absolute top-2 right-2 z-[46] flex items-center gap-1 px-1.5 py-1 select-none pointer-events-none rounded transition-opacity duration-500 ${watermarkVisible ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: 'rgba(0,0,0,0.4)' }}
          >
             <img src={refreshLogo} alt="Sadguru" className="h-6 w-6 rounded-sm" draggable={false} />
             <span className="text-white text-[10px] font-semibold tracking-wide opacity-80">SC</span>
          </div>

          {/* GHOST OVERLAY - single-tap toggles controls only */}
          <div
            className="absolute inset-0 z-40"
            onClick={handleOverlayTap}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragStart={(e) => e.preventDefault()}
            style={{ background: 'transparent', cursor: showControls ? 'default' : 'none' }}
          >
            {/* Center controls - Play/Pause + skip buttons */}
            <div className="absolute inset-0 flex flex-row items-center justify-center gap-16 md:gap-20">
              <button
                className={cn(
                  "flex items-center justify-center bg-transparent border-none",
                  "transition-transform duration-200 pointer-events-auto active:scale-90",
                  showControls ? "opacity-100 scale-100" : "opacity-0 scale-90"
                )}
                onClick={(e) => { e.stopPropagation(); skipBackward(); }}
                title="Backward 10s"
                aria-label="Backward 10s"
              >
                <img src={skipBack10Icon} alt="Backward 10s" className="w-14 h-14 md:w-16 md:h-16" style={{ filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.9))' }} />
              </button>

              <button
                className={cn(
                  "flex items-center justify-center bg-transparent border-none",
                  "transition-transform duration-200 pointer-events-auto active:scale-90",
                  showControls ? "opacity-100 scale-100" : "opacity-0 scale-90"
                )}
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                title="Play/Pause"
                aria-label="Play/Pause"
              >
                {isPlaying ? (
                  <Pause className="w-16 h-16 md:w-20 md:h-20 text-white" fill="white" style={{ filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.9))' }} />
                ) : (
                  <img src={playButtonIcon} alt="Play/Pause" className="w-20 h-20 md:w-24 md:h-24" style={{ filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.9))' }} />
                )}
              </button>

              <button
                className={cn(
                  "flex items-center justify-center bg-transparent border-none",
                  "transition-transform duration-200 pointer-events-auto active:scale-90",
                  showControls ? "opacity-100 scale-100" : "opacity-0 scale-90"
                )}
                onClick={(e) => { e.stopPropagation(); skipForward(); }}
                title="Forward 10s"
                aria-label="Forward 10s"
              >
                <img src={skipForward10Icon} alt="Forward 10s" className="w-14 h-14 md:w-16 md:h-16" style={{ filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.9))' }} />
              </button>
            </div>
          </div>

          {/* End Screen */}
          {showEndScreen && (
            <EndScreenOverlay
              onReplay={handleReplay}
              onNextVideo={nextVideoUrl ? handleNextVideo : undefined}
              nextVideoTitle={nextVideoTitle}
            />
          )}

          {/* BOTTOM CONTROLS BAR */}
        <div
          className={cn(
            "absolute left-0 right-0 bottom-0 z-50 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 md:px-4 pt-8 pb-2 md:pb-3 transition-opacity duration-300",
            (showControls || !isPlaying) ? "opacity-100" : "opacity-0 pointer-events-none",
            showEndScreen && "hidden"
          )}
          style={{ paddingBottom: isFullscreen ? 'max(12px, env(safe-area-inset-bottom))' : undefined }}
        >
          {/* Progress Bar */}
          <div
            ref={progressBarRef}
            className="relative h-6 md:h-7 bg-transparent rounded-full cursor-pointer group/progress mb-2 md:mb-3 touch-none flex items-center"
            onMouseDown={handleProgressMouseDown}
            onTouchStart={handleProgressTouchStart}
            onMouseMove={handleProgressHover}
            onMouseLeave={handleProgressLeave}
          >
            {/* Visible thin track — expands on hover for easier clicking */}
            <div className="absolute left-0 right-0 h-1 md:h-1.5 group-hover/progress:h-2 md:group-hover/progress:h-2.5 rounded-full bg-white/30 top-1/2 -translate-y-1/2 transition-all duration-150">
              <div className="absolute inset-y-0 left-0 bg-white/20 rounded-full" style={{ width: `${bufferedPercentage}%` }} />
              <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all" style={{ width: `${progressPercentage}%` }} />
            </div>
            {/* Always-visible thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 bg-blue-500 rounded-full shadow-lg transition-transform active:scale-125 progress-thumb"
              style={{ left: `calc(${progressPercentage}% - 7px)`, willChange: 'transform' }}
            />
            {hoverTime !== null && (
              <div className="absolute -top-8 bg-black/90 text-white text-xs px-2 py-1 rounded transform -translate-x-1/2" style={{ left: hoverPosition }}>
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 md:gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10 text-white hover:bg-white/20" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-4 w-4 md:h-5 md:w-5" fill="white" /> : <Play className="h-4 w-4 md:h-5 md:w-5 ml-0.5" fill="white" />}
              </Button>

              {/* Volume */}
              <div className="relative flex items-center" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
                <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9 text-white hover:bg-white/20" onClick={toggleMute}>
                  {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                {showVolumeSlider && (
                  <div className="absolute left-10 bottom-0 bg-black/90 rounded-lg p-2 w-24">
                    <Slider value={[isMuted ? 0 : volume]} max={100} step={1} onValueChange={(val) => setPlayerVolume(val[0])} className="w-full" />
                  </div>
                )}
              </div>

              {/* Time */}
              <span className="text-white text-xs md:text-sm ml-1 md:ml-2 font-mono whitespace-nowrap">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              {/* Discussion button */}
              {lessonId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:h-9 md:w-9 text-white hover:bg-white/20"
                  onClick={() => setShowDiscussion(prev => !prev)}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              )}

              {/* Next lecture button */}
              {onNextVideo && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:h-9 md:w-9 text-white hover:bg-white/20"
                  onClick={handleNextVideo}
                  title={nextVideoTitle ? `Next: ${nextVideoTitle}` : 'Next lecture'}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              )}

              {/* Settings gear — custom icon */}
              <div className="relative">
                <button
                  className="h-10 w-10 md:h-11 md:w-11 flex items-center justify-center outline-none focus:outline-none pointer-events-auto"
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  title="Playback speed"
                >
                  <img src={settingsGearIcon} alt="Settings" className="h-8 w-8 md:h-9 md:w-9" draggable={false} />
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/95 rounded-lg py-1 min-w-[80px]">
                    {[1, 1.5, 2, 3].map((speed) => (
                      <button key={speed} className={cn("w-full px-3 py-1.5 text-left text-sm hover:bg-white/20", playbackSpeed === speed ? "text-blue-400 font-semibold" : "text-white")} onClick={() => setSpeed(speed)}>
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Rotate CW — toggle 90° fullscreen */}
              <button
                className="h-10 w-10 md:h-11 md:w-11 flex items-center justify-center outline-none focus:outline-none pointer-events-auto"
                onClick={async () => {
                  if (rotation === 0) {
                    setRotation(90);
                    if (!document.fullscreenElement) {
                      try { await containerRef.current?.requestFullscreen(); setIsFullscreen(true); } catch {}
                    }
                  } else {
                    setRotation(0);
                    if (document.fullscreenElement) {
                      try { await document.exitFullscreen(); setIsFullscreen(false); } catch {}
                    }
                  }
                }}
                title="Rotate video"
              >
                <img src={rotationIcon} alt="Rotate" className="h-8 w-8 md:h-9 md:w-9" draggable={false} />
              </button>
            </div>
          </div>
        </div>

        {/* DISCUSSION BOTTOM SHEET */}
        {showDiscussion && lessonId && (
          <div
            className="absolute bottom-0 left-0 right-0 z-[60] bg-background/95 backdrop-blur-md rounded-t-2xl border-t shadow-2xl"
            style={{ maxHeight: '50%', transition: 'transform 0.3s ease' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Discussion ({comments.length})
              </h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDiscussion(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="px-4 py-2" style={{ maxHeight: 'calc(50vh - 120px)' }}>
              {commentsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                        {c.userName[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">{c.userName}</span>
                          <span className="text-[10px] text-muted-foreground">{formatRelativeTime(c.createdAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {user && (
              <div className="flex items-center gap-2 px-4 py-2 border-t">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="min-h-[36px] h-9 resize-none text-xs"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }}
                />
                <Button size="icon" className="h-9 w-9 shrink-0" onClick={handlePostComment} disabled={!newComment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </>
  );
});

MahimaGhostPlayer.displayName = "MahimaGhostPlayer";

export default MahimaGhostPlayer;
