import { Play, FileText, BookOpen, Lock, ChevronRight, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface LectureTableViewProps {
  lessons: {
    id: string;
    title: string;
    lecture_type: string;
    created_at: string | null;
    duration: number | null;
    is_locked: boolean | null;
    position: number;
  }[];
  hasPurchased: boolean;
  isAdminOrTeacher: boolean;
  onLectureClick: (lesson: any) => void;
}

const typeIcons: Record<string, typeof Play> = {
  VIDEO: Play,
  PDF: FileText,
  NOTES: BookOpen,
  DPP: FileText,
  TEST: ClipboardCheck,
};

const typeLabels: Record<string, string> = {
  VIDEO: "Lecture",
  PDF: "PDF",
  NOTES: "Notes",
  DPP: "DPP",
  TEST: "Test",
};

const formatDuration = (s: number | null | undefined) => {
  if (!s || s <= 0) return "—";
  const m = Math.floor(s / 60);
  return `${m} min`;
};

export const LectureTableView = ({ lessons, hasPurchased, isAdminOrTeacher, onLectureClick }: LectureTableViewProps) => {
  return (
    <div className="bg-card rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_80px_60px] sm:grid-cols-[1fr_100px_100px_80px] px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider sticky top-0">
        <span>Title</span>
        <span>Type</span>
        <span>Date</span>
        <span className="text-right">Action</span>
      </div>

      {/* Rows */}
      {lessons.map((lesson) => {
        const Icon = typeIcons[lesson.lecture_type] || Play;
        const isLocked = lesson.is_locked && !hasPurchased && !isAdminOrTeacher;
        const dateStr = lesson.created_at
          ? format(new Date(lesson.created_at), "dd MMM")
          : "—";

        return (
          <div
            key={lesson.id}
            onClick={() => onLectureClick(lesson)}
            className={cn(
              "grid grid-cols-[1fr_80px_80px_60px] sm:grid-cols-[1fr_100px_100px_80px] px-4 py-3 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30 transition-colors items-center",
              isLocked && "opacity-50"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex-shrink-0 w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                {isLocked ? (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Icon className="h-3 w-3 text-primary" />
                )}
              </div>
              <span className="text-sm font-medium text-foreground truncate">{lesson.title}</span>
            </div>
            <span className="text-xs text-muted-foreground">{typeLabels[lesson.lecture_type] || "Video"}</span>
            <span className="text-xs text-muted-foreground">{dateStr}</span>
            <div className="text-right">
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
