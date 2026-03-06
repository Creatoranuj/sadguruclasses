import { memo } from "react";
import { ThumbsUp, HelpCircle, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LessonActionBarProps {
  likeCount: number;
  hasLiked: boolean;
  onLike: () => void;
  onDoubts: () => void;
  onDownloadPdf?: () => void;
  hasPdf: boolean;
  likesLoading?: boolean;
  lessonTitle?: string;
  teacherName?: string;
  courseInfo?: string;
}

const LessonActionBar = memo(({
  likeCount,
  hasLiked,
  onLike,
  onDoubts,
  onDownloadPdf,
  hasPdf,
  likesLoading,
  lessonTitle,
  teacherName,
  courseInfo,
}: LessonActionBarProps) => {
  return (
    <div className="border-b border-border bg-card">
      {/* Lesson title + course info section */}
      {(lessonTitle || teacherName) && (
        <div className="px-4 pt-3 pb-2">
          <h3 className="text-sm font-semibold text-foreground line-clamp-1">
            {lessonTitle}{teacherName ? ` | ${teacherName}` : ''}
          </h3>
          {courseInfo && (
            <p className="text-xs text-muted-foreground mt-0.5">{courseInfo}</p>
          )}
        </div>
      )}

      {/* Action buttons row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Like Button */}
        <Button
          variant="outline"
          className={cn(
            "flex-1 gap-2 h-11 text-sm font-semibold rounded-xl transition-all",
            hasLiked && "bg-primary/10 border-primary text-primary"
          )}
          onClick={onLike}
          disabled={likesLoading}
        >
          <ThumbsUp className={cn("h-5 w-5", hasLiked && "fill-primary")} />
          {likeCount > 0 ? `${likeCount} Likes` : "Like"}
        </Button>

        {/* Doubts Button */}
        <Button
          variant="outline"
          className="flex-1 gap-2 h-11 text-sm font-semibold rounded-xl"
          onClick={onDoubts}
        >
          <HelpCircle className="h-5 w-5" />
          Doubts
        </Button>

        {/* Download Button */}
        {hasPdf && onDownloadPdf && (
          <Button
            variant="outline"
            className="flex-1 gap-2 h-11 text-sm font-semibold rounded-xl"
            onClick={onDownloadPdf}
          >
            <Download className="h-5 w-5" />
            Download
          </Button>
        )}

        {/* Class PDF Button */}
        {hasPdf && onDownloadPdf && (
          <Button
            variant="outline"
            className="flex-1 gap-2 h-11 text-sm font-semibold rounded-xl"
            onClick={() => {
              if (onDownloadPdf) {
                // Open in new tab instead of download
                onDownloadPdf();
              }
            }}
          >
            <FileText className="h-5 w-5" />
            Class PDF
          </Button>
        )}
      </div>
    </div>
  );
});

LessonActionBar.displayName = "LessonActionBar";

export default LessonActionBar;
