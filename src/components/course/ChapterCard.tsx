import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChapterCardProps {
  code: string;
  title: string;
  lectureCount: number;
  completedLectures: number;
  dppCount?: number;
  completedDpp?: number;
  onClick?: () => void;
}

export const ChapterCard = ({
  code,
  title,
  lectureCount,
  completedLectures,
  dppCount = 0,
  completedDpp = 0,
  onClick,
}: ChapterCardProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-4 bg-card border border-border rounded-xl cursor-pointer transition-all",
        "hover:shadow-md hover:border-primary/20"
      )}
    >
      {/* Chapter Badge */}
      <div className="min-w-[64px] h-[52px] rounded-xl bg-primary/10 flex items-center justify-center">
        <span className="text-primary font-semibold text-sm">{code}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground line-clamp-1">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Lectures : {completedLectures}/{lectureCount}
          {dppCount > 0 && ` • DPP : ${completedDpp}/${dppCount}`}
        </p>
      </div>

      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
    </div>
  );
};

export default ChapterCard;
