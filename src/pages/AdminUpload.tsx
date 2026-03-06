import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload, Video, FileText, LogOut, Trash2,
  BookOpen, Shield, Loader2, FileUp, Link as LinkIcon,
  ChevronRight, ClipboardCheck, Plus, FolderPlus, FolderOpen,
} from "lucide-react";
import logo from "@/assets/logo.png";
import MediaPreview from "@/components/admin/MediaPreview";

import { cn } from "@/lib/utils";

type UploadType = "VIDEO" | "PDF" | "DPP" | "NOTES" | "TEST";

const AdminUpload = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Breadcrumb drill-down state
  const [courses, setCourses] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  // Chapter creation state
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterCode, setNewChapterCode] = useState("");
  const [newChapterPosition, setNewChapterPosition] = useState(0);
  const [creatingChapter, setCreatingChapter] = useState(false);

  // Sub-folder creation state
  const [showCreateSubfolder, setShowCreateSubfolder] = useState(false);
  const [newSubfolderTitle, setNewSubfolderTitle] = useState("");
  const [newSubfolderCode, setNewSubfolderCode] = useState("");
  const [newSubfolderPosition, setNewSubfolderPosition] = useState(0);
  const [creatingSubfolder, setCreatingSubfolder] = useState(false);

  // Sub-chapters for current chapter
  const [subChapters, setSubChapters] = useState<any[]>([]);

  // Upload form states
  const [uploadType, setUploadType] = useState<UploadType>("VIDEO");
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState("Sadguru Coaching Classes");
  const [isUploading, setIsUploading] = useState(false);
  const [pdfInputMode, setPdfInputMode] = useState<"file" | "url">("file");
  const [pdfUrl, setPdfUrl] = useState("");
  const [description, setDescription] = useState("");
  const [classPdfFile, setClassPdfFile] = useState<File | null>(null);
  const [classPdfUrl, setClassPdfUrl] = useState("");

  // Recent lessons for selected chapter
  const [lessons, setLessons] = useState<any[]>([]);

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const selectedChapter = chapters.find(c => c.id === selectedChapterId);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate('/admin/login'); return; }
      const { data: roleData } = await supabase
        .from('user_roles').select('role')
        .eq('user_id', session.user.id).eq('role', 'admin').maybeSingle();
      if (!roleData) {
        toast.error("Access denied. Admin role not found.");
        await supabase.auth.signOut();
        navigate('/admin/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', session.user.id).single();
      setUser({ ...session.user, full_name: profile?.full_name || 'Admin' });
      setIsLoading(false);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate('/admin/login');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch courses on mount
  useEffect(() => {
    if (!isLoading && user) {
      supabase.from('courses').select('*').order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setCourses(data); });
    }
  }, [isLoading, user]);

  // Fetch chapters when course selected (top-level only)
  useEffect(() => {
    if (!selectedCourseId) { setChapters([]); return; }
    setChaptersLoading(true);
    supabase.from('chapters').select('*')
      .eq('course_id', selectedCourseId)
      .is('parent_id', null)
      .order('position', { ascending: true })
      .then(({ data }) => {
        setChapters(data || []);
        setChaptersLoading(false);
      });
  }, [selectedCourseId]);

  // Fetch sub-chapters + lessons when chapter selected
  useEffect(() => {
    if (!selectedChapterId) { setLessons([]); setSubChapters([]); return; }
    // Fetch sub-chapters
    supabase.from('chapters').select('*')
      .eq('parent_id', selectedChapterId)
      .order('position', { ascending: true })
      .then(({ data }) => setSubChapters(data || []));
    // Fetch lessons
    supabase.from('lessons').select('*')
      .eq('chapter_id', selectedChapterId)
      .order('position', { ascending: true })
      .then(({ data }) => setLessons(data || []));
  }, [selectedChapterId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const handleCreateChapter = async () => {
    if (!newChapterTitle.trim() || !newChapterCode.trim() || !selectedCourseId) {
      toast.error("Please fill title and code");
      return;
    }
    setCreatingChapter(true);
    try {
      const { error } = await supabase.from('chapters').insert({
        course_id: selectedCourseId,
        title: newChapterTitle.trim(),
        code: newChapterCode.trim(),
        position: newChapterPosition || chapters.length + 1,
      });
      if (error) throw error;
      toast.success("Chapter created!");
      setNewChapterTitle(""); setNewChapterCode(""); setNewChapterPosition(0);
      setShowCreateChapter(false);
      // Refresh chapters
      const { data } = await supabase.from('chapters').select('*')
        .eq('course_id', selectedCourseId).is('parent_id', null).order('position', { ascending: true });
      setChapters(data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreatingChapter(false);
    }
  };

  const handleCreateSubfolder = async () => {
    if (!newSubfolderTitle.trim() || !newSubfolderCode.trim() || !selectedCourseId || !selectedChapterId) {
      toast.error("Please fill title and code");
      return;
    }
    setCreatingSubfolder(true);
    try {
      const { error } = await supabase.from('chapters').insert({
        course_id: selectedCourseId,
        parent_id: selectedChapterId,
        title: newSubfolderTitle.trim(),
        code: newSubfolderCode.trim(),
        position: newSubfolderPosition || subChapters.length + 1,
      });
      if (error) throw error;
      toast.success("Sub-folder created!");
      setNewSubfolderTitle(""); setNewSubfolderCode(""); setNewSubfolderPosition(0);
      setShowCreateSubfolder(false);
      // Refresh sub-chapters
      const { data } = await supabase.from('chapters').select('*')
        .eq('parent_id', selectedChapterId).order('position', { ascending: true });
      setSubChapters(data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreatingSubfolder(false);
    }
  };

  const BLOCKED_EXTS = ['exe','html','htm','js','php','sh','bat','cmd','vbs','py','rb','mjs','ts','tsx','json','xml','svg'];
  const ALLOWED_MIME_TYPES = [
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg','image/png','image/gif','image/webp',
    'application/octet-stream', // fallback for some systems
  ];

  const validateFile = (file: File): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (BLOCKED_EXTS.includes(ext)) {
      toast.error(`File type ".${ext}" is not allowed for security reasons`);
      return false;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== '') {
      toast.error(`File type "${file.type}" is not allowed. Use PDF, Office docs, or images.`);
      return false;
    }
    return true;
  };

  const handleUpload = async () => {
    if (!title || !selectedCourseId || !selectedChapterId) {
      toast.error("Please fill title and select course & chapter via breadcrumbs");
      return;
    }
    if (uploadType === "VIDEO" && !videoUrl) { toast.error("Please enter video URL"); return; }
    if (uploadType !== "VIDEO" && pdfInputMode === "file" && !pdfFile) { toast.error("Please select a file"); return; }
    if (uploadType !== "VIDEO" && pdfInputMode === "url" && !pdfUrl) { toast.error("Please enter a URL"); return; }
    // MIME type validation
    if (pdfFile && !validateFile(pdfFile)) return;
    if (classPdfFile && !validateFile(classPdfFile)) return;

    setIsUploading(true);
    try {
      let contentUrl = "";
      if (uploadType !== "VIDEO" && pdfInputMode === "url") {
        contentUrl = pdfUrl;
      } else if (uploadType !== "VIDEO" && pdfFile) {
        const fileExt = pdfFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('content').upload(`lessons/${fileName}`, pdfFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('content').getPublicUrl(`lessons/${fileName}`);
        contentUrl = publicUrl;
      } else {
        contentUrl = videoUrl;
      }

      let classPdfFinalUrl: string | null = null;
      if (classPdfFile) {
        const fileExt = classPdfFile.name.split('.').pop();
        const fileName = `class-pdf/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: pdfUploadError } = await supabase.storage.from('content').upload(fileName, classPdfFile);
        if (pdfUploadError) throw pdfUploadError;
        const { data: { publicUrl } } = supabase.storage.from('content').getPublicUrl(fileName);
        classPdfFinalUrl = publicUrl;
      } else if (classPdfUrl.trim()) {
        classPdfFinalUrl = classPdfUrl.trim();
      }

      const { error } = await supabase.from('lessons').insert({
        course_id: selectedCourseId,
        chapter_id: selectedChapterId,
        title,
        video_url: contentUrl,
        description: description || null,
        overview: watermarkText || null,
        is_locked: true,
        lecture_type: uploadType,
        class_pdf_url: classPdfFinalUrl,
      }).select().single();

      if (error) throw error;
      toast.success("Content uploaded successfully!");
      setTitle(""); setVideoUrl(""); setPdfFile(null); setPdfUrl(""); setDescription(""); setClassPdfFile(null); setClassPdfUrl("");
      // Refresh lessons list
      const { data } = await supabase.from('lessons').select('*')
        .eq('chapter_id', selectedChapterId).order('position', { ascending: true });
      setLessons(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm("Delete this lesson?")) return;
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) { toast.error(error.message); }
    else {
      toast.success("Lesson deleted");
      setLessons(prev => prev.filter(l => l.id !== id));
    }
  };

  const typeIcon = (type: string) => {
    if (type === "VIDEO") return <Video className="h-4 w-4" />;
    if (type === "TEST") return <ClipboardCheck className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const typeColor = (type: string) => {
    if (type === "VIDEO") return "bg-blue-100 text-blue-600";
    if (type === "PDF") return "bg-orange-100 text-orange-600";
    if (type === "DPP") return "bg-green-100 text-green-600";
    if (type === "NOTES") return "bg-purple-100 text-purple-600";
    if (type === "TEST") return "bg-red-100 text-red-600";
    return "bg-muted text-muted-foreground";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
      </div>
    );
  }

  // === BREADCRUMB NAV ===
  const renderBreadcrumb = () => (
    <nav className="flex items-center gap-1.5 text-sm mb-4 flex-wrap py-2 px-1" aria-label="Breadcrumb">
      <button
        onClick={() => { setSelectedCourseId(null); setSelectedChapterId(null); }}
        className={cn(
          "hover:text-primary transition-colors",
          !selectedCourseId ? "font-semibold text-foreground" : "text-muted-foreground"
        )}
      >
        All Courses
      </button>
      {selectedCourse && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <button
            onClick={() => setSelectedChapterId(null)}
            className={cn(
              "hover:text-primary transition-colors",
              !selectedChapterId ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
          >
            {selectedCourse.title}
          </button>
        </>
      )}
      {selectedChapter && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-semibold text-foreground">{selectedChapter.title}</span>
        </>
      )}
    </nav>
  );

  // === UPLOAD FORM ===
  const renderUploadForm = () => (
    <div className="space-y-5">
      {/* Type tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["VIDEO", "PDF", "DPP", "NOTES", "TEST"] as UploadType[]).map(type => (
          <button
            key={type}
            onClick={() => setUploadType(type)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap",
              uploadType === type
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
          >
            {typeIcon(type)}
            {type === "VIDEO" ? "Lecture" : type === "NOTES" ? "Notes" : type}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>Title *</Label>
        <Input placeholder="Content Title" value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Description (Optional)</Label>
        <textarea
          placeholder="Brief description of this content..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          rows={3}
        />
      </div>

      {uploadType === "VIDEO" ? (
        <div className="space-y-2">
          <Label>Video URL (YouTube/Vimeo/Archive.org/Drive)</Label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="https://..." value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="pl-10" />
          </div>
          {videoUrl && <MediaPreview url={videoUrl} type="video" />}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Upload {uploadType}</Label>
            <div className="flex gap-1 bg-muted rounded-md p-0.5">
              <button type="button" className={cn("px-3 py-1 text-xs rounded", pdfInputMode === 'file' ? 'bg-background shadow text-foreground' : 'text-muted-foreground')} onClick={() => setPdfInputMode("file")}>
                <FileUp className="h-3 w-3 inline mr-1" />File
              </button>
              <button type="button" className={cn("px-3 py-1 text-xs rounded", pdfInputMode === 'url' ? 'bg-background shadow text-foreground' : 'text-muted-foreground')} onClick={() => setPdfInputMode("url")}>
                <LinkIcon className="h-3 w-3 inline mr-1" />URL
              </button>
            </div>
          </div>
          {pdfInputMode === "file" ? (
            <>
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:border-primary/60 transition-colors">
                <input id="pdfFile" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.jpg,.jpeg,.png,.gif" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="hidden" />
                <label htmlFor="pdfFile" className="cursor-pointer">
                  <FileUp className="h-8 w-8 mx-auto text-primary/50 mb-2" />
                  {pdfFile ? <p className="text-primary font-medium text-sm">{pdfFile.name}</p> : <p className="text-muted-foreground text-sm">Click to select file</p>}
                </label>
              </div>
              {pdfFile && <MediaPreview file={pdfFile} type="pdf" />}
            </>
          ) : (
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Paste direct link..." value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} className="pl-10" />
            </div>
          )}
        </div>
      )}

      {/* Class PDF (optional) */}
      <div className="space-y-1.5">
        <Label>Class PDF (optional - students can download)</Label>
        <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 text-center hover:border-primary/40 transition-colors">
          <input id="classPdfFile" type="file" accept=".pdf" onChange={e => setClassPdfFile(e.target.files?.[0] || null)} className="hidden" />
          <label htmlFor="classPdfFile" className="cursor-pointer">
            <FileText className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            {classPdfFile ? (
              <p className="text-primary font-medium text-sm">{classPdfFile.name}</p>
            ) : (
              <p className="text-muted-foreground text-sm">Click to upload Class PDF</p>
            )}
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Or paste a URL:</p>
        <Input placeholder="https://... class PDF URL" value={classPdfUrl} onChange={e => setClassPdfUrl(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Watermark Text</Label>
        <Input value={watermarkText} onChange={e => setWatermarkText(e.target.value)} />
      </div>

      <Button onClick={handleUpload} disabled={isUploading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
        {isUploading ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Uploading...</> : <><Upload className="h-5 w-5 mr-2" />Publish Content</>}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Sadguru Coaching Classes" className="h-10 w-10 rounded-xl" />
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-400" />
                Upload Center
              </h1>
              <p className="text-xs text-purple-300">Welcome, {user?.full_name || 'Admin'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="text-white border-white/30 hover:bg-white/10 text-xs">Dashboard</Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/10"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {renderBreadcrumb()}

        {/* LEVEL 1: Course Grid */}
        {!selectedCourseId && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Select a Course</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map(course => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourseId(course.id)}
                  className="p-4 border rounded-xl bg-card hover:border-primary hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{course.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Grade {course.grade}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* LEVEL 2: Chapter List + Create Chapter */}
        {selectedCourseId && !selectedChapterId && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Select a Chapter</h2>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowCreateChapter(!showCreateChapter)}>
                <Plus className="h-4 w-4" />
                Create Chapter
              </Button>
            </div>

            {/* Create Chapter Form */}
            {showCreateChapter && (
              <Card className="mb-4 border-primary/20">
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Title *</Label>
                      <Input placeholder="Chapter title" value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Code *</Label>
                      <Input placeholder="CH01" value={newChapterCode} onChange={e => setNewChapterCode(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Position</Label>
                    <Input type="number" placeholder="1" value={newChapterPosition || ''} onChange={e => setNewChapterPosition(Number(e.target.value))} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreateChapter} disabled={creatingChapter}>
                      {creatingChapter ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                      Create
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowCreateChapter(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {chaptersLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading chapters...</p>
            ) : chapters.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No chapters found. Create one above!</p>
            ) : (
              <div className="space-y-3">
                {chapters.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChapterId(ch.id)}
                    className="w-full p-4 border rounded-xl bg-card hover:border-primary hover:shadow-sm transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {ch.position || "—"}
                        </div>
                        <p className="font-medium text-sm">{ch.title}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LEVEL 3: Upload Form + Sub-folders + Existing Lessons */}
        {selectedCourseId && selectedChapterId && (
          <div className="space-y-6">
            {/* Sub-folders section */}
            <Card>
              <CardHeader className="bg-muted/30 border-b py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FolderOpen className="h-4 w-4" />
                    Sub-folders ({subChapters.length})
                  </CardTitle>
                  <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => setShowCreateSubfolder(!showCreateSubfolder)}>
                    <FolderPlus className="h-3.5 w-3.5" />
                    Add Sub-folder
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                {showCreateSubfolder && (
                  <div className="mb-3 p-3 border rounded-lg space-y-2 bg-muted/10">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Title *</Label>
                        <Input placeholder="Sub-folder title" value={newSubfolderTitle} onChange={e => setNewSubfolderTitle(e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Code *</Label>
                        <Input placeholder="SF01" value={newSubfolderCode} onChange={e => setNewSubfolderCode(e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs" onClick={handleCreateSubfolder} disabled={creatingSubfolder}>
                        {creatingSubfolder ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                        Create
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowCreateSubfolder(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
                {subChapters.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No sub-folders. Create one above.</p>
                ) : (
                  <div className="space-y-1.5">
                    {subChapters.map(sc => (
                      <button
                        key={sc.id}
                        onClick={() => setSelectedChapterId(sc.id)}
                        className="w-full p-2.5 border rounded-lg bg-card hover:border-primary transition-all text-left group flex items-center gap-2"
                      >
                        <FolderOpen className="h-4 w-4 text-primary/60" />
                        <span className="text-sm font-medium flex-1 truncate">{sc.code} : {sc.title}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Upload Form */}
              <Card className="border-2 border-primary/20 shadow-lg">
                <CardHeader className="bg-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Upload className="h-5 w-5" />
                    Upload New Material
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Uploading to: {selectedCourse?.title} → {selectedChapter?.title}
                  </p>
                </CardHeader>
                <CardContent className="p-5">
                  {renderUploadForm()}
                </CardContent>
              </Card>

              {/* Existing Lessons */}
              <Card className="shadow-lg">
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="h-5 w-5" />
                    Chapter Content ({lessons.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    {lessons.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No content yet. Upload the first item!</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {lessons.map(lesson => (
                          <div key={lesson.id} className="p-3 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className={cn("p-1.5 rounded-md", typeColor(lesson.lecture_type))}>
                                  {typeIcon(lesson.lecture_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{lesson.title}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Badge variant="secondary" className="text-[10px]">
                                      {lesson.lecture_type || "VIDEO"}
                                    </Badge>
                                    {lesson.class_pdf_url && (
                                      <Badge variant="outline" className="text-[10px] gap-0.5">
                                        <FileText className="h-2.5 w-2.5" />
                                        PDF
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteLesson(lesson.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminUpload;
