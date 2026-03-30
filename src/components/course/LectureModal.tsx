import { useState } from "react";
import { ChevronLeft, FileText, MessageCircle, ChevronUp, ChevronDown, Send } from "lucide-react";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { cn } from "../../lib/utils";
import UnifiedVideoPlayer from "../video/UnifiedVideoPlayer";
import PdfViewer from "../video/PdfViewer";
import { useComments } from "../../hooks/useComments";
import { useAuth } from "../../contexts/AuthContext";

interface LectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: {
    id: string;
    title: string;
    video_url: string;
    description?: string | null;
    youtube_id?: string | null;
    class_pdf_url?: string | null;
  } | null;
  userId?: string;
}

export const LectureModal = ({ isOpen, onClose, lesson, userId }: LectureModalProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [commentText, setCommentText] = useState("");
  const { profile } = useAuth();
  const { comments, loading: commentsLoading, createComment } = useComments(lesson?.id);

  // Extract YouTube ID from URL
  const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const youtubeId = lesson?.youtube_id || (lesson?.video_url ? getYouTubeId(lesson.video_url) : null);

  if (!isOpen || !lesson) return null;

  // Detect content types
  const isPdfContent = /drive\.google\.com/.test(lesson.video_url)
    || /\.pdf($|\?)/i.test(lesson.video_url)
    || /cdn\.jsdelivr\.net/i.test(lesson.video_url)
    || /archive\.org/.test(lesson.video_url)
    || /github-storages-cdn/i.test(lesson.video_url)
    || /storage-naveenbharat-recording/i.test(lesson.video_url);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0">
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-foreground line-clamp-1 flex-1">
          {lesson.title}
        </h1>
      </header>

      {/* Video / PDF Player */}
      <div 
        className={cn(
          "relative bg-black w-full mahima-player select-none",
          isPdfContent ? "flex-1 min-h-0" : "max-h-[60vh]"
        )}
        onContextMenu={(e) => e.preventDefault()}
        style={{ 
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'manipulation'
        }}
      >
        {isPdfContent ? (
          <PdfViewer url={lesson.video_url} title={lesson.title} />
        ) : (
          <UnifiedVideoPlayer
            url={lesson.video_url}
            title={lesson.title}
            lessonId={lesson.id}
            onReady={() => {}}
          />
        )}
      </div>

      {/* Collapsible Section below video */}
      {!isPdfContent && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Collapse Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between px-4 py-3 border-y transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.12))',
            }}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="flex items-center justify-center h-6 w-6 rounded-md bg-primary/15 text-primary">
                <FileText className="h-3.5 w-3.5" />
              </span>
              Resources & Discussion
            </span>
            <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <ChevronDown className="h-4 w-4" />
            </span>
          </button>

          {/* Tabs Content */}
          {isExpanded && (
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="pdf" className="h-full flex flex-col">
                <TabsList className="mx-4 mt-3 justify-start gap-3 bg-transparent h-auto p-0">
                  <TabsTrigger 
                    value="pdf" 
                    className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-border/60 shadow-sm transition-all duration-200 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:shadow-primary/10 data-[state=inactive]:bg-muted/40 data-[state=inactive]:text-muted-foreground hover:bg-muted/60"
                  >
                    <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/15 text-primary">
                      <FileText className="h-4 w-4" />
                    </span>
                    PDF View
                  </TabsTrigger>
                  <TabsTrigger 
                    value="discussion"
                    className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-border/60 shadow-sm transition-all duration-200 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:shadow-primary/10 data-[state=inactive]:bg-muted/40 data-[state=inactive]:text-muted-foreground hover:bg-muted/60"
                  >
                    <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-accent/30 text-accent-foreground">
                      <MessageCircle className="h-4 w-4" />
                    </span>
                    Discussion
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pdf" className="flex-1 overflow-hidden mt-0 px-4 py-4">
                  {lesson.class_pdf_url ? (
                    <div className="h-full rounded-xl overflow-hidden border border-border shadow-sm">
                      <PdfViewer url={lesson.class_pdf_url} title={`${lesson.title} - PDF`} />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/80 p-8 h-full flex flex-col items-center justify-center text-center" style={{ background: 'linear-gradient(135deg, hsl(var(--muted) / 0.5), hsl(var(--card)))' }}>
                      <span className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-4">
                        <FileText className="h-7 w-7 text-primary/50" />
                      </span>
                      <p className="text-foreground font-semibold text-base">No PDF available</p>
                      <p className="text-xs text-muted-foreground mt-1.5 max-w-[220px]">PDF will appear here when uploaded by the instructor</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="discussion" className="flex-1 overflow-hidden mt-0 px-4 py-4">
                  <div className="bg-card rounded-xl border shadow-sm p-4 h-full flex flex-col">
                    {/* Comment input */}
                    <div className="flex gap-2 mb-4">
                      <Textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                        className="min-h-[60px] resize-none flex-1 rounded-xl"
                      />
                      <Button
                        size="icon"
                        className="shrink-0 self-end rounded-xl"
                        disabled={!commentText.trim()}
                        onClick={async () => {
                          if (!lesson?.id || !commentText.trim()) return;
                          const ok = await createComment({ lessonId: lesson.id, message: commentText.trim() });
                          if (ok) setCommentText("");
                        }}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Comments list */}
                    <ScrollArea className="flex-1">
                      {commentsLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                        </div>
                      ) : comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <span className="flex items-center justify-center h-12 w-12 rounded-2xl bg-accent/20 mb-3">
                            <MessageCircle className="h-6 w-6 text-muted-foreground/40" />
                          </span>
                          <p className="text-muted-foreground text-sm font-medium">No comments yet</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">Be the first to comment!</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {comments.map((c) => (
                            <div key={c.id} className="p-3 rounded-xl bg-muted/50 border border-border/40">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold text-foreground">{c.userName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}
                                </span>
                              </div>
                              <p className="text-sm text-foreground/80">{c.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LectureModal;
