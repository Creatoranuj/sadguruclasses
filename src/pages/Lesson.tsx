import { useEffect, useState } from "react";
import { useOrientation } from "../hooks/useOrientation";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowLeft, FileText, X } from "lucide-react";
import UnifiedVideoPlayer from "../components/video/UnifiedVideoPlayer";
import LessonActionBar from "../components/video/LessonActionBar";
import PdfSelectPopup, { type PdfItem } from "../components/video/PdfSelectPopup";
import PdfViewer from "../components/video/PdfViewer";
import { LoadingSpinner } from "../components/ui/loading-spinner";
import { useLessonLikes } from "../hooks/useLessonLikes";
import { useLessonPdfs } from "../hooks/useLessonPdfs";
import Header from "../components/Layout/Header";
import Sidebar from "../components/Layout/Sidebar";

interface LessonData {
  id: string;
  title: string;
  video_url: string;
  description: string | null;
  course_id: number | null;
  is_locked: boolean | null;
  class_pdf_url: string | null;
  lecture_type: string | null;
}

interface CourseData {
  id: number;
  title: string;
}

const LessonPage = () => {
  const isPortrait = useOrientation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [notes, setNotes] = useState<{ id: string; title: string; pdf_url: string }[]>([]);
  const [materials, setMaterials] = useState<{ id: string; title: string; file_url: string; file_type?: string }[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  // PDF popup & inline viewer state
  const [showPdfPopup, setShowPdfPopup] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<PdfItem | null>(null);
  const [showInlinePdf, setShowInlinePdf] = useState(false);

  // Likes
  const { likeCount, hasLiked, toggleLike, loading: likesLoading } = useLessonLikes(id);

  // Lesson PDFs from lesson_pdfs table
  const { pdfs: lessonPdfs } = useLessonPdfs(id);

  // Build combined PDF list
  const allPdfs: PdfItem[] = [];
  if (lesson?.class_pdf_url) {
    allPdfs.push({ id: "class-pdf", file_name: "Class PDF", file_url: lesson.class_pdf_url });
  }
  lessonPdfs.forEach((p) =>
    allPdfs.push({ id: p.id, file_name: p.file_name, file_url: p.file_url, file_size: p.file_size })
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { state: { from: `/lesson/${id}` } });
    }
  }, [authLoading, isAuthenticated, navigate, id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !user) return;

      try {
        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .select("id, title, video_url, description, course_id, is_locked, class_pdf_url, lecture_type")
          .eq("id", id)
          .single();

        if (lessonError || !lessonData) {
          navigate("/dashboard");
          return;
        }
        setLesson(lessonData as LessonData);

        if (lessonData.course_id) {
          const { data: courseData } = await supabase
            .from("courses")
            .select("id, title")
            .eq("id", lessonData.course_id)
            .single();
          setCourse(courseData as CourseData | null);

          const { data: enrollment } = await supabase
            .from("enrollments")
            .select("id")
            .eq("user_id", String(user.id))
            .eq("course_id", lessonData.course_id)
            .single();

          const enrolled = !!enrollment;
          setIsEnrolled(enrolled);

          if (lessonData.is_locked && !enrolled) {
            navigate(`/course/${lessonData.course_id}`);
            return;
          }
        }

        const { data: notesData } = await supabase
          .from("notes")
          .select("id, title, pdf_url")
          .eq("lesson_id", id);
        setNotes(notesData || []);

        const { data: materialsData } = await supabase
          .from("materials")
          .select("id, title, file_url")
          .eq("course_id", lessonData?.course_id || 0);
        setMaterials(
          (materialsData || []).map((m) => ({
            id: m.id,
            title: m.title,
            file_url: m.file_url,
          }))
        );
      } catch {
        // error handled by redirects above
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchData();
  }, [id, user, navigate]);

  const handleViewPdf = () => {
    if (allPdfs.length === 1) {
      setSelectedPdf(allPdfs[0]);
      setShowInlinePdf(true);
    } else if (allPdfs.length > 1) {
      setShowPdfPopup(true);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner fullPage size="lg" text="Loading lesson..." />;
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">Lesson not found.</p>
            <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hide header/sidebar in portrait for max video space */}
      {!isPortrait && (
        <>
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <Header onMenuClick={() => setSidebarOpen(true)} />
        </>
      )}

      {/* Breadcrumb — hidden in portrait */}
      {!isPortrait && (
        <div className="bg-primary px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (course ? navigate(`/course/${course.id}`) : navigate(-1))}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            {course && <p className="text-xs text-primary-foreground/70">{course.title}</p>}
            <h1 className="text-lg font-semibold text-primary-foreground">{lesson.title}</h1>
          </div>
        </div>
      )}

      <main className={`flex-1 ${isPortrait ? "p-0" : "p-4 md:p-6"}`}>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6">
          {/* Video + Actions column */}
          <div className="lg:col-span-2 space-y-0">
            {/* Content player — flush top in portrait */}
            <div className="relative">
              {/* Floating back button in portrait */}
              {isPortrait && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 left-2 z-30 bg-black/40 text-white hover:bg-black/60 rounded-full h-9 w-9"
                  onClick={() => (course ? navigate(`/course/${course.id}`) : navigate(-1))}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              {['PDF', 'DPP', 'NOTES'].includes(lesson.lecture_type?.toUpperCase() ?? '') ? (
                <PdfViewer
                  url={lesson.video_url || lesson.class_pdf_url || ''}
                  title={lesson.title}
                />
              ) : (
                <UnifiedVideoPlayer
                  url={lesson.video_url}
                  title={lesson.title}
                  lessonId={lesson.id}
                  onEnded={() => {}}
                />
              )}
            </div>

            {/* Action bar: Like | View PDF | Doubts */}
            <LessonActionBar
              likeCount={likeCount}
              hasLiked={hasLiked}
              onLike={toggleLike}
              onDoubts={() => {}}
              onViewPdf={allPdfs.length > 0 ? handleViewPdf : undefined}
              pdfCount={allPdfs.length}
              hasPdf={false}
              likesLoading={likesLoading}
              lessonTitle={lesson.title}
            />

            {/* PDF Select Popup */}
            <PdfSelectPopup
              open={showPdfPopup}
              onOpenChange={setShowPdfPopup}
              pdfs={allPdfs}
              onSelect={(pdf) => {
                setSelectedPdf(pdf);
                setShowInlinePdf(true);
              }}
            />

            {/* Inline PDF Viewer */}
            {showInlinePdf && selectedPdf && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-1 gap-1 text-muted-foreground"
                  onClick={() => {
                    setShowInlinePdf(false);
                    setSelectedPdf(null);
                  }}
                >
                  <X className="h-4 w-4" /> Close PDF
                </Button>
                <PdfViewer url={selectedPdf.file_url} title={selectedPdf.file_name} />
              </div>
            )}

            {/* Description */}
            {lesson.description && !showInlinePdf && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">About this Lesson</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{lesson.description}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar — Notes & Materials */}
          {!isPortrait && (
            <div className="lg:col-span-1 space-y-4">
              {notes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Lesson Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {notes.map((note) => (
                      <a
                        key={note.id}
                        href={note.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="font-medium text-sm truncate">{note.title}</span>
                      </a>
                    ))}
                  </CardContent>
                </Card>
              )}

              {materials.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Study Materials</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {materials.map((material) => (
                      <a
                        key={material.id}
                        href={material.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{material.title}</p>
                          <p className="text-xs text-muted-foreground">{material.file_type}</p>
                        </div>
                      </a>
                    ))}
                  </CardContent>
                </Card>
              )}

              {notes.length === 0 && materials.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No additional materials for this lesson.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LessonPage;
