import { Play, FileText, BookOpen, Lock, Download, Copy, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import checkmarkIcon from "@/assets/icons/checkmark-3d.png";
import scienceIcon from "@/assets/icons/science-3d.png";

export interface LectureCardProps {
  id: string;
  title: string;
  lectureType: "VIDEO" | "PDF" | "DPP" | "NOTES" | "TEST";
  position: number;
  isLocked?: boolean;
  isCompleted?: boolean;
  createdAt?: string | null;
  duration?: number | null;
  onClick?: () => void;
}

const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return "—";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "dd MMM").toUpperCase();
  } catch {
    return "";
  }
};

const isVideoType = (type: string) => type === "VIDEO";
const isNotesType = (type: string) => type === "PDF" || type === "NOTES";
const isTestType = (type: string) => type === "TEST";

export const LectureCard = ({
  title,
  lectureType,
  position,
  isLocked = false,
  isCompleted = false,
  createdAt,
  duration,
  onClick,
}: LectureCardProps) => {
  const isVideo = isVideoType(lectureType);
  const isNotes = isNotesType(lectureType);
  const isTest = isTestType(lectureType);
  const typeLabel = isVideo ? "LECTURE" : lectureType;
  const dateStr = formatDate(createdAt);

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative bg-card rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-4 cursor-pointer transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]",
        isLocked && "opacity-60"
      )}
    >
      {/* Completed checkmark - top right */}
      {isCompleted && !isLocked && (
        <img
          src={checkmarkIcon}
          alt="Completed"
          width={20}
          height={20}
          className="absolute top-3 right-3 w-5 h-5 object-contain"
          loading="lazy"
          decoding="async"
        />
      )}

      <div className="flex gap-4">
        {/* Left: Thumbnail or Icon */}
        {isVideo || lectureType === "DPP" || isTest ? (
          <div className="relative min-w-[100px] h-[75px] rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              {isLocked ? (
                <Lock className="h-6 w-6 text-white/80" />
              ) : isTest ? (
                <ClipboardCheck className="h-6 w-6 text-white" />
              ) : (
                <Play className="h-6 w-6 text-white fill-white" />
              )}
            </div>
            <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
              {formatDuration(duration)}
            </span>
          </div>
        ) : (
          <div className="min-w-[72px] h-[72px] rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
            <img
              src={scienceIcon}
              alt="Notes"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}

        {/* Right: Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          {/* Meta line */}
          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
            <span className="font-medium tracking-wide">{typeLabel}</span>
            {dateStr && (
              <>
                <span>·</span>
                <span>{dateStr}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h4 className="font-semibold text-foreground text-sm leading-snug line-clamp-2 mt-1">
            {title}
          </h4>

          {/* Action row */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                isNotes
                  ? "bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:hover:bg-purple-950/50"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              )}
            >
              {isVideo ? "Watch Lecture" : isTest ? "Take Test" : isNotes ? "View Note" : "View DPP"}
            </button>

            {/* Action icons for video only */}
            {isVideo && (
              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LectureCard;
