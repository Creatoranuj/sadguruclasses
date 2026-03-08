import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Layout/Header";
import Sidebar from "@/components/Layout/Sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Play, FileText, BookOpen, Grid3X3,
  Lock, Clock, Star, CheckCircle, MessageCircle, Send,
  PanelLeftOpen, PanelLeftClose, X, ChevronLeft, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import UnifiedVideoPlayer from "@/components/video/UnifiedVideoPlayer";
import PdfViewer from "@/components/video/PdfViewer";
import { Breadcrumbs } from "@/components/course/Breadcrumbs";
import { ChapterCard } from "@/components/course/ChapterCard";
import { LectureCard } from "@/components/course";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LessonActionBar from "@/components/video/LessonActionBar";
import CourseContent from "@/components/lecture/CourseContent";
import { useLessonLikes } from "@/hooks/useLessonLikes";

interface Lesson {
  id: string;
  title: string;
  videoUrl: string;
  description: string | null;
  overview: string | null;
  isLocked: boolean | null;
  lectureType: string | null;
  position: number | null;
  youtubeId: string | null;
  createdAt: string | null;
  duration: number | null;
  chapterId: string | null;
  classPdfUrl: string | null;
}

interface Course {
  id: number;
  title: string;
  description: string | null;
  grade: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
}

interface Chapter {
  id: string;
  title: string;
  code: string;
  position: number;
  parent_id: string | null;
  lessonCount: number;
  completedLessons: number;
}

type ContentType = "all" | "lectures" | "pdfs" | "dpp" | "notes";

const typeMapping: Record<ContentType, string[]> = {
  all: [],
  lectures: ["VIDEO"],
  pdfs: ["PDF"],
  dpp: ["DPP"],
  notes: ["NOTES"],
};

const tabs: { id: ContentType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "lectures", label: "Lectures" },
  { id: "pdfs", label: "PDFs" },
  { id: "dpp", label: "DPPs" },
  { id: "notes", label: "Notes" },
];

