import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

export interface BreadcrumbSegment {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  segments: BreadcrumbSegment[];
  className?: string;
}

/**
 * PW-style Breadcrumbs — polished sticky navigation chain
 * First item gets a home icon, last item is bold (current page)
 */
export const Breadcrumbs = ({ segments, className }: BreadcrumbsProps) => {
  if (!segments.length) return null;

  return (
    <nav
      className={cn(
        "flex items-center gap-0.5 text-xs overflow-x-auto whitespace-nowrap py-2 px-3 sm:px-4 bg-card/80 backdrop-blur-md border-b border-border/60 scrollbar-none",
        className
      )}
      aria-label="Breadcrumb"
    >
      {segments.map((segment, index) => {
        const isFirst = index === 0;
        const isLast = index === segments.length - 1;

        return (
          <div key={index} className="flex items-center gap-0.5 shrink-0">
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/50 mx-0.5 shrink-0" />
            )}

            {isLast || !segment.href ? (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-md transition-colors max-w-[180px] truncate",
                  isLast
                    ? "font-semibold text-foreground bg-primary/10"
                    : "text-muted-foreground"
                )}
              >
                {segment.icon || (isFirst && !segment.icon && (
                  <Home className="h-3 w-3 inline mr-1 -mt-0.5" />
                ))}
                {segment.label}
              </span>
            ) : (
              <Link
                to={segment.href}
                className={cn(
                  "px-1.5 py-0.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors inline-flex items-center gap-1 max-w-[160px]",
                )}
              >
                {segment.icon || (isFirst && !segment.icon && (
                  <Home className="h-3 w-3 shrink-0" />
                ))}
                <span className="truncate">{segment.label}</span>
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
