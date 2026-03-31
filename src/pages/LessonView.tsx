import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import UnifiedVideoPlayer from "../components/video/UnifiedVideoPlayer";
import { LoadingSpinner } from "../components/ui/loading-spinner";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "../components/ui/resizable";
import { useIsMobile } from "../hooks/use-mobile";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  ArrowLeft, Play, Lock, Clock,
  FileText, MessageCircle, CheckCircle, Send, Library, ImageIcon, X,
  BookOpen, HelpCircle, ChevronRight, ChevronDown, ChevronUp, Edit2, Save, Sparkles, ListVideo, Loader2, Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import DriveEmbedViewer from "../components/course/DriveEmbedViewer";
import Breadcrumbs from "../components/course/Breadcrumbs";
import { extractArchiveId } from "../utils/fileUtils";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { useComments } from "../hooks/useComments";
import { useAuth } from "../contexts/AuthContext";
import { ArchiveBookList, type ArchiveBook } from "../components/archive";
import { Textarea } from "../components/ui/textarea";
import LessonActionBar from "../components/video/LessonActionBar";
import VideoSummarizer from "../components/video/VideoSummarizer";
import PdfViewer from "../components/video/PdfViewer";
import VideoRecommendations from "../components/video/VideoRecommendations";
import PdfSelectPopup, { type PdfItem } from "../components/video/PdfSelectPopup";

import { useLessonLikes } from "../hooks/useLessonLikes";
import { useLessonPdfs } from "../hooks/useLessonPdfs";
import ObsidianNotes from "../components/lecture/ObsidianNotes";
import { useDownloads } from "../hooks/useDownloads";

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

// Type definitions
interface Lesson {
  id: string;
  title: string;
  video_url: string;
  is_locked: boolean | null;
  description: string | null;
  overview: string | null;
  course_id: number | null;
  chapter_id: string | null;
  created_at: string | null;
  class_pdf_url: string | null;
  like_count: number | null;
  lecture_type: string | null;
  thumbnail_url: string | null;
}

interface Chapter {
  id: string;
  code: string;
  title: string;
}

