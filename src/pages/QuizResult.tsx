import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, ChevronLeft, Trophy, Clock,
  Target, RotateCcw, ChevronDown, ChevronUp, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  marks: number;
  negative_marks: number;
  order_index: number;
}

interface Attempt {
  id: string;
  score: number;
  percentage: number;
  passed: boolean;
  answers: Record<string, string>;
  time_taken_seconds: number;
  submitted_at: string;
}

interface Quiz {
  id: string;
  title: string;
  total_marks: number;
  pass_percentage: number;
  type: string;
}

const QuizResult = () => {
  const { quizId, attemptId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      if (!quizId || !attemptId) return;
      try {
        const [quizRes, questionsRes, attemptRes] = await Promise.all([
          supabase.from("quizzes").select("*").eq("id", quizId).single(),
          supabase.from("questions").select("*").eq("quiz_id", quizId).order("order_index"),
          supabase.from("quiz_attempts").select("*").eq("id", attemptId).single(),
        ]);
        if (quizRes.error) throw quizRes.error;
        if (questionsRes.error) throw questionsRes.error;
        if (attemptRes.error) throw attemptRes.error;

        setQuiz(quizRes.data as Quiz);
        setQuestions(
          (questionsRes.data || []).map((q: any) => ({
            ...q,
            options: Array.isArray(q.options) ? q.options : (q.options ? Object.values(q.options) : null),
          }))
        );
        setAttempt({
          ...attemptRes.data,
          answers: (attemptRes.data.answers as Record<string, string>) || {},
        });
      } catch (err: any) {
        toast.error(err.message);
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [quizId, attemptId]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const toggleExpand = (id: string) => {
    const updated = new Set(expandedIds);
    if (updated.has(id)) updated.delete(id);
    else updated.add(id);
    setExpandedIds(updated);
  };

  const getOptionLabel = (options: string[] | null, idx: string) => {
    const i = parseInt(idx);
    return options?.[i] ?? idx;
  };

  if (loading) return <LoadingSpinner fullPage size="lg" text="Loading results..." />;
  if (!quiz || !attempt) return null;

  const totalMarks = quiz.total_marks || questions.reduce((s, q) => s + q.marks, 0);
  const percentage = attempt.percentage || 0;
  const passed = attempt.passed;
  const answeredCount = Object.keys(attempt.answers).filter((k) => attempt.answers[k]).length;
  const correctCount = questions.filter((q) => attempt.answers[q.id] === q.correct_answer).length;
  const wrongCount = questions.filter(
    (q) => attempt.answers[q.id] && attempt.answers[q.id] !== q.correct_answer
  ).length;
  const skippedCount = questions.length - answeredCount;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card border-b shadow-sm px-4 py-3">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold flex-1 truncate">{quiz.title} — Results</h1>
          <Badge variant={passed ? "default" : "destructive"} className="shrink-0">
            {passed ? "PASSED" : "FAILED"}
          </Badge>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Score Card */}
        <div
          className={cn(
            "rounded-2xl p-6 text-center border-2 shadow-lg",
            passed
              ? "bg-green-500/5 border-green-500/30"
              : "bg-destructive/5 border-destructive/30"
          )}
        >
          <div
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold",
              passed ? "bg-green-500" : "bg-destructive"
            )}
          >
            {Math.round(percentage)}%
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {attempt.score}/{totalMarks}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {passed ? "🎉 Congratulations! You passed!" : "Better luck next time. Keep practicing!"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Pass mark: {quiz.pass_percentage}%
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: CheckCircle2, label: "Correct", value: correctCount, color: "text-green-600" },
            { icon: XCircle, label: "Wrong", value: wrongCount, color: "text-destructive" },
            { icon: Target, label: "Skipped", value: skippedCount, color: "text-muted-foreground" },
            {
              icon: Clock,
              label: "Time",
              value: attempt.time_taken_seconds ? formatTime(attempt.time_taken_seconds) : "—",
              color: "text-primary",
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-card border rounded-xl p-3 text-center">
              <Icon className={cn("h-5 w-5 mx-auto mb-1", color)} />
              <p className="text-lg font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => navigate(`/quiz/${quizId}`)}
          >
            <RotateCcw className="h-4 w-4" />
            Retake Quiz
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => navigate(-2)}
          >
            <Trophy className="h-4 w-4" />
            Back to Lesson
          </Button>
        </div>

        {/* Question Review */}
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">Answer Review</h3>
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const userAns = attempt.answers[q.id];
              const isCorrect = userAns === q.correct_answer;
              const isSkipped = !userAns;
              const isExpanded = expandedIds.has(q.id);

              return (
                <div
                  key={q.id}
                  className={cn(
                    "border-2 rounded-xl overflow-hidden",
                    isCorrect
                      ? "border-green-500/30 bg-green-500/5"
                      : isSkipped
                      ? "border-border bg-card"
                      : "border-destructive/30 bg-destructive/5"
                  )}
                >
                  {/* Question header */}
                  <button
                    className="w-full flex items-start gap-3 p-4 text-left"
                    onClick={() => toggleExpand(q.id)}
                  >
                    <div className="shrink-0 mt-0.5">
                      {isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : isSkipped ? (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Q{idx + 1}</p>
                      <p className="text-sm font-medium text-foreground line-clamp-2">{q.question_text}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isCorrect ? "text-green-600" : isSkipped ? "text-muted-foreground" : "text-destructive"
                        )}
                      >
                        {isCorrect ? `+${q.marks}` : isSkipped ? "0" : `-${q.negative_marks}`}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border/50">
                      {q.options && (
                        <div className="space-y-2 mt-3">
                          {q.options.map((opt, i) => {
                            const optKey = String(i);
                            const isUserChoice = userAns === optKey;
                            const isCorrectOpt = q.correct_answer === optKey;
                            return (
                              <div
                                key={i}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                                  isCorrectOpt
                                    ? "bg-green-500/15 border border-green-500/30 text-green-700 dark:text-green-400"
                                    : isUserChoice && !isCorrectOpt
                                    ? "bg-destructive/15 border border-destructive/30 text-destructive"
                                    : "bg-muted/30"
                                )}
                              >
                                <span className="font-semibold text-xs w-5">{String.fromCharCode(65 + i)}.</span>
                                <span className="flex-1">{opt}</span>
                                {isCorrectOpt && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                {isUserChoice && !isCorrectOpt && <XCircle className="h-4 w-4 text-destructive" />}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.question_type === "true_false" && (
                        <div className="text-sm mt-2">
                          <span className="text-muted-foreground">Correct: </span>
                          <span className="font-semibold text-green-600 capitalize">{q.correct_answer}</span>
                          {userAns && (
                            <>
                              <span className="text-muted-foreground ml-3">Your answer: </span>
                              <span className={cn("font-semibold capitalize", isCorrect ? "text-green-600" : "text-destructive")}>
                                {userAns}
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {q.explanation && (
                        <div className="flex gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                          <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-sm text-foreground">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizResult;
