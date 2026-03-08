import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Plus, Trash2, ChevronLeft, Eye, EyeOff, Save, Loader2,
  ClipboardList, FlaskConical, Edit2, ArrowLeft, Check, X, Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Quiz {
  id: string;
  title: string;
  type: string;
  is_published: boolean;
  total_marks: number;
  duration_minutes: number;
  pass_percentage: number;
  course_id: number | null;
  lesson_id: string | null;
  created_at: string;
}

interface QuestionForm {
  question_text: string;
  question_type: "mcq" | "true_false" | "numerical";
  options: string[];
  correct_answer: string;
  explanation: string;
  marks: number;
  negative_marks: number;
}

const defaultQuestion = (): QuestionForm => ({
  question_text: "",
  question_type: "mcq",
  options: ["", "", "", ""],
  correct_answer: "0",
  explanation: "",
  marks: 4,
  negative_marks: 1,
});

const AdminQuizManager = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);

  // UI state
  const [view, setView] = useState<"list" | "create" | "edit-questions">("list");
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [savingQuiz, setSavingQuiz] = useState(false);

  // Quiz form
  const [quizForm, setQuizForm] = useState({
    title: "",
    type: "dpp",
    course_id: "",
    lesson_id: "",
    duration_minutes: 30,
    total_marks: 0,
    pass_percentage: 40,
    description: "",
  });

  // Questions for current quiz
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionForms, setQuestionForms] = useState<QuestionForm[]>([defaultQuestion()]);
  const [savingQuestions, setSavingQuestions] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login"); return; }
      const { data: roleData } = await supabase.from("user_roles")
        .select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      if (!roleData) { navigate("/admin"); return; }
      await Promise.all([fetchQuizzes(), fetchCourses()]);
      setLoading(false);
    };
    init();
  }, []);

  const fetchQuizzes = async () => {
    const { data } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false });
    setQuizzes((data || []) as Quiz[]);
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from("courses").select("id, title").order("title");
    setCourses(data || []);
  };

  const fetchLessons = async (courseId: number) => {
    const { data } = await supabase.from("lessons").select("id, title, lecture_type")
      .eq("course_id", courseId).in("lecture_type", ["DPP", "TEST"]).order("title");
    setLessons(data || []);
  };

  const handleCreateQuiz = async () => {
    if (!quizForm.title.trim()) { toast.error("Title is required"); return; }
    setSavingQuiz(true);
    try {
      const payload: any = {
        title: quizForm.title.trim(),
        type: quizForm.type,
        duration_minutes: quizForm.duration_minutes,
        total_marks: quizForm.total_marks,
        pass_percentage: quizForm.pass_percentage,
        description: quizForm.description || null,
        is_published: false,
      };
      if (quizForm.course_id) payload.course_id = Number(quizForm.course_id);
      if (quizForm.lesson_id) payload.lesson_id = quizForm.lesson_id;

      const { data, error } = await supabase.from("quizzes").insert(payload).select().single();
      if (error) throw error;
      toast.success("Quiz created! Now add questions.");
      await fetchQuizzes();
      setEditingQuizId(data.id);
      setQuestionForms([defaultQuestion()]);
      setView("edit-questions");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingQuiz(false);
    }
  };

  const handleSaveQuestions = async () => {
    if (!editingQuizId) return;
    const valid = questionForms.every(q => q.question_text.trim() && q.correct_answer);
    if (!valid) { toast.error("Each question must have text and a correct answer"); return; }

    setSavingQuestions(true);
    try {
      // Delete existing then re-insert
      await supabase.from("questions").delete().eq("quiz_id", editingQuizId);
      const rows = questionForms.map((q, idx) => ({
        quiz_id: editingQuizId,
        question_text: q.question_text.trim(),
        question_type: q.question_type,
        options: q.question_type === "mcq" ? q.options : null,
        correct_answer: q.correct_answer,
        explanation: q.explanation || null,
        marks: q.marks,
        negative_marks: q.negative_marks,
        order_index: idx,
      }));
      const { error } = await supabase.from("questions").insert(rows);
      if (error) throw error;

      // Update total_marks
      const totalMarks = questionForms.reduce((s, q) => s + q.marks, 0);
      await supabase.from("quizzes").update({ total_marks: totalMarks }).eq("id", editingQuizId);

      toast.success("Questions saved!");
      await fetchQuizzes();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingQuestions(false);
    }
  };

  const loadQuizForEdit = async (quiz: Quiz) => {
    setEditingQuizId(quiz.id);
    const { data } = await supabase.from("questions").select("*")
      .eq("quiz_id", quiz.id).order("order_index");
    if (data && data.length > 0) {
      setQuestionForms(data.map((q: any) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        options: Array.isArray(q.options) ? q.options : ["", "", "", ""],
        correct_answer: q.correct_answer,
        explanation: q.explanation || "",
        marks: q.marks,
        negative_marks: q.negative_marks,
      })));
    } else {
      setQuestionForms([defaultQuestion()]);
    }
    setView("edit-questions");
  };

  const togglePublish = async (quiz: Quiz) => {
    const { error } = await supabase.from("quizzes")
      .update({ is_published: !quiz.is_published }).eq("id", quiz.id);
    if (error) { toast.error(error.message); return; }
    toast.success(quiz.is_published ? "Quiz unpublished" : "Quiz published!");
    fetchQuizzes();
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm("Delete this quiz and all its questions?")) return;
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Quiz deleted");
    fetchQuizzes();
  };

  const updateQuestionForm = (idx: number, field: keyof QuestionForm, value: any) => {
    setQuestionForms(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestionForms(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[optIdx] = value;
      return { ...q, options: opts };
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <button onClick={() => navigate("/admin")} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold flex-1">Quiz Manager</h1>
            <Button size="sm" className="gap-1.5" onClick={() => { setQuizForm({ title: "", type: "dpp", course_id: "", lesson_id: "", duration_minutes: 30, total_marks: 0, pass_percentage: 40, description: "" }); setView("create"); }}>
              <Plus className="h-4 w-4" />
              New Quiz
            </Button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-4 space-y-3">
          {quizzes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No quizzes yet</p>
              <p className="text-sm">Create your first DPP or Test quiz</p>
            </div>
          ) : (
            quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-card border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2.5 rounded-lg",
                    quiz.type === "dpp" ? "bg-blue-500/10 text-blue-600" : "bg-purple-500/10 text-purple-600"
                  )}>
                    {quiz.type === "dpp" ? <ClipboardList className="h-5 w-5" /> : <FlaskConical className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm truncate">{quiz.title}</h3>
                      <Badge variant={quiz.is_published ? "default" : "secondary"} className="text-[10px]">
                        {quiz.is_published ? "Published" : "Draft"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] uppercase">{quiz.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {quiz.total_marks} marks · {quiz.duration_minutes > 0 ? `${quiz.duration_minutes} min` : "No limit"} · Pass: {quiz.pass_percentage}%
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loadQuizForEdit(quiz)} title="Edit questions">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublish(quiz)} title={quiz.is_published ? "Unpublish" : "Publish"}>
                      {quiz.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteQuiz(quiz.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </main>
      </div>
    );
  }

  // ─── CREATE QUIZ VIEW ────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3 max-w-2xl mx-auto">
            <button onClick={() => setView("list")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-base font-bold flex-1">Create New Quiz</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto p-4 space-y-5">
          <div className="space-y-1.5">
            <Label>Quiz Title *</Label>
            <Input placeholder="e.g., Chapter 3 DPP" value={quizForm.title} onChange={e => setQuizForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={quizForm.type} onValueChange={v => setQuizForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dpp">DPP (Daily Practice)</SelectItem>
                  <SelectItem value="test">Test / Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Duration (minutes, 0 = no limit)</Label>
              <Input type="number" min={0} value={quizForm.duration_minutes} onChange={e => setQuizForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Pass Percentage (%)</Label>
              <Input type="number" min={0} max={100} value={quizForm.pass_percentage} onChange={e => setQuizForm(f => ({ ...f, pass_percentage: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Link to Course (optional)</Label>
            <Select value={quizForm.course_id} onValueChange={v => { setQuizForm(f => ({ ...f, course_id: v, lesson_id: "" })); if (v) fetchLessons(Number(v)); }}>
              <SelectTrigger><SelectValue placeholder="Select course..." /></SelectTrigger>
              <SelectContent>
                {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {quizForm.course_id && (
            <div className="space-y-1.5">
              <Label>Link to Lesson (DPP/TEST lessons only)</Label>
              <Select value={quizForm.lesson_id} onValueChange={v => setQuizForm(f => ({ ...f, lesson_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select lesson..." /></SelectTrigger>
                <SelectContent>
                  {lessons.length === 0 ? (
                    <SelectItem value="" disabled>No DPP/TEST lessons found</SelectItem>
                  ) : (
                    lessons.map(l => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <textarea
              rows={3}
              value={quizForm.description}
              onChange={e => setQuizForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <Button onClick={handleCreateQuiz} disabled={savingQuiz} className="w-full gap-2">
            {savingQuiz ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Create & Add Questions
          </Button>
        </main>
      </div>
    );
  }

  // ─── EDIT QUESTIONS VIEW ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <button onClick={() => { setView("list"); setEditingQuizId(null); }} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold flex-1">Edit Questions</h1>
          <span className="text-xs text-muted-foreground">{questionForms.length} questions</span>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setQuestionForms(f => [...f, defaultQuestion()])}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
          <Button size="sm" className="gap-1" onClick={handleSaveQuestions} disabled={savingQuestions}>
            {savingQuestions ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {questionForms.map((q, qIdx) => (
          <div key={qIdx} className="bg-card border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-primary">Question {qIdx + 1}</span>
              <button
                onClick={() => setQuestionForms(prev => prev.filter((_, i) => i !== qIdx))}
                className="text-destructive hover:text-destructive/80 p-1 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <Label className="text-xs">Question Text *</Label>
              <textarea
                rows={3}
                value={q.question_text}
                onChange={e => updateQuestionForm(qIdx, "question_text", e.target.value)}
                placeholder="Enter the question..."
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={q.question_type} onValueChange={v => updateQuestionForm(qIdx, "question_type", v as any)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">MCQ</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="numerical">Numerical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Marks (+)</Label>
                <Input type="number" min={0} value={q.marks} onChange={e => updateQuestionForm(qIdx, "marks", Number(e.target.value))} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">Negative Marks</Label>
                <Input type="number" min={0} value={q.negative_marks} onChange={e => updateQuestionForm(qIdx, "negative_marks", Number(e.target.value))} className="mt-1 h-9" />
              </div>
            </div>

            {q.question_type === "mcq" && (
              <div className="space-y-2">
                <Label className="text-xs">Options (select correct answer)</Label>
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuestionForm(qIdx, "correct_answer", String(oIdx))}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center text-xs font-bold transition-colors",
                        q.correct_answer === String(oIdx)
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-muted-foreground/30 text-muted-foreground hover:border-green-400"
                      )}
                    >
                      {String.fromCharCode(65 + oIdx)}
                    </button>
                    <Input
                      placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                      value={opt}
                      onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                      className="h-9 flex-1"
                    />
                  </div>
                ))}
              </div>
            )}

            {q.question_type === "true_false" && (
              <div>
                <Label className="text-xs">Correct Answer</Label>
                <div className="flex gap-3 mt-1">
                  {["true", "false"].map(v => (
                    <button
                      key={v}
                      onClick={() => updateQuestionForm(qIdx, "correct_answer", v)}
                      className={cn(
                        "px-6 py-2 rounded-lg border-2 text-sm font-medium transition-colors capitalize",
                        q.correct_answer === v ? "border-green-500 bg-green-500/10 text-green-600" : "border-border"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {q.question_type === "numerical" && (
              <div>
                <Label className="text-xs">Correct Answer (numerical)</Label>
                <Input
                  type="number"
                  value={q.correct_answer}
                  onChange={e => updateQuestionForm(qIdx, "correct_answer", e.target.value)}
                  placeholder="e.g. 42"
                  className="mt-1 h-9 max-w-[200px]"
                />
              </div>
            )}

            <div>
              <Label className="text-xs">Explanation (shown after submit)</Label>
              <Input
                value={q.explanation}
                onChange={e => updateQuestionForm(qIdx, "explanation", e.target.value)}
                placeholder="Why is this the correct answer?"
                className="mt-1 h-9"
              />
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setQuestionForms(f => [...f, defaultQuestion()])}
        >
          <Plus className="h-4 w-4" />
          Add Another Question
        </Button>

        <Button className="w-full gap-2" onClick={handleSaveQuestions} disabled={savingQuestions}>
          {savingQuestions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save All Questions
        </Button>
      </main>
    </div>
  );
};

export default AdminQuizManager;
