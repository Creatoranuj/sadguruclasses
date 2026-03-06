import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MahimaGhostPlayer } from "@/components/video";
import { formatDuration } from "@/components/video/MahimaVideoPlayer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Play, Lock, Clock, BookOpen, 
  Loader2, FileText, MessageCircle, Star, CheckCircle, Send, Library, ImageIcon, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useComments } from "@/hooks/useComments";
import { useAuth } from "@/contexts/AuthContext";
import { ArchiveBookList, type ArchiveBook } from "@/components/archive";
import { Textarea } from "@/components/ui/textarea";
import LessonActionBar from "@/components/video/LessonActionBar";
import { useLessonLikes } from "@/hooks/useLessonLikes";

// Type definitions
interface Lesson {
  id: string;
  title: string;
  video_url: string;
  is_locked: boolean | null;
  description: string | null;
  course_id: number | null;
  created_at: string | null;
  class_pdf_url: string | null;
  like_count: number | null;
}

const LessonView = () => {
  // Support both URL params and query params
  const { courseId: paramCourseId } = useParams();
  const [searchParams] = useSearchParams();
  const queryCourseId = searchParams.get("courseId");
  const courseId = paramCourseId || queryCourseId;
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
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
  
  // Comments hook
  const { comments, loading: commentsLoading, createComment, fetchComments } = useComments(currentLesson?.id || undefined);
  
  // Likes hook
  const { likeCount, hasLiked, toggleLike, loading: likesLoading } = useLessonLikes(currentLesson?.id || undefined);
  
  // Progress tracking state
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const progressSavedRef = useRef<string | null>(null); // tracks which lesson's 80% was already saved

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

  // Reset saved ref when lesson changes
  useEffect(() => {
    progressSavedRef.current = null;
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

        // Fetch Course
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', Number(courseId))
          .single();
        if (courseError) throw courseError;
        setCourse(courseData);

        // Fetch Lessons
        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .select('*')
          .eq('course_id', Number(courseId))
          .order('created_at', { ascending: true });
        if (lessonError) throw lessonError;
        
        setLessons(lessonData || []);
        
        if (lessonData && lessonData.length > 0) {
          setCurrentLesson(lessonData[0]);
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

  const handleLessonClick = (lesson: Lesson) => {
    if (canAccessLesson(lesson)) {
      setCurrentLesson(lesson);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!course) return <div className="p-10 text-center">Course not found</div>;

  // Calculate Progress Logic
  const completedCount = completedLessonIds.size;
  const progressPercentage = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* --- HEADER (Clean & Minimal) --- */}
      <header className="bg-white border-b h-16 flex items-center px-4 lg:px-6 sticky top-0 z-30 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="mr-2">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button>
        <div className="flex-1">
            <h1 className="text-sm lg:text-base font-bold text-gray-800 line-clamp-1">
                {course.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Class {course.grade}</span>
                <span>• {lessons.length} Lessons</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/messages')}>
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Chat with Teacher</span>
          </Button>
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
        <main className="flex-1 overflow-y-auto bg-white lg:bg-gray-100 p-0 lg:p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                
                {/* VIDEO CONTAINER */}
                <div className="lg:rounded-2xl overflow-hidden shadow-2xl relative group">
                    {currentLesson && currentLesson.video_url ? (
                        <MahimaGhostPlayer
                            videoUrl={currentLesson.video_url}
                            title={currentLesson.title}
                            subtitle={currentLesson.created_at ? new Date(currentLesson.created_at).toLocaleDateString() : undefined}
                            lessonId={currentLesson.id}
                            onReady={() => console.log('Video ready')}
                            onDurationReady={(dur) => setVideoDuration(dur)}
                            onTimeUpdate={handleVideoTimeUpdate}
                        />
                    ) : (
                        <div className="aspect-video bg-black flex items-center justify-center rounded-2xl">
                            <p className="text-white/50">Select a lesson to watch</p>
                        </div>
                    )}

                    {/* Locked Overlay */}
                    {currentLesson && !canAccessLesson(currentLesson) && (
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-20 text-center p-6">
                            <div className="bg-white/10 p-4 rounded-full mb-4">
                                <Lock className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Content Locked</h2>
                            <p className="text-gray-300 mb-6 max-w-md">
                                This premium lesson is part of the full course. Unlock instant access to all {lessons.length} lessons.
                            </p>
                            <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white font-bold px-8"
                                onClick={() => navigate(`/buy-course?id=${courseId}`)}>
                                Unlock Full Course
                            </Button>
                        </div>
                    )}
                </div>

                {/* LIKE / DOUBTS / DOWNLOAD BAR */}
                {currentLesson && (
                  <LessonActionBar
                    likeCount={likeCount}
                    hasLiked={hasLiked}
                    onLike={toggleLike}
                    onDoubts={() => {
                      const tabsTrigger = document.querySelector('[value="doubts"]') as HTMLElement;
                      if (tabsTrigger) tabsTrigger.click();
                    }}
                    onDownloadPdf={currentLesson.class_pdf_url ? () => {
                      window.open(currentLesson.class_pdf_url!, '_blank');
                    } : undefined}
                    hasPdf={!!currentLesson.class_pdf_url}
                    likesLoading={likesLoading}
                    lessonTitle={currentLesson.title}
                    courseInfo={course ? `${course.title}${course.grade ? ` · Class ${course.grade}` : ''}` : undefined}
                  />
                )}

                {/* INFO & TABS (PW Style) */}
                <div className="px-4 lg:px-0 pb-10">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                                {currentLesson?.title || "Course Introduction"}
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {videoDuration > 0 ? formatDuration(videoDuration) : '—'}</span>
                                <span className="flex items-center gap-1"><Star className="h-4 w-4 text-primary fill-primary" /> 4.8 Rating</span>
                            </div>
                        </div>
                        {/* Share button removed to prevent video link leaking */}
                    </div>

                    {/* TABS COMPONENT */}
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 lg:w-[500px] mb-6">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="resources" className="gap-1">
                                <Library className="h-3 w-3" />
                                Resources
                            </TabsTrigger>
                            <TabsTrigger value="notes">Notes</TabsTrigger>
                            <TabsTrigger value="doubts">Discussion</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="overview" className="bg-white p-6 rounded-xl border shadow-sm">
                            <h3 className="font-semibold text-lg mb-3">About this lesson</h3>
                            <p className="text-gray-600 leading-relaxed">
                                {currentLesson?.description || "In this lesson, we will cover the fundamental concepts needed to master this topic. Make sure to watch the full video and take notes."}
                            </p>
                            <div className="mt-6 flex items-center gap-3 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
                                <CheckCircle className="h-5 w-5" />
                                <div className="text-sm font-medium">You will learn: Basic definitions, Real-world examples, and Problem solving.</div>
                            </div>
                        </TabsContent>

                        {/* Resources Tab - Archive.org Books */}
                        <TabsContent value="resources" className="bg-white p-6 rounded-xl border shadow-sm">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Library className="h-5 w-5 text-indigo-600" />
                                    <h3 className="font-semibold text-lg">Reference Books</h3>
                                    {archiveBooks.length > 0 && (
                                        <Badge variant="secondary" className="ml-2">
                                            {archiveBooks.length} {archiveBooks.length === 1 ? 'book' : 'books'}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 mb-4">
                                    Access reference books and study materials from Archive.org. Click on a book to expand the reader.
                                </p>
                                <ArchiveBookList
                                    books={archiveBooks}
                                    isAdmin={isAdminOrTeacher}
                                    onAddBook={handleAddArchiveBook}
                                    onRemoveBook={handleRemoveArchiveBook}
                                />
                            </div>
                        </TabsContent>
                        
                        {/* Notes Tab - Simple Textarea */}
                        <TabsContent value="notes" className="bg-card p-6 rounded-xl border shadow-sm">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <h3 className="font-semibold text-lg text-foreground">Your Notes</h3>
                                </div>
                                <Textarea
                                    placeholder="Start typing your notes here... They are auto-saved!"
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    className="min-h-[300px] font-mono text-sm resize-none"
                                />
                                <p className="text-xs text-muted-foreground">
                                    ✓ Notes are auto-saved locally and will persist when you reload the page.
                                </p>
                            </div>
                        </TabsContent>

                        {/* Discussion Tab - Functional */}
                        <TabsContent value="doubts" className="bg-white p-6 rounded-xl border shadow-sm">
                            <div className="space-y-6">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <MessageCircle className="h-5 w-5 text-indigo-600" />
                                    Discussion ({comments.length})
                                </h3>

                                {/* Post Comment Box */}
                                {user ? (
                                    <div className="flex gap-3">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                                            {(profile?.fullName || user.email)?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <Textarea
                                                placeholder="Post a comment or question..."
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                className="min-h-[80px] resize-none"
                                            />
                                            {/* Image preview */}
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
                                    <div className="text-center py-4 bg-gray-50 rounded-lg">
                                        <p className="text-gray-500 text-sm">Please login to post comments</p>
                                        <Button variant="link" onClick={() => navigate('/login')}>
                                            Login now
                                        </Button>
                                    </div>
                                )}

                                {/* Comments List */}
                                <div className="space-y-4">
                                    {commentsLoading ? (
                                        <div className="text-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                                        </div>
                                    ) : comments.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                            <p>No comments yet. Be the first to start a discussion!</p>
                                        </div>
                                    ) : (
                                        comments.map((comment) => (
                                            <div key={comment.id} className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                                                    {comment.userName?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-gray-900 text-sm">
                                                            {comment.userName}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {formatRelativeTime(comment.createdAt)}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-700 text-sm whitespace-pre-wrap">
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
            </div>
        </main>

        {/* --- RIGHT: SIDEBAR PLAYLIST (Udemy Style) --- */}
        <aside className="w-full lg:w-96 bg-white border-l flex flex-col h-[50vh] lg:h-auto">
            <div className="p-4 border-b bg-gray-50/50">
                <h3 className="font-bold text-gray-800 mb-2">Course Content</h3>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>{progressPercentage}% Completed</span>
                    <span>{completedCount}/{lessons.length}</span>
                </div>
                <Progress value={progressPercentage} className="h-2 bg-gray-200" />
            </div>

            <ScrollArea className="flex-1">
                <div className="divide-y divide-gray-100">
                    {lessons.map((lesson, index) => {
                        const isActive = currentLesson?.id === lesson.id;
                        const isLocked = !canAccessLesson(lesson);
                        const isCompleted = completedLessonIds.has(lesson.id);
                        return (
                            <div
                                key={lesson.id}
                                className={cn(
                                    "flex items-start gap-3 p-3 cursor-pointer border-l-2 transition-all hover:bg-gray-50",
                                    isActive ? "bg-indigo-50 border-indigo-600" : "border-transparent",
                                    isLocked && "opacity-60 bg-gray-50/50"
                                )}
                                onClick={() => handleLessonClick(lesson)}
                            >
                                <div className="mt-1">
                                    {isActive ? (
                                        <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center animate-pulse">
                                            <Play className="h-3 w-3 text-white fill-white" />
                                        </div>
                                    ) : isLocked ? (
                                        <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                                            <Lock className="h-3 w-3 text-gray-400" />
                                        </div>
                                    ) : isCompleted ? (
                                        <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                                            <CheckCircle className="h-4 w-4 text-white fill-white" />
                                        </div>
                                    ) : (
                                        <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-medium text-gray-500">
                                            {index + 1}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={cn("text-sm font-medium mb-1", isActive ? "text-indigo-700" : "text-gray-700")}>
                                        {lesson.title}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
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

export default LessonView;