/** Collapsible PDF section for Overview tab */
function CollapsiblePdfSection({
  lessonPdfs,
  classPdfUrl,
  selectedPdf,
  onSelectPdf,
  onClosePdf,
}: {
  lessonPdfs: { id: string; file_name: string; file_url: string; file_size?: number | null }[];
  classPdfUrl?: string | null;
  selectedPdf: PdfItem | null;
  onSelectPdf: (pdf: PdfItem) => void;
  onClosePdf: () => void;
}) {
  const [open, setOpen] = useState(false);
  const count = lessonPdfs.length + (classPdfUrl ? 1 : 0);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Lecture Notes & PDFs</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{count}</Badge>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="divide-y divide-border">
          {classPdfUrl && (
            <button
              onClick={() => onSelectPdf({ id: 'class-pdf', file_name: 'Class PDF', file_url: classPdfUrl })}
              className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-accent/10 transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Class PDF</p>
                <p className="text-xs text-muted-foreground">Tap to view</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          {lessonPdfs.map((pdf) => (
            <button
              key={pdf.id}
              onClick={() => onSelectPdf({ id: pdf.id, file_name: pdf.file_name, file_url: pdf.file_url, file_size: pdf.file_size })}
              className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-accent/10 transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{pdf.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {pdf.file_size ? `${(pdf.file_size / 1024).toFixed(0)} KB` : 'Tap to view'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}

          {/* Inline PDF viewer */}
          {selectedPdf && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-30 h-8 w-8 bg-background/80 backdrop-blur-sm rounded-full"
                onClick={onClosePdf}
              >
                <X className="h-4 w-4" />
              </Button>
              <PdfViewer url={selectedPdf.file_url} title={selectedPdf.file_name} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const LessonView = () => {
  const isMobile = useIsMobile();
  // Support both URL params and query params
  const { courseId: paramCourseId } = useParams();
  const [searchParams] = useSearchParams();
  const queryCourseId = searchParams.get("courseId");
  const lessonIdParam = searchParams.get("lessonId");
  const courseId = paramCourseId || queryCourseId;
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  
  // Video duration state - actual duration from player
  const [videoDuration, setVideoDuration] = useState(0);
  
  // Access Control
  const [hasPurchased, setHasPurchased] = useState(false);
  
  // Notes state (local storage based for persistence)
  const [noteContent, setNoteContent] = useState("");
  
  // Comment state
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Archive.org books state (stored per lesson in localStorage for now)
  const [archiveBooks, setArchiveBooks] = useState<ArchiveBook[]>([]);
  
  // Lesson overview override map (avoids page reload after admin saves topics)
  const [lessonOverviewMap, setLessonOverviewMap] = useState<Record<string, string>>({});
  
  // Active tab state for controlled Tabs component
  const [activeTab, setActiveTab] = useState("overview");
  const tabsRef = useRef<HTMLDivElement>(null);

  // Reset active tab when lesson changes
  useEffect(() => {
    if (currentLesson?.class_pdf_url) {
      setActiveTab("pdf");
    } else {
      setActiveTab("overview");
    }
  }, [currentLesson?.id]);
  
  // Comments hook
  // Comments hook
  const { comments, loading: commentsLoading, createComment, fetchComments } = useComments(currentLesson?.id || undefined);
  
  // Likes hook
  const { likeCount, hasLiked, toggleLike, loading: likesLoading } = useLessonLikes(currentLesson?.id || undefined);

  // Lesson PDFs hook
  const { pdfs: lessonPdfs, loading: pdfsLoading } = useLessonPdfs(currentLesson?.id || undefined);

   // PDF viewer state
  const [showPdfPopup, setShowPdfPopup] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<PdfItem | null>(null);
  const [isPiPMode, setIsPiPMode] = useState(false);

  // Downloads hook
  const { addDownload } = useDownloads();
  
  // Progress tracking state
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const progressSavedRef = useRef<string | null>(null);

  // DPP (Daily Practice Problems) for this lesson/chapter
  const [lessonDpps, setLessonDpps] = useState<{ id: string; title: string; total_marks: number | null; type: string | null }[]>([]);
  const [dppsLoading, setDppsLoading] = useState(false);

  // Load completed lessons from DB on mount
  useEffect(() => {
    if (!user || !courseId) return;
    supabase.from('user_progress')
      .select('lesson_id')
      .eq('user_id', user.id)
      .eq('course_id', Number(courseId))
      .eq('completed', true)
      .then(({ data }) => {
        if (data) setCompletedLessonIds(new Set(data.map(r => r.lesson_id)));
      });
  }, [user, courseId]);

  // Fetch DPPs for current lesson or chapter
  useEffect(() => {
    if (!currentLesson) { setLessonDpps([]); return; }
    const fetchDpps = async () => {
      setDppsLoading(true);
      let query = supabase
        .from("quizzes")
        .select("id, title, total_marks, type")
        .eq("is_published", true);

      // Try lesson_id first, then chapter_id, then course_id
      if (currentLesson.id) {
        const { data: byLesson } = await query.eq("lesson_id", currentLesson.id);
        if (byLesson && byLesson.length > 0) {
          setLessonDpps(byLesson);
          setDppsLoading(false);
          return;
        }
      }
      if (currentLesson.chapter_id) {
        const { data: byChapter } = await supabase
          .from("quizzes")
          .select("id, title, total_marks, type")
          .eq("is_published", true)
          .eq("chapter_id", currentLesson.chapter_id);
        if (byChapter && byChapter.length > 0) {
          setLessonDpps(byChapter);
          setDppsLoading(false);
          return;
        }
      }
      if (currentLesson.course_id) {
        const { data: byCourse } = await supabase
          .from("quizzes")
          .select("id, title, total_marks, type")
          .eq("is_published", true)
          .eq("course_id", currentLesson.course_id)
          .limit(5);
        setLessonDpps(byCourse || []);
      } else {
        setLessonDpps([]);
      }
      setDppsLoading(false);
    };
    fetchDpps();
  }, [currentLesson?.id, currentLesson?.chapter_id, currentLesson?.course_id]);

  // Reset saved ref and close PDF viewer when lesson changes
  useEffect(() => {
    progressSavedRef.current = null;
    setSelectedPdf(null);
    setShowPdfPopup(false);
  }, [currentLesson?.id]);

  // Handle video time update → save progress at 80%
  const handleVideoTimeUpdate = useCallback(async (currentTime: number, duration: number) => {
    if (!user || !currentLesson || !courseId || duration <= 0) return;
    const progress = currentTime / duration;
    if (progress >= 0.8 && progressSavedRef.current !== currentLesson.id) {
      progressSavedRef.current = currentLesson.id;
      try {
        await supabase.from('user_progress').upsert({
          user_id: user.id,
          lesson_id: currentLesson.id,
          course_id: Number(courseId),
          completed: true,
          watched_seconds: Math.floor(currentTime),
          last_watched_at: new Date().toISOString(),
        }, { onConflict: 'user_id,lesson_id' });
        setCompletedLessonIds(prev => new Set([...prev, currentLesson.id]));
      } catch (err) {
        console.error('Progress save error:', err);
      }
    }
  }, [user, currentLesson, courseId]);
  
  // Check if user is admin or teacher
  const { isAdmin, isTeacher } = useAuth();
  const isAdminOrTeacher = isAdmin || isTeacher;

  // Load notes from localStorage when lesson changes
  useEffect(() => {
    if (currentLesson?.id) {
      const savedNote = localStorage.getItem(`lesson_note_${currentLesson.id}`);
      if (savedNote) {
        setNoteContent(savedNote);
      } else {
        setNoteContent("");
      }
    }
  }, [currentLesson?.id]);

  // Auto-save notes to localStorage
  useEffect(() => {
    if (currentLesson?.id && noteContent) {
      const timer = setTimeout(() => {
        localStorage.setItem(`lesson_note_${currentLesson.id}`, noteContent);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [noteContent, currentLesson?.id]);

  // Load archive books from localStorage when lesson changes
  useEffect(() => {
    if (currentLesson?.id) {
      const savedBooks = localStorage.getItem(`lesson_archive_books_${currentLesson.id}`);
      if (savedBooks) {
        try {
          setArchiveBooks(JSON.parse(savedBooks));
        } catch {
          setArchiveBooks([]);
        }
      } else {
        setArchiveBooks([]);
      }
    }
  }, [currentLesson?.id]);

  // Archive books management functions
  const handleAddArchiveBook = (book: Omit<ArchiveBook, 'id'>) => {
    if (!currentLesson?.id) return;
    
    const newBook: ArchiveBook = {
      ...book,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    
    const updatedBooks = [...archiveBooks, newBook];
    setArchiveBooks(updatedBooks);
    localStorage.setItem(`lesson_archive_books_${currentLesson.id}`, JSON.stringify(updatedBooks));
    toast.success("Book added to lesson resources!");
  };

  const handleRemoveArchiveBook = (bookId: string) => {
    if (!currentLesson?.id) return;
    
    const updatedBooks = archiveBooks.filter(b => b.id !== bookId);
    setArchiveBooks(updatedBooks);
    localStorage.setItem(`lesson_archive_books_${currentLesson.id}`, JSON.stringify(updatedBooks));
    toast.success("Book removed from lesson resources");
  };

  // Fetch secure video/pdf URL with retry logic (exponential backoff)
  const fetchSecureLessonUrl = async (lessonId: string, retries = 3): Promise<any> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('get-lesson-url', {
          body: { lesson_id: lessonId },
        });
        if (error) {
          console.error(`[LessonView] Edge function error (attempt ${attempt + 1}):`, error);
          if (attempt === retries - 1) {
            toast.error("Failed to load lesson URL. Please retry.");
            return null;
          }
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          continue;
        }
        return data;
      } catch {
        if (attempt === retries - 1) {
          toast.error("Network error loading lesson URL");
          return null;
        }
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
    return null;
  };

  // --- 1. DATA FETCHING ---
  useEffect(() => {
    const initPage = async () => {
      if (!courseId) return;

      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        // Check Purchase
        if (user) {
          const { data: enrollment } = await supabase
            .from('enrollments')
            .select('*')
            .eq('user_id', user.id)
            .eq('course_id', Number(courseId))
            .eq('status', 'active')
            .maybeSingle();

          if (enrollment) setHasPurchased(true);
        }

        const [{ data: courseData, error: courseError }, { data: chapterData, error: chapterError }, { data: lessonData, error: lessonError }] = await Promise.all([
          supabase
            .from('courses')
            .select('*')
            .eq('id', Number(courseId))
            .single(),
          supabase
            .from('chapters')
            .select('id, code, title')
            .eq('course_id', Number(courseId))
            .order('position', { ascending: true }),
          supabase
            .from('lessons')
            .select('id, title, is_locked, description, overview, course_id, chapter_id, created_at, like_count, position, lecture_type, thumbnail_url')
            .eq('course_id', Number(courseId))
            .order('position', { ascending: true })
            .order('created_at', { ascending: true })
        ]);
        if (courseError) throw courseError;
        if (chapterError) throw chapterError;
        if (lessonError) throw lessonError;

        setCourse(courseData);
        setChapters(chapterData || []);

        const mappedLessons: Lesson[] = (lessonData || []).map((l: any) => ({
          ...l,
          video_url: '',
          class_pdf_url: null,
          overview: l.overview || null,
          lecture_type: l.lecture_type || null,
        }));

        setLessons(mappedLessons);

        if (mappedLessons.length > 0) {
          // If lessonId query param provided, select that lesson; otherwise first
          const targetLesson = lessonIdParam
            ? mappedLessons.find(l => l.id === lessonIdParam) || mappedLessons[0]
            : mappedLessons[0];
          const urls = await fetchSecureLessonUrl(targetLesson.id);
          setCurrentLesson({
            ...targetLesson,
            video_url: urls?.video_url || '',
            class_pdf_url: urls?.class_pdf_url || null,
          });
        }

      } catch (error) {
        console.error("Error loading lessons:", error);
        toast.error("Could not load course content");
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [courseId]);

  // Refetch comments when lesson changes
  useEffect(() => {
    if (currentLesson?.id) {
      fetchComments();
    }
  }, [currentLesson?.id, fetchComments]);

  // --- Logic ---
  const canAccessLesson = (lesson: Lesson) => {
    return !lesson.is_locked || hasPurchased;
  };

  const handleLessonClick = async (lesson: Lesson) => {
    if (canAccessLesson(lesson)) {
      // Fetch secure URLs via Edge Function
      const urls = await fetchSecureLessonUrl(lesson.id);
      setCurrentLesson({
        ...lesson,
        video_url: urls?.video_url || '',
        class_pdf_url: urls?.class_pdf_url || null,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.error("Course locked! Please buy to watch.");
      navigate(`/buy-course?id=${courseId}`);
    }
  };


  // Post comment
  const handlePostComment = async () => {
    if (!newComment.trim() && !commentImage) {
      toast.error("Please enter a comment or attach an image");
      return;
    }

    if (!user) {
      toast.error("Please login to comment");
      return;
    }

    if (!currentLesson?.id) return;

    setIsPostingComment(true);
    
    let imageUrl: string | undefined;
    
    // Upload image if present
    if (commentImage) {
      setUploadingImage(true);
      try {
        const filePath = `${user.id}/${Date.now()}_${commentImage.name}`;
        const { error: uploadError } = await supabase.storage
          .from("comment-images")
          .upload(filePath, commentImage);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("comment-images")
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      } catch (err: any) {
        toast.error("Failed to upload image");
        setIsPostingComment(false);
        setUploadingImage(false);
        return;
      }
      setUploadingImage(false);
    }
    
    const success = await createComment(
      { lessonId: currentLesson.id, message: newComment.trim() || "📷 Image", imageUrl },
      profile?.fullName || user.email || 'Anonymous'
    );

    if (success) {
      setNewComment("");
      setCommentImage(null);
      setCommentImagePreview(null);
    }
    setIsPostingComment(false);
  };

  const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setCommentImage(file);
    setCommentImagePreview(URL.createObjectURL(file));
  };

  const removeCommentImage = () => {
    setCommentImage(null);
    if (commentImagePreview) URL.revokeObjectURL(commentImagePreview);
    setCommentImagePreview(null);
  };

  // Format relative time
  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const currentChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === currentLesson?.chapter_id) || null,
    [chapters, currentLesson?.chapter_id]
  );
  const fromParam = searchParams.get('from');
  const fromMyCourses = fromParam === 'my-courses';
  const fromAllClasses = fromParam === 'all-classes';
  const fromCourses = fromParam === 'courses';
  const breadcrumbSegments = useMemo(() => {
    const rootLabel = fromMyCourses ? 'My Courses' : fromAllClasses ? 'All Classes' : fromCourses ? 'Courses' : 'Courses';
    const rootHref = fromMyCourses ? '/my-courses' : fromAllClasses ? '/all-classes' : '/courses';
    const chaptersHref = `/classes/${courseId}/chapters${fromParam ? `?from=${fromParam}` : ''}`;
    const chapterHref = currentChapter ? `/classes/${courseId}/chapter/${currentChapter.id}${fromParam ? `?from=${fromParam}` : ''}` : undefined;
    return [
      { label: rootLabel, href: rootHref },
      ...(course ? [{ label: course.title, href: chaptersHref }] : []),
      ...(currentChapter ? [{ label: `${currentChapter.code} : ${currentChapter.title}`, href: chapterHref }] : []),
      ...(currentLesson ? [{ label: currentLesson.title }] : []),
    ];
  }, [course, courseId, currentChapter, currentLesson, fromParam, fromMyCourses, fromAllClasses, fromCourses]);

  if (loading) {
    return <LoadingSpinner fullPage size="lg" text="Loading lesson..." />;
  }

  if (!course) return <div className="p-10 text-center">Course not found</div>;

  // Calculate Progress Logic
  const completedCount = completedLessonIds.size;
  const progressPercentage = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  // ── FULL-PAGE DOCUMENT VIEW for PDF / DPP / NOTES ──────────────────────────
  const isDocumentType = currentLesson && ['PDF', 'DPP', 'NOTES'].includes(currentLesson.lecture_type?.toUpperCase() ?? '');

  if (isDocumentType && currentLesson) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Compact header */}
        <header className="bg-card border-b flex items-center gap-3 px-4 py-3 sticky top-0 z-30 shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => {
            if (fromMyCourses) navigate(`/my-courses/${courseId}`);
            else if (fromAllClasses) navigate('/all-classes');
            else if (fromCourses) navigate(`/course/${courseId}`);
            else navigate(-1);
          }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-foreground line-clamp-1">{currentLesson.title}</h1>
            <p className="text-xs text-muted-foreground line-clamp-1">{course?.title}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {currentLesson.lecture_type}
          </Badge>
        </header>

        {/* Full-page document viewer */}
        <div className="flex-1 flex flex-col">
          <PdfViewer
            url={currentLesson.video_url || currentLesson.class_pdf_url || ''}
            title={currentLesson.title}
          />
        </div>

        {/* Bottom lesson navigator */}
        <div className="bg-card border-t px-4 py-2 flex items-center justify-between gap-2 shrink-0">
          {(() => {
            const currentIndex = lessons.findIndex(l => l.id === currentLesson.id);
            const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
            const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
            return (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && handleLessonClick(prevLesson)}
                  className="gap-1 text-xs"
                >
                  <ArrowLeft className="h-3 w-3" /> Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  {currentIndex + 1} / {lessons.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!nextLesson}
                  onClick={() => nextLesson && handleLessonClick(nextLesson)}
                  className="gap-1 text-xs"
                >
                  Next <ChevronRight className="h-3 w-3" />
                </Button>
              </>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      
      {/* --- HEADER (Clean & Minimal) --- */}
      <header className="hidden lg:flex bg-card border-b h-16 items-center px-4 lg:px-6 sticky top-0 z-30 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => {
          if (currentLesson?.chapter_id) {
            navigate(`/classes/${courseId}/chapter/${currentLesson.chapter_id}${fromParam ? `?from=${fromParam}` : ''}`);
          } else if (fromMyCourses) {
            navigate(`/my-courses/${courseId}`);
          } else if (fromAllClasses) {
            navigate('/all-classes');
          } else if (fromCourses) {
            navigate(`/course/${courseId}`);
          } else {
            navigate(`/classes/${courseId}/chapters`);
          }
        }} className="mr-2">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <div className="flex-1">
            <h1 className="text-sm lg:text-base font-bold text-foreground line-clamp-1">
                {course.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Class {course.grade}</span>
                <span>• {lessons.length} Lessons</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
          {!hasPurchased && (
            <Button size="sm" className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-md"
            onClick={() => navigate(`/buy-course?id=${courseId}`)}>
                Buy Now
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        
        {/* --- LEFT: VIDEO PLAYER & TABS (Cinema Area) --- */}
        <main className="flex-1 overflow-y-auto bg-card lg:bg-muted/20">
            <div className="max-w-5xl mx-auto lg:p-6 lg:space-y-6">
                <Breadcrumbs segments={breadcrumbSegments} className="sticky top-0 z-20 border-b lg:rounded-xl lg:border" />

                {/* VIDEO + PDF SPLIT VIEW (Desktop) or VIDEO only */}
                {!isPiPMode && (() => {
                  const isVideoLesson = currentLesson && !['PDF', 'DPP', 'NOTES'].includes(currentLesson.lecture_type?.toUpperCase() ?? '');
                  const hasSplitContent = isVideoLesson && currentLesson?.video_url && currentLesson?.class_pdf_url && !isMobile;

                  const videoElement = currentLesson && isVideoLesson && currentLesson.video_url ? (
                    <UnifiedVideoPlayer
                      url={currentLesson.video_url}
                      title={currentLesson.title}
                      subtitle={currentLesson.created_at ? new Date(currentLesson.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : undefined}
                      lessonId={currentLesson.id}
                      onReady={() => {}}
                      onDurationReady={(dur) => setVideoDuration(dur)}
                      onTimeUpdate={handleVideoTimeUpdate}
                    />
                  ) : currentLesson && !isVideoLesson ? (
                    <PdfViewer
                      url={currentLesson.video_url || currentLesson.class_pdf_url || ''}
                      title={currentLesson.title}
                    />
                  ) : (
                    <div className="aspect-video bg-black flex items-center justify-center rounded-2xl">
                      <p className="text-white/50">Select a lesson to watch</p>
                    </div>
                  );

                  const lockedOverlay = currentLesson && !canAccessLesson(currentLesson) && (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-20 text-center p-6">
                      <div className="bg-white/10 p-4 rounded-full mb-4">
                        <Lock className="h-8 w-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">Content Locked</h2>
                      <p className="text-muted-foreground mb-6 max-w-md">
                        This premium lesson is part of the full course. Unlock instant access to all {lessons.length} lessons.
                      </p>
                      <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8"
                        onClick={() => navigate(`/buy-course?id=${courseId}`)}>
                        Unlock Full Course
                      </Button>
                    </div>
                  );

                  if (hasSplitContent) {
                    return (
                      <div className="lg:rounded-2xl overflow-hidden shadow-2xl relative">
                        <ResizablePanelGroup direction="horizontal" className="min-h-[500px]">
                          <ResizablePanel defaultSize={55} minSize={35}>
                            <div className="relative h-full">
                              {videoElement}
                              {lockedOverlay}
                            </div>
                          </ResizablePanel>
                          <ResizableHandle withHandle />
                          <ResizablePanel defaultSize={45} minSize={25}>
                            <div className="h-full overflow-hidden">
                              <PdfViewer
                                url={currentLesson!.class_pdf_url!}
                                title={`${currentLesson!.title} - Class PDF`}
                              />
                            </div>
                          </ResizablePanel>
                        </ResizablePanelGroup>
                      </div>
                    );
                  }

                  return (
                    <div className="lg:rounded-2xl overflow-hidden shadow-2xl relative group">
                      {/* Floating back button on mobile */}
                      <button
                        className="absolute left-3 z-30 lg:hidden rounded-full p-2 bg-foreground/50 text-background backdrop-blur-sm"
                        style={{ top: 'max(12px, env(safe-area-inset-top))' }}
                        onClick={() => {
                          if (currentLesson?.chapter_id) {
                            navigate(`/classes/${courseId}/chapter/${currentLesson.chapter_id}${fromParam ? `?from=${fromParam}` : ''}`);
                          } else if (fromMyCourses) {
                            navigate(`/my-courses/${courseId}`);
                          } else if (fromAllClasses) {
                            navigate('/all-classes');
                          } else if (fromCourses) {
                            navigate(`/course/${courseId}`);
                          } else {
                            navigate(`/classes/${courseId}/chapters`);
                          }
                        }}
                        aria-label="Back"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      {videoElement}
                      {lockedOverlay}
                    </div>
                  );
                })()}

                {/* Floating PiP Video Player — DISABLED to prevent overlay on PDF/sidebar */}

                {/* LIKE / DOUBTS / DOWNLOAD BAR */}
                {currentLesson && (() => {
                  // Build combined PDF list: class_pdf_url + lesson_pdfs
                  const allPdfs: PdfItem[] = [];
                  if (currentLesson.class_pdf_url) {
                    allPdfs.push({ id: 'class-pdf', file_name: 'Class PDF', file_url: currentLesson.class_pdf_url });
                  }
                  lessonPdfs.forEach(p => allPdfs.push({ id: p.id, file_name: p.file_name, file_url: p.file_url, file_size: p.file_size }));
                  
                  return (
                    <>
                      <LessonActionBar
                        likeCount={likeCount}
                        hasLiked={hasLiked}
                        onLike={toggleLike}
                        onDoubts={() => {
                          setActiveTab("doubts");
                          setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                        }}
                        onDownloadPdf={currentLesson.class_pdf_url ? () => {
                          const pdfTab = document.querySelector('[value="pdf"]') as HTMLElement;
                          if (pdfTab) { pdfTab.click(); window.scrollTo({ top: 500, behavior: 'smooth' }); }
                          else window.open(currentLesson.class_pdf_url!, '_blank');
                        } : undefined}
                        hasPdf={!!currentLesson.class_pdf_url}
                        likesLoading={likesLoading}
                        lessonTitle={currentLesson.title}
                        courseInfo={course ? `${course.title}${course.grade ? ` · Class ${course.grade}` : ''}` : undefined}
                      onViewPdf={allPdfs.length > 0 ? () => {
                          if (allPdfs.length === 1) {
                            setSelectedPdf(allPdfs[0]);
                          } else {
                            setShowPdfPopup(true);
                          }
                        } : undefined}
                        pdfCount={allPdfs.length}
                      />

                      {/* PDF Select Popup */}
                      <PdfSelectPopup
                        open={showPdfPopup}
                        onOpenChange={setShowPdfPopup}
                        pdfs={allPdfs}
                        onSelect={(pdf) => { setSelectedPdf(pdf); }}
                      />

                      {/* Inline PDF Viewer — shown when a PDF is selected */}
                      {selectedPdf && (
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 z-30 h-8 w-8 bg-background/80 backdrop-blur-sm rounded-full"
                            onClick={() => { setSelectedPdf(null); }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <PdfViewer
                            url={selectedPdf.file_url}
                            title={selectedPdf.file_name}
                          />
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* INFO & TABS */}
                <div className="px-4 lg:px-0 pb-10 space-y-6">
                    {/* Lesson Title + Meta */}
                    <div className="py-4 border-b border-border">
                        <h1 className="text-lg md:text-xl font-bold text-foreground mb-1">
                            {currentLesson?.title || "Course Introduction"}
                        </h1>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            {course?.grade && (
                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                Class {course.grade}
                              </span>
                            )}
                            {videoDuration > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(videoDuration)}
                              </span>
                            )}
                            {currentLesson?.created_at && (
                              <span>{new Date(currentLesson.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                            )}
                        </div>
                        {/* Description with Read More */}
                        {currentLesson?.description && (
                          <LessonDescription description={currentLesson.description} />
                        )}
                    </div>

                    {/* AI Video Summarizer */}
                    {currentLesson && (
                      <div className="py-4 border-b border-border">
                        <VideoSummarizer
                          videoUrl={currentLesson.video_url}
                          lessonTitle={currentLesson.title}
                          lessonId={currentLesson.id}
                          lessonDescription={currentLesson.description || undefined}
                          lessonOverview={currentLesson.overview || undefined}
                        />
                      </div>
                    )}

                    {/* Class PDF / Smart Notes + Ask Doubt Quick Cards */}
                    <div className="grid grid-cols-2 gap-3 py-4 border-b border-border">
                      <button
                        onClick={() => {
                          // Build PDF list for this button
                          const btnPdfs: PdfItem[] = [];
                          if (currentLesson?.class_pdf_url) {
                            btnPdfs.push({ id: 'class-pdf', file_name: 'Class PDF', file_url: currentLesson.class_pdf_url });
                          }
                          lessonPdfs.forEach(p => btnPdfs.push({ id: p.id, file_name: p.file_name, file_url: p.file_url, file_size: p.file_size }));
                          
                          if (btnPdfs.length > 0) {
                            if (btnPdfs.length === 1) {
                              setSelectedPdf(btnPdfs[0]);
                            } else {
                              setShowPdfPopup(true);
                            }
                          } else {
                            setActiveTab("notes");
                            setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                          }
                        }}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/10 transition-all text-left group"
                      >
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">View PDF</p>
                          <p className="text-[10px] text-muted-foreground">Open class materials</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab("doubts");
                          setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                        }}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/10 transition-all text-left group"
                      >
                        <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                          <HelpCircle className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">Ask Doubt</p>
                          <p className="text-[10px] text-muted-foreground">Get instant answers</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 transition-colors flex-shrink-0" />
                      </button>
                    </div>

                    {/* TABS COMPONENT */}
                    <div ref={tabsRef}>
                    <Tabs key={currentLesson?.id} value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
                        <TabsList className={`grid w-full mb-6 ${currentLesson?.class_pdf_url ? "grid-cols-5" : "grid-cols-4"} lg:w-auto lg:inline-flex`}>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            {currentLesson?.class_pdf_url && (
                              <TabsTrigger value="pdf" className="gap-1">
                                <FileText className="h-3 w-3" />
                                PDF
                              </TabsTrigger>
                            )}
                            <TabsTrigger value="resources" className="gap-1">
                                <Library className="h-3 w-3" />
                                Resources
                            </TabsTrigger>
                            <TabsTrigger value="notes">Notes</TabsTrigger>
                            <TabsTrigger value="doubts">Doubts</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="overview" className="bg-card p-6 rounded-xl border border-border shadow-sm space-y-6">
                            {/* About section */}
                            <div>
                              <h3 className="font-semibold text-base text-foreground mb-2">About this lesson</h3>
                              <p className="text-muted-foreground leading-relaxed text-sm">
                                  {currentLesson?.description || "In this lesson, we will cover the fundamental concepts needed to master this topic. Make sure to watch the full video and take notes."}
                              </p>
                              <div className="mt-4 flex items-center gap-3 p-4 bg-primary/5 text-primary rounded-lg border border-primary/20">
                                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                                  <div className="text-sm font-medium">You will learn: Basic definitions, Real-world examples, and Problem solving.</div>
                              </div>
                            </div>

                            {/* Collapsible Lecture PDFs section */}
                            {(lessonPdfs.length > 0 || currentLesson?.class_pdf_url) && (
                              <CollapsiblePdfSection
                                lessonPdfs={lessonPdfs}
                                classPdfUrl={currentLesson?.class_pdf_url}
                                selectedPdf={selectedPdf}
                                onSelectPdf={(pdf) => { setSelectedPdf(pdf); setIsPiPMode(false); }}
                                onClosePdf={() => setSelectedPdf(null)}
                              />
                            )}

                            {/* Topics Covered timeline */}
                            <TopicsCovered
                              lessonId={currentLesson?.id || ''}
                              overview={lessonOverviewMap[currentLesson?.id || ''] ?? currentLesson?.overview ?? null}
                              isAdmin={isAdminOrTeacher}
                              videoUrl={currentLesson?.video_url}
                              onSaved={(newOverview) => {
                                if (currentLesson?.id) {
                                  setLessonOverviewMap(prev => ({ ...prev, [currentLesson.id]: newOverview }));
                                }
                              }}
                            />
                        </TabsContent>

                        {/* PDF Tab — inline Archive.org / Drive / direct PDF embed */}
                        {currentLesson?.class_pdf_url && (
                          <TabsContent value="pdf" className="rounded-xl overflow-hidden">
                            <DriveEmbedViewer
                              url={currentLesson.class_pdf_url}
                              title={currentLesson.title}
                              onDownloaded={({ title, url, filename }) =>
                                addDownload(title, url, filename, "PDF")
                              }
                            />
                          </TabsContent>
                        )}
                        <TabsContent value="resources" className="bg-card p-6 rounded-xl border border-border shadow-sm">
                            <div className="space-y-6">
                                {/* PDF Notes from lesson_pdfs */}
                                {(lessonPdfs.length > 0 || pdfsLoading) && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <FileText className="h-5 w-5 text-primary" />
                                      <h3 className="font-semibold text-lg text-foreground">PDF Notes</h3>
                                      {lessonPdfs.length > 0 && (
                                        <Badge variant="secondary" className="ml-2">
                                          {lessonPdfs.length}
                                        </Badge>
                                      )}
                                    </div>
                                    {pdfsLoading ? (
                                      <div className="py-4 text-center">
                                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {lessonPdfs.map((pdf) => (
                                          <a
                                            key={pdf.id}
                                            href={pdf.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => addDownload(pdf.file_name, pdf.file_url, pdf.file_name, "PDF")}
                                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/10 transition-colors group"
                                          >
                                            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                                              <FileText className="h-5 w-5 text-destructive" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-foreground truncate">{pdf.file_name}</p>
                                              {pdf.file_size && (
                                                <p className="text-xs text-muted-foreground">{(pdf.file_size / 1024).toFixed(0)} KB</p>
                                              )}
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Reference Books */}
                                <div>
                                  <div className="flex items-center gap-2 mb-4">
                                      <Library className="h-5 w-5 text-primary" />
                                      <h3 className="font-semibold text-lg text-foreground">Reference Books</h3>
                                      {archiveBooks.length > 0 && (
                                          <Badge variant="secondary" className="ml-2">
                                              {archiveBooks.length} {archiveBooks.length === 1 ? 'book' : 'books'}
                                          </Badge>
                                      )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-4">
                                      Access reference books and study materials from Archive.org. Click on a book to expand the reader.
                                  </p>
                                  <ArchiveBookList
                                      books={archiveBooks}
                                      isAdmin={isAdminOrTeacher}
                                      onAddBook={handleAddArchiveBook}
                                      onRemoveBook={handleRemoveArchiveBook}
                                  />
                                </div>
                            </div>
                        </TabsContent>
                        
                        {/* Notes Tab - Class PDF inline + Personal Notes */}
                        <TabsContent value="notes" className="space-y-4">
                            {/* Class PDF shown inline directly */}
                            {currentLesson?.class_pdf_url && (
                              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                                  <FileText className="h-4 w-4 text-primary" />
                                  <h3 className="font-semibold text-sm text-foreground">Class PDF</h3>
                                </div>
                                <DriveEmbedViewer
                                  url={currentLesson.class_pdf_url}
                                  title={currentLesson.title}
                                  onDownloaded={({ title, url, filename }) =>
                                    addDownload(title, url, filename, "PDF")
                                  }
                                />
                              </div>
                            )}

                            {/* Additional lesson PDFs */}
                            {lessonPdfs.length > 0 && (
                              <div className="bg-card rounded-xl border shadow-sm p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                                    <FileText className="h-4 w-4 text-primary" />
                                    Additional PDFs
                                  </h3>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {lessonPdfs.length}
                                  </Badge>
                                </div>
                                <div className="space-y-2">
                                  {lessonPdfs.map((pdf) => (
                                    <button
                                      key={pdf.id}
                                      onClick={() => setSelectedPdf({ id: pdf.id, file_name: pdf.file_name, file_url: pdf.file_url })}
                                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/10 transition-colors w-full text-left group"
                                    >
                                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <FileText className="h-4 w-4 text-primary" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{pdf.file_name}</p>
                                      </div>
                                      <span className="text-xs text-primary font-medium">View PDF</span>
                                    </button>
                                  ))}
                                </div>
                                {/* Inline PDF viewer below the list */}
                                {selectedPdf && (
                                  <div className="mt-4 relative">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="absolute top-2 right-2 z-30 h-8 w-8 bg-background/80 backdrop-blur-sm rounded-full"
                                      onClick={() => setSelectedPdf(null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                    <PdfViewer url={selectedPdf.file_url} title={selectedPdf.file_name} />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Personal Obsidian Notes */}
                            <div className="bg-card rounded-xl border shadow-sm">
                              <ObsidianNotes
                                  lessonId={currentLesson.id}
                                  userId={user?.id}
                                  lessonTitle={currentLesson.title}
                              />
                            </div>
                        </TabsContent>

                        {/* Discussion Tab - Functional */}
                        <TabsContent value="doubts" className="bg-card p-6 rounded-xl border border-border shadow-sm">
                            <div className="space-y-6">
                                <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
                                    <MessageCircle className="h-5 w-5 text-primary" />
                                    Doubts ({comments.length})
                                </h3>

                                {/* Post Comment Box */}
                                {user ? (
                                    <div className="flex gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                                            {(profile?.fullName || user.email)?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <Textarea
                                                placeholder="Post a comment or question..."
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                className="min-h-[80px] resize-none"
                                            />
                                            {commentImagePreview && (
                                                <div className="relative inline-block">
                                                    <img src={commentImagePreview} alt="Preview" className="max-w-xs max-h-32 rounded-lg border" />
                                                    <button
                                                        onClick={removeCommentImage}
                                                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <label className="cursor-pointer flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                                    <ImageIcon className="h-4 w-4" />
                                                    <span>Attach Image</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleCommentImageSelect}
                                                    />
                                                </label>
                                                <Button
                                                    onClick={handlePostComment}
                                                    disabled={isPostingComment || uploadingImage || (!newComment.trim() && !commentImage)}
                                                    size="sm"
                                                    className="gap-2"
                                                >
                                                    {isPostingComment ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Send className="h-4 w-4" />
                                                    )}
                                                    {uploadingImage ? 'Uploading...' : 'Post Comment'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 bg-muted/30 rounded-lg">
                                        <p className="text-muted-foreground text-sm">Please login to post comments</p>
                                        <Button variant="link" onClick={() => navigate('/login')}>
                                            Login now
                                        </Button>
                                    </div>
                                )}

                                {/* Comments List */}
                                <div className="space-y-4">
                                    {commentsLoading ? (
                                        <div className="text-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </div>
                                    ) : comments.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                                            <p>No doubts yet. Be the first to ask a doubt!</p>
                                        </div>
                                    ) : (
                                        comments.map((comment) => (
                                            <div key={comment.id} className="flex gap-3 p-4 bg-muted/30 rounded-lg">
                                                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                                                    {comment.userName?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-foreground text-sm">
                                                            {comment.userName}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatRelativeTime(comment.createdAt)}
                                                        </span>
                                                    </div>
                                                    <p className="text-foreground text-sm whitespace-pre-wrap">
                                                        {comment.message}
                                                    </p>
                                                    {comment.imageUrl && (
                                                        <img
                                                            src={comment.imageUrl}
                                                            alt="Comment attachment"
                                                            className="mt-2 max-w-xs rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                                            onClick={() => window.open(comment.imageUrl!, '_blank')}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                    </div>

                    {/* DPP / Quiz Section */}
                    {(lessonDpps.length > 0 || dppsLoading) && (
                      <Card className="border border-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                            <Target className="h-4 w-4 text-primary" />
                            Attempt DPP
                            {lessonDpps.length > 0 && (
                              <Badge variant="secondary" className="ml-auto">{lessonDpps.length}</Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          {dppsLoading ? (
                            <div className="py-6 text-center">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="divide-y divide-border">
                              {lessonDpps.map((dpp) => (
                                <button
                                  key={dpp.id}
                                  onClick={() => navigate(`/quiz/${dpp.id}`)}
                                  className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-accent/10 transition-colors group"
                                >
                                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Target className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{dpp.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {dpp.type?.toUpperCase() || "DPP"}
                                      {dpp.total_marks ? ` · ${dpp.total_marks} marks` : ""}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-xs shrink-0">Attempt</Badge>
                                </button>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Video Recommendations removed — distracting element */}
                </div>
            </div>
        </main>

        {/* --- RIGHT: SIDEBAR PLAYLIST (Udemy Style) --- */}
        <aside className="w-full lg:w-96 bg-card border-l border-border flex flex-col h-[50vh] lg:h-auto">
            <div className="p-4 border-b border-border bg-muted/20">
                <h3 className="font-bold text-foreground mb-2">Course Content</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>{progressPercentage}% Completed</span>
                    <span>{completedCount}/{lessons.length}</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
            </div>

            <ScrollArea className="flex-1">
                <div className="divide-y divide-border">
                    {lessons.map((lesson, index) => {
                        const isActive = currentLesson?.id === lesson.id;
                        const isLocked = !canAccessLesson(lesson);
                        const isCompleted = completedLessonIds.has(lesson.id);
                        return (
                            <div
                                key={lesson.id}
                                className={cn(
                                    "flex items-start gap-3 p-3 cursor-pointer border-l-2 transition-all hover:bg-muted/30",
                                    isActive ? "bg-primary/5 border-primary" : "border-transparent",
                                    isLocked && "opacity-60 bg-muted/20"
                                )}
                                onClick={() => handleLessonClick(lesson)}
                            >
                                <div className="mt-1">
                                    {isActive ? (
                                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center animate-pulse">
                                            <Play className="h-3 w-3 text-primary-foreground fill-primary-foreground" />
                                        </div>
                                    ) : isLocked ? (
                                        <div className="h-6 w-6 rounded-full border-2 border-border flex items-center justify-center">
                                            <Lock className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                    ) : isCompleted ? (
                                        <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                                            <CheckCircle className="h-4 w-4 text-white fill-white" />
                                        </div>
                                    ) : (
                                        <div className="h-6 w-6 rounded-full border-2 border-border flex items-center justify-center text-xs font-medium text-muted-foreground">
                                            {index + 1}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={cn("text-sm font-medium mb-1", isActive ? "text-primary" : "text-foreground")}>
                                        {lesson.title}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {isCompleted && <span className="text-green-600 font-medium">✓ Completed</span>}
                                        {isLocked && <span className="flex items-center gap-0.5"><Lock className="h-3 w-3" />Locked</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </aside>

      </div>
    </div>
  );
};

// ─── Helper: Read More description ───────────────────────────────────────────
const LessonDescription = ({ description }: { description: string }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > 120;
  return (
    <div className="mt-2">
      <p className={cn("text-sm text-muted-foreground leading-relaxed", !expanded && isLong && "line-clamp-2")}>
        {description}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs font-semibold text-primary mt-1 hover:underline"
        >
          {expanded ? "Show Less" : "Read More"}
        </button>
      )}
    </div>
  );
};

// ─── Helper: Topics Covered timeline with AI Timestamp Generation ─────────────
interface TopicsCoveredProps {
  lessonId: string;
  overview: string | null;
  isAdmin: boolean;
  onSaved?: (newOverview: string) => void;
  videoUrl?: string;
}

function TopicsCovered({ lessonId, overview, isAdmin, onSaved, videoUrl }: TopicsCoveredProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(overview || "");
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Sync editText when overview prop changes
  useEffect(() => {
    setEditText(overview || "");
  }, [overview]);

  // Parse "timestamp|topic" lines from overview
  const topics = (overview || "")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.includes("|"))
    .map(line => {
      const [ts, ...rest] = line.split("|");
      return { ts: ts.trim(), topic: rest.join("|").trim() };
    });

  const handleSave = async () => {
    if (!lessonId) return;
    setSaving(true);
    try {
      await supabase.from("lessons").update({ overview: editText }).eq("id", lessonId);
      toast.success("Topics saved!");
      setEditing(false);
      onSaved?.(editText);
    } catch {
      toast.error("Failed to save topics");
    } finally {
      setSaving(false);
    }
  };

  // AI Timestamp generation using summarize-video edge function
  const generateAiTimestamps = async () => {
    if (!videoUrl) {
      toast.error("No video URL available");
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('summarize-video', {
        body: { videoUrl, lessonTitle: "Generate timestamps", mode: "timestamps" },
      });
      if (error) throw new Error("Failed to summarize");
      const result = data?.summary || data?.timestamps || "";
      if (result) {
        // Try to parse AI response into timestamp|topic format
        const lines = result.split("\n").filter((l: string) => l.trim());
        const formatted = lines.map((line: string) => {
          // Match patterns like "00:00 - Introduction" or "0:00 Introduction" or "00:00:00 - Topic"
          const match = line.match(/(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]?\s*(.+)/);
          if (match) return `${match[1]}|${match[2].trim()}`;
          return line;
        }).join("\n");
        
        setEditText(formatted);
        setEditing(true);
        setCollapsed(false);
        toast.success("AI timestamps generated! Review and save.");
      } else {
        toast.error("Could not generate timestamps for this video");
      }
    } catch (err: any) {
      console.error("AI timestamp error:", err);
      toast.error("Failed to generate timestamps. Try again later.");
    } finally {
      setAiLoading(false);
    }
  };

  // Convert timestamp string to clickable seek time
  const parseTimestamp = (ts: string): number | null => {
    const parts = ts.split(":").map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ListVideo className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Topics & Timestamps</span>
          {topics.length > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">{topics.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && !editing && (
            <>
              {videoUrl && (
                <span
                  onClick={(e) => { e.stopPropagation(); generateAiTimestamps(); }}
                  className="p-1 rounded-md hover:bg-primary/10 transition-colors"
                  title="AI Generate Timestamps"
                >
                  {aiLoading ? (
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  )}
                </span>
              )}
              <span
                onClick={(e) => { e.stopPropagation(); setEditing(true); setCollapsed(false); }}
                className="p-1 rounded-md hover:bg-border transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            </>
          )}
          {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 py-3">
          {editing ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Enter one topic per line as: <code className="bg-muted px-1 rounded">timestamp|topic</code></p>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="w-full h-40 text-xs font-mono border border-border rounded-lg p-2 bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={"0:00:18|Beginning the chapter\n0:02:06|Introduction\n0:07:48|System of Classification"}
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </Button>
              </div>
            </div>
          ) : topics.length > 0 ? (
            <div className="space-y-0">
              {topics.map((t, i) => {
                const seconds = parseTimestamp(t.ts);
                return (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                    <button
                      onClick={() => {
                        if (seconds !== null) {
                          // Send seekTo command to YouTube iframe
                          const iframe = document.querySelector('iframe[src*="youtube"]') as HTMLIFrameElement;
                          if (iframe?.contentWindow) {
                            iframe.contentWindow.postMessage(JSON.stringify({
                              event: 'command',
                              func: 'seekTo',
                              args: [seconds, true]
                            }), '*');
                            toast.success(`Jumped to ${t.ts}`);
                          }
                        }
                      }}
                      className="text-[11px] font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      ▶ {t.ts}
                    </button>
                    <span className="text-sm text-foreground leading-snug">{t.topic}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              {isAdmin ? 'Click ✏️ to add topics or ✨ to auto-generate timestamps with AI.' : 'Timestamps will be added soon.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonView;