const MyCourseDetail = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, isAdmin, isTeacher } = useAuth();
  const isAdminOrTeacher = isAdmin || isTeacher;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [courseSidebarOpen, setCourseSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const progressMarkedRef = useRef<Set<string>>(new Set());
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ContentType>("all");
  const [hasPurchased, setHasPurchased] = useState(false);
  const [chapterTab, setChapterTab] = useState<"chapters" | "material">("chapters");

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [selectedNoteUrl, setSelectedNoteUrl] = useState<{ url: string; title: string } | null>(null);
  const [inlineViewer, setInlineViewer] = useState<{ url: string; title: string } | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [activeDiscussionTab, setActiveDiscussionTab] = useState("overview");
  const [lastWatchedLessonId, setLastWatchedLessonId] = useState<string | null>(null);

  // Lesson likes — keyed to the selected lesson
  const { likeCount, hasLiked, toggleLike, loading: likesLoading } = useLessonLikes(selectedLesson?.id);

  useEffect(() => {
    const fetchComments = async () => {
      if (!selectedLesson) return;
      try {
        const { data, error } = await supabase
          .from("comments")
          .select("*")
          .eq("lesson_id", selectedLesson.id)
          .order("created_at", { ascending: true });
        if (!error && data) setComments(data.map((c: any) => ({
          id: c.id, userName: c.user_name, message: c.message, createdAt: c.created_at,
        })));
      } catch (err) {
        console.error("Error fetching comments:", err);
      }
    };
    fetchComments();
  }, [selectedLesson]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !selectedLesson || !user) return;
    try {
      const { error } = await supabase.from("comments").insert({
        lesson_id: selectedLesson.id,
        user_name: profile?.fullName || "Anonymous",
        message: newComment.trim(),
        user_id: user.id,
      } as any);
      if (error) throw error;
      setNewComment("");
      const { data } = await supabase.from("comments").select("*")
        .eq("lesson_id", selectedLesson.id).order("created_at", { ascending: true });
      if (data) setComments(data.map((c: any) => ({
        id: c.id, userName: c.user_name, message: c.message, createdAt: c.created_at,
      })));
      toast.success("Comment posted!");
    } catch (err) {
      console.error("Error posting comment:", err);
      toast.error("Failed to post comment");
    }
  };

  const getYouTubeThumbnail = (url: string) => {
    const pattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(pattern);
    if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    return null;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return;
      try {
        setLoading(true);

        const { data: courseData, error: courseErr } = await supabase
          .from("courses").select("*").eq("id", Number(courseId)).single();
        if (courseErr) throw courseErr;
        setCourse({
          id: courseData.id, title: courseData.title, description: courseData.description,
          grade: courseData.grade, imageUrl: courseData.image_url, thumbnailUrl: courseData.thumbnail_url,
        });

        if (user) {
          const { data: enrollment } = await supabase.from("enrollments").select("id")
            .eq("user_id", user.id).eq("course_id", Number(courseId)).eq("status", "active").maybeSingle();
          if (enrollment) setHasPurchased(true);
        }

        // Fetch top-level chapters
        const { data: chaptersData } = await supabase
          .from("chapters").select("*")
          .eq("course_id", Number(courseId))
          .is("parent_id", null)
          .order("position", { ascending: true });

        // Fetch all lessons
        const { data: lessonsData, error: lessonsErr } = await supabase
          .from("lessons").select("*").eq("course_id", Number(courseId))
          .order("position", { ascending: true });
        if (lessonsErr) throw lessonsErr;

        const mappedLessons: Lesson[] = (lessonsData || []).map((l: any, idx: number) => ({
          id: l.id, title: l.title, videoUrl: l.video_url, description: l.description,
          overview: l.overview, isLocked: l.is_locked, lectureType: l.lecture_type || "VIDEO",
          position: l.position || idx + 1, youtubeId: l.youtube_id, createdAt: l.created_at,
          duration: l.duration, chapterId: l.chapter_id,
          classPdfUrl: l.class_pdf_url ?? null,
        }));
        setLessons(mappedLessons);

        // Build chapters with lesson counts + completed counts
        let completedSet = new Set<string>();
        if (user?.id) {
          const { data: progressData } = await supabase
            .from("user_progress")
            .select("lesson_id")
            .eq("user_id", user.id)
            .eq("course_id", Number(courseId))
            .eq("completed", true);
          completedSet = new Set((progressData || []).map((p: any) => p.lesson_id));
          setCompletedLessonIds(completedSet);
        }

        const lessonCountMap: Record<string, number> = {};
        const completedCountMap: Record<string, number> = {};
        mappedLessons.forEach(l => {
          if (l.chapterId) {
            lessonCountMap[l.chapterId] = (lessonCountMap[l.chapterId] || 0) + 1;
            if (completedSet.has(l.id)) {
              completedCountMap[l.chapterId] = (completedCountMap[l.chapterId] || 0) + 1;
            }
          }
        });

        const totalLessons = mappedLessons.length;
        const totalCompleted = mappedLessons.filter(l => completedSet.has(l.id)).length;

        const allContentChapter: Chapter = {
          id: "__all__",
          code: "ALL",
          title: "All Content",
          position: -1,
          parent_id: null,
          lessonCount: totalLessons,
          completedLessons: totalCompleted,
        };

        const mappedChapters: Chapter[] = (chaptersData || []).map((ch: any) => ({
          id: ch.id,
          code: ch.code,
          title: ch.title,
          position: ch.position,
          parent_id: ch.parent_id,
          lessonCount: lessonCountMap[ch.id] || 0,
          completedLessons: completedCountMap[ch.id] || 0,
        }));

        setChapters([allContentChapter, ...mappedChapters]);

      } catch (err) {
        console.error("Error fetching course data:", err);
        toast.error("Could not load course content");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId, user]);

  useEffect(() => {
    const lessonId = searchParams.get("lesson");
    if (lessonId && lessons.length > 0) {
      const lesson = lessons.find(l => l.id === lessonId);
      if (lesson) setSelectedLesson(lesson);
    }
  }, [searchParams, lessons]);

  const selectedChapter = chapters.find(ch => ch.id === selectedChapterId);

  const filteredLessons = lessons.filter((lesson) => {
    const chapterMatch = !selectedChapterId || selectedChapterId === "__all__"
      ? true
      : lesson.chapterId === selectedChapterId;
    const typeMatch = activeTab === "all" ? true : typeMapping[activeTab].includes(lesson.lectureType || "VIDEO");
    return chapterMatch && typeMatch;
  });

  const tabCounts = {
    all: selectedChapterId && selectedChapterId !== "__all__"
      ? lessons.filter(l => l.chapterId === selectedChapterId).length
      : lessons.length,
    lectures: (selectedChapterId && selectedChapterId !== "__all__"
      ? lessons.filter(l => l.chapterId === selectedChapterId)
      : lessons).filter(l => l.lectureType === "VIDEO").length,
    pdfs: (selectedChapterId && selectedChapterId !== "__all__"
      ? lessons.filter(l => l.chapterId === selectedChapterId)
      : lessons).filter(l => l.lectureType === "PDF").length,
    dpp: (selectedChapterId && selectedChapterId !== "__all__"
      ? lessons.filter(l => l.chapterId === selectedChapterId)
      : lessons).filter(l => l.lectureType === "DPP").length,
    notes: (selectedChapterId && selectedChapterId !== "__all__"
      ? lessons.filter(l => l.chapterId === selectedChapterId)
      : lessons).filter(l => l.lectureType === "NOTES").length,
  };

  const handleContentClick = (lesson: Lesson) => {
    if (lesson.isLocked && !hasPurchased && !isAdminOrTeacher) {
      toast.error("This content is locked. Please purchase the course.");
      navigate(`/buy-course?id=${courseId}`);
      return;
    }
    if (lesson.lectureType === "VIDEO") {
      setSelectedLesson(lesson);
      setSearchParams({ lesson: lesson.id });
    } else {
      if (lesson.videoUrl) {
        setInlineViewer({ url: lesson.videoUrl, title: lesson.title });
      }
    }
  };

  const handleClosePlayer = () => {
    setSelectedLesson(null);
    setSearchParams({});
  };

  // ── AUTO-MARK PROGRESS AT 90% ──────────────────────────────
  const handleVideoProgress = async (state: { played: number; playedSeconds: number }) => {
    if (!user || !selectedLesson || !courseId) return;
    if (state.played < 0.9) return;
    if (progressMarkedRef.current.has(selectedLesson.id)) return;
    progressMarkedRef.current.add(selectedLesson.id);

    try {
      const { data: existing } = await supabase
        .from("user_progress")
        .select("id, completed")
        .eq("user_id", user.id)
        .eq("lesson_id", selectedLesson.id)
        .maybeSingle();

      if (existing?.completed) return;

      if (existing) {
        await supabase.from("user_progress").update({
          completed: true,
          watched_seconds: Math.floor(state.playedSeconds),
          last_watched_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("user_progress").insert({
          user_id: user.id,
          lesson_id: selectedLesson.id,
          course_id: Number(courseId),
          completed: true,
          watched_seconds: Math.floor(state.playedSeconds),
          last_watched_at: new Date().toISOString(),
        } as any);
      }

      const lessonId = selectedLesson.id;
      setCompletedLessonIds(prev => new Set([...prev, lessonId]));
      setChapters(prev => prev.map(ch => {
        if (ch.id === selectedLesson.chapterId) {
          if (ch.completedLessons >= ch.lessonCount) return ch;
          return { ...ch, completedLessons: ch.completedLessons + 1 };
        }
        if (ch.id === "__all__") {
          if (ch.completedLessons >= ch.lessonCount) return ch;
          return { ...ch, completedLessons: ch.completedLessons + 1 };
        }
        return ch;
      }));

      toast.success("Lesson marked as complete! 🎉");
    } catch (err) {
      console.error("Error marking lesson complete:", err);
      progressMarkedRef.current.delete(selectedLesson.id);
    }
  };

  // Breadcrumbs
  const chapterBreadcrumbs = [
    { label: "My Courses", href: "/my-courses" },
    ...(course ? [{ label: course.title }] : []),
  ];

  const lessonBreadcrumbs = [
    { label: "My Courses", href: "/my-courses" },
    ...(course ? [{ label: course.title, href: `/my-courses/${courseId}` }] : []),
    ...(selectedChapter && selectedChapter.id !== "__all__"
      ? [{ label: `${selectedChapter.code} : ${selectedChapter.title}` }]
      : []),
  ];

  const playerBreadcrumbs = [
    { label: "My Courses", href: "/my-courses" },
    ...(course ? [{ label: course.title, href: `/my-courses/${courseId}` }] : []),
    ...(selectedLesson ? [{ label: selectedLesson.title }] : []),
  ];

  // ── LOADING STATE ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} userName={profile?.fullName || "User"} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 p-5 space-y-3 max-w-2xl mx-auto w-full">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} userName={profile?.fullName || "User"} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Course not found</p>
        </div>
      </div>
    );
  }

  // ── MAIN VIEW ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onMenuClick={() => setSidebarOpen(true)} userName={profile?.fullName || "User"} />

      {/* Inline PDF Viewer overlay */}
      {inlineViewer && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <header className="flex items-center gap-2 border-b bg-background shrink-0">
            <Button variant="ghost" size="icon" className="ml-2 shrink-0" onClick={() => setInlineViewer(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0 overflow-hidden">
              <Breadcrumbs
                segments={[
                  { label: "My Courses", href: "/my-courses" },
                  { label: course?.title || "", href: `/my-courses/${courseId}` },
                  { label: inlineViewer.title },
                ]}
                className="border-b-0 py-3 px-1 bg-transparent backdrop-blur-none"
              />
            </div>
          </header>
          <div className="flex-1 min-h-0 p-3">
            <PdfViewer url={inlineViewer.url} title={inlineViewer.title} />
          </div>
        </div>
      )}

      {/* Mobile course sidebar backdrop */}
      {courseSidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setCourseSidebarOpen(false)} />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Chapter Sidebar */}
        <aside className={cn(
          "fixed md:sticky top-0 md:top-auto z-40 h-full md:h-auto flex-shrink-0 bg-card border-r flex flex-col transition-all duration-300",
          courseSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
          sidebarCollapsed ? "md:w-0 md:overflow-hidden md:border-r-0" : "w-64 md:w-64"
        )}>
          <div className="flex items-center justify-between px-3 py-3 border-b shrink-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subjects</span>
            <button onClick={() => setCourseSidebarOpen(false)} className="md:hidden p-1 rounded hover:bg-muted text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search box */}
          <div className="px-3 py-2 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search chapters..."
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-muted rounded-md border-0 outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
              />
              {sidebarSearch && (
                <button
                  onClick={() => setSidebarSearch("")}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {(() => {
                const filteredSidebarChapters = sidebarSearch.trim()
                  ? chapters.filter(ch =>
                      ch.title.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
                      ch.code.toLowerCase().includes(sidebarSearch.toLowerCase())
                    )
                  : chapters;

                if (filteredSidebarChapters.length === 0) {
                  return (
                    <p className="text-xs text-muted-foreground text-center py-4 px-2">
                      No chapters found
                    </p>
                  );
                }

                return filteredSidebarChapters.map((chapter) => {
                  const isActive = selectedChapterId === chapter.id || (!selectedChapterId && chapter.id === "__all__");
                  const pct = chapter.lessonCount > 0
                    ? Math.round((chapter.completedLessons / chapter.lessonCount) * 100)
                    : 0;
                  return (
                    <button
                      key={chapter.id}
                      onClick={() => {
                        setSelectedChapterId(chapter.id);
                        setSelectedLesson(null);
                        setSearchParams({});
                        setCourseSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex flex-col px-3 py-2 rounded-lg text-sm text-left transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium border-l-2 border-primary pl-2.5"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {/* Top row */}
                      <div className="flex items-center gap-2 w-full">
                        <span className={cn(
                          "text-xs font-bold px-1.5 py-0.5 rounded shrink-0",
                          isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          {chapter.code}
                        </span>
                        <span className="flex-1 truncate leading-snug">{chapter.title}</span>
                        {chapter.lessonCount > 0 && (
                          <span className={cn(
                            "text-xs px-1 py-0.5 rounded-full shrink-0",
                            isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {chapter.lessonCount}
                          </span>
                        )}
                      </div>
                      {/* Progress bar row */}
                      {chapter.lessonCount > 0 && (
                        <div className="mt-1.5 w-full space-y-0.5 pl-7">
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                pct === 100 ? "bg-green-500" : "bg-primary"
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {chapter.completedLessons}/{chapter.lessonCount} done
                          </p>
                        </div>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          </ScrollArea>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto min-w-0 bg-background">
          {/* Sticky header */}
          <header className="px-4 pt-5 pb-3 sticky top-0 z-20 bg-background border-b">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (selectedLesson) {
                    handleClosePlayer();
                  } else if (selectedChapterId) {
                    setSelectedChapterId(null);
                  } else {
                    navigate("/my-courses");
                  }
                }}
                className="text-primary hover:opacity-80 transition-opacity"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <h1 className="text-lg font-semibold text-foreground line-clamp-1 flex-1">
                {selectedLesson
                  ? selectedLesson.title
                  : selectedChapter && selectedChapter.id !== "__all__"
                    ? `${selectedChapter.code} : ${selectedChapter.title}`
                    : course.title}
              </h1>
              {/* Desktop sidebar collapse toggle */}
              <button
                onClick={() => setSidebarCollapsed(prev => !prev)}
                className="hidden md:flex p-2 rounded-lg border bg-card text-muted-foreground hover:bg-muted transition-colors"
                title={sidebarCollapsed ? "Show chapters" : "Hide chapters"}
              >
                {sidebarCollapsed
                  ? <PanelLeftOpen className="h-4 w-4" />
                  : <PanelLeftClose className="h-4 w-4" />
                }
              </button>
              {/* Mobile sidebar toggle */}
              <button
                onClick={() => setCourseSidebarOpen(true)}
                className="md:hidden p-2 rounded-lg border bg-card text-muted-foreground hover:bg-muted transition-colors"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Breadcrumbs */}
          <Breadcrumbs
            segments={selectedLesson ? playerBreadcrumbs : selectedChapterId ? lessonBreadcrumbs : chapterBreadcrumbs}
            className="sticky top-[60px] z-10"
          />

          {/* ── STATE 1: Chapter grid ── */}
          {!selectedChapterId && !selectedLesson && (
            <>
              <div className="flex gap-6 px-5 border-b border-border">
                <button
                  onClick={() => setChapterTab("chapters")}
                  className={cn(
                    "pb-3 text-base font-medium relative transition-colors",
                    chapterTab === "chapters" ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  Subjects
                  {chapterTab === "chapters" && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setChapterTab("material")}
                  className={cn(
                    "pb-3 text-base font-medium relative transition-colors",
                    chapterTab === "material" ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  Study Material
                  {chapterTab === "material" && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-full" />
                  )}
                </button>
              </div>

              <div className="p-5 space-y-3">
                {chapterTab === "chapters" &&
                  chapters.map((chapter) => (
                    <ChapterCard
                      key={chapter.id}
                      code={chapter.code}
                      title={chapter.title}
                      lectureCount={chapter.lessonCount}
                      completedLectures={chapter.completedLessons}
                      onClick={() => setSelectedChapterId(chapter.id)}
                    />
                  ))
                }
                {chapterTab === "material" && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No study material available yet.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── STATE 2: Lesson list ── */}
          {selectedChapterId && !selectedLesson && (
            <>
              {/* Tab bar */}
              <div className="flex gap-3 px-5 py-2 overflow-x-auto scrollbar-none">
                {tabs.map((tab) => {
                  const count = tabCounts[tab.id];
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {tab.label}
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                        isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Lessons */}
              <div className="p-5 space-y-4">
                {filteredLessons.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">No content found</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">Try switching tabs or check back later.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredLessons.map((lesson) => (
                      <LectureCard
                        key={lesson.id}
                        id={lesson.id}
                        title={lesson.title}
                        lectureType={(lesson.lectureType || "VIDEO") as "VIDEO" | "PDF" | "DPP" | "NOTES" | "TEST"}
                        position={lesson.position ?? undefined}
                        duration={lesson.duration}
                        createdAt={lesson.createdAt}
                        isLocked={!!lesson.isLocked && !hasPurchased && !isAdminOrTeacher}
                        onClick={() => handleContentClick(lesson)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── STATE 3: Inline lesson player ── */}
          {selectedLesson && (
            <div className="flex flex-col">
              {/* Video player */}
              <div className="w-full bg-black">
                <UnifiedVideoPlayer
                  url={selectedLesson.videoUrl}
                  title={selectedLesson.title}
                  onReady={() => console.log('Video ready')}
                  onProgress={handleVideoProgress}
                />
              </div>

              {/* Lesson meta */}
              <div className="px-4 py-3 border-b bg-card">
                <h2 className="font-semibold text-lg text-foreground mb-1">{selectedLesson.title}</h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {selectedLesson.duration ? `${Math.floor(selectedLesson.duration / 60)}m` : "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    4.8 Rating
                  </span>
                </div>
              </div>

              {/* Like / Doubts / PDF action bar */}
              <LessonActionBar
                likeCount={likeCount}
                hasLiked={hasLiked}
                onLike={toggleLike}
                onDoubts={() => setActiveDiscussionTab("discussion")}
                onDownloadPdf={selectedLesson.classPdfUrl ? () => window.open(selectedLesson.classPdfUrl!, "_blank") : undefined}
                hasPdf={!!selectedLesson.classPdfUrl}
                likesLoading={likesLoading}
                lessonTitle={selectedLesson.title}
              />

              {/* Tabs: Overview / Resources / Notes / Discussion */}
              <Tabs value={activeDiscussionTab} onValueChange={setActiveDiscussionTab} className="w-full">
                <TabsList className="w-full grid grid-cols-4 bg-muted/50 rounded-none border-b h-auto py-0">
                  <TabsTrigger value="overview" className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary">Overview</TabsTrigger>
                  <TabsTrigger value="resources" className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary">Resources</TabsTrigger>
                  <TabsTrigger value="notes" className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary">Notes</TabsTrigger>
                  <TabsTrigger value="discussion" className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary">Discussion</TabsTrigger>
                </TabsList>

                {/* Overview */}
                <TabsContent value="overview" className="p-4 mt-0">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">About this lesson</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {selectedLesson.overview || selectedLesson.description || "No overview available for this lesson."}
                      </p>
                    </div>
                    {!selectedLesson.overview && !selectedLesson.description && (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                          <p className="text-sm text-primary font-medium">Content coming soon</p>
                        </div>
                      </div>
                    )}

                    {/* Course Content playlist with progress */}
                    <CourseContent
                      lessons={filteredLessons
                        .filter(l => l.lectureType === "VIDEO")
                        .map(l => ({
                          id: l.id,
                          title: l.title,
                          duration: l.duration ?? 0,
                          isCompleted: completedLessonIds.has(l.id),
                          isCurrent: l.id === selectedLesson.id,
                        }))}
                      completedCount={filteredLessons.filter(l => l.lectureType === "VIDEO" && completedLessonIds.has(l.id)).length}
                      onLessonClick={(lessonId) => {
                        const lesson = lessons.find(l => l.id === lessonId);
                        if (lesson) { setSelectedLesson(lesson); setSearchParams({ lesson: lessonId }); }
                      }}
                    />
                  </div>
                </TabsContent>

                {/* Resources */}
                <TabsContent value="resources" className="mt-0">
                  {(() => {
                    const classPdfItem = selectedLesson.classPdfUrl
                      ? [{ id: 'class-pdf', title: `${selectedLesson.title} - Class PDF`, videoUrl: selectedLesson.classPdfUrl, lectureType: 'PDF' }]
                      : [];
                    const chapterResources = lessons.filter(l =>
                      (l.lectureType === "PDF" || l.lectureType === "DPP") &&
                      l.chapterId === selectedLesson.chapterId
                    );
                    const resList = [...classPdfItem, ...chapterResources];
                    if (resList.length === 0) return (
                      <div className="p-4">
                        <p className="text-muted-foreground text-sm">No resources available for this lesson.</p>
                      </div>
                    );
                    const activeRes = inlineViewer && resList.find(r => r.videoUrl === inlineViewer.url)
                      ? inlineViewer
                      : { url: resList[0].videoUrl, title: resList[0].title };
                    return (
                      <div className="flex flex-col">
                        {resList.length > 1 && (
                          <div className="flex flex-wrap gap-2 px-4 py-2 border-b bg-muted/30">
                            {resList.map(r => (
                              <button
                                key={r.id}
                                onClick={() => setInlineViewer({ url: r.videoUrl, title: r.title })}
                                className={cn(
                                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                                  activeRes.url === r.videoUrl
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-card text-muted-foreground border-border hover:border-primary"
                                )}
                              >
                                {r.title}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="px-3 pb-3 pt-2">
                          <PdfViewer url={activeRes.url} title={activeRes.title} />
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* Notes */}
                <TabsContent value="notes" className="mt-0">
                  {(() => {
                    const notesList = lessons.filter(l =>
                      l.lectureType === "NOTES" && l.chapterId === selectedLesson.chapterId
                    );
                    if (notesList.length === 0) return (
                      <div className="p-4">
                        <p className="text-muted-foreground text-sm">No notes available for this lesson.</p>
                      </div>
                    );
                    const activeNote = selectedNoteUrl || { url: notesList[0].videoUrl, title: notesList[0].title };
                    return (
                      <div className="flex flex-col">
                        {notesList.length > 1 && (
                          <div className="flex flex-wrap gap-2 px-4 py-2 border-b bg-muted/30">
                            {notesList.map(note => (
                              <button
                                key={note.id}
                                onClick={() => setSelectedNoteUrl({ url: note.videoUrl, title: note.title })}
                                className={cn(
                                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                                  activeNote.url === note.videoUrl
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-card text-muted-foreground border-border hover:border-primary"
                                )}
                              >
                                {note.title}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="px-3 pb-3 pt-2">
                          <PdfViewer url={activeNote.url} title={activeNote.title} />
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* Discussion */}
                <TabsContent value="discussion" className="p-4 mt-0">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground">Discussion</h3>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Ask a question or share your thoughts..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="resize-none"
                        rows={2}
                      />
                      <Button onClick={handlePostComment} size="icon" className="shrink-0">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {comments.length > 0 ? (
                        comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <MessageCircle className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-foreground text-sm">{comment.userName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{comment.message}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm text-center py-8">
                          No discussions yet. Be the first to comment!
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MyCourseDetail;
