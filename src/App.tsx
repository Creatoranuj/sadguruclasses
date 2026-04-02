import { Suspense, lazy, memo, useState, useEffect, ComponentType } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BatchProvider } from "./contexts/BatchContext";

// Critical path - load immediately
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Retry wrapper for lazy imports — auto-reload once on chunk fetch failure
const lazyWithRetry = (
  importFn: () => Promise<{ default: ComponentType<unknown> }>
) =>
  lazy(() =>
    importFn().catch((error: unknown) => {
      const hasReloaded = sessionStorage.getItem("chunk_reload");
      if (!hasReloaded) {
        sessionStorage.setItem("chunk_reload", "1");
        window.location.reload();
        // Return a never-resolving promise to prevent rendering while reloading
        return new Promise(() => {});
      }
      sessionStorage.removeItem("chunk_reload");
      throw error;
    })
  );

// Clear reload flag on successful load
if (sessionStorage.getItem("chunk_reload")) {
  sessionStorage.removeItem("chunk_reload");
}

// Lazy loaded pages with retry
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const Courses = lazyWithRetry(() => import("./pages/Courses"));
const Course = lazyWithRetry(() => import("./pages/Course"));
const Lesson = lazyWithRetry(() => import("./pages/Lesson"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

// Admin Pages
const Admin = lazyWithRetry(() => import("./pages/Admin"));
const AdminLogin = lazyWithRetry(() => import("./pages/AdminLogin"));
const AdminRegister = lazyWithRetry(() => import("./pages/AdminRegister"));
const AdminUpload = lazyWithRetry(() => import("./pages/AdminUpload"));
const AdminCMS = lazyWithRetry(() => import("./pages/AdminCMS"));
const AdminSchedule = lazyWithRetry(() => import("./pages/AdminSchedule"));

// Other Protected Pages
const Attendance = lazyWithRetry(() => import("./pages/Attendance"));
const Reports = lazyWithRetry(() => import("./pages/Reports"));
const Students = lazyWithRetry(() => import("./pages/Students"));
const Messages = lazyWithRetry(() => import("./pages/Messages"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Timetable = lazyWithRetry(() => import("./pages/Timetable"));
const Books = lazyWithRetry(() => import("./pages/Books"));
const Notices = lazyWithRetry(() => import("./pages/Notices"));
const Materials = lazyWithRetry(() => import("./pages/Materials"));
const Syllabus = lazyWithRetry(() => import("./pages/Syllabus"));
const BuyCourse = lazyWithRetry(() => import("./pages/BuyCourse"));
const AllClasses = lazyWithRetry(() => import("./pages/AllClasses"));
const LessonView = lazyWithRetry(() => import("./pages/LessonView"));
const ChapterView = lazyWithRetry(() => import("./pages/ChapterView"));
const LectureListing = lazyWithRetry(() => import("./pages/LectureListing"));
const MyCourses = lazyWithRetry(() => import("./pages/MyCourses"));
const MyCourseDetail = lazyWithRetry(() => import("./pages/MyCourseDetail"));
const AllTests = lazyWithRetry(() => import("./pages/AllTests"));
const Install = lazyWithRetry(() => import("./pages/Install"));
const QuizAttempt = lazyWithRetry(() => import("./pages/QuizAttempt"));
const QuizResult = lazyWithRetry(() => import("./pages/QuizResult"));
const AdminQuizManager = lazyWithRetry(() => import("./pages/AdminQuizManager"));
const LiveClass = lazyWithRetry(() => import("./pages/LiveClass"));
const AdminLiveManager = lazyWithRetry(() => import("./pages/AdminLiveManager"));
const TeacherLiveView = lazyWithRetry(() => import("./pages/TeacherLiveView"));
const AdminChatbotSettings = lazyWithRetry(() => import("./pages/AdminChatbotSettings"));
const AdminAnalytics = lazyWithRetry(() => import("./pages/AdminAnalytics"));
const Downloads = lazyWithRetry(() => import("./pages/Downloads"));
const Doubts = lazyWithRetry(() => import("./pages/Doubts"));
const ChatWidget = lazy(() => import("./components/chat/ChatWidget"));
import { useAndroidBackButton } from "./hooks/useAndroidBackButton";

// Component that activates the back button hook inside Router context
const BackButtonHandler = () => {
  useAndroidBackButton();
  return null;
};

// Optimized QueryClient with better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Logo-based page loader with pulse animation
import nbLogo from "./assets/sadguru-logo.png";

const PageLoader = memo(() => {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <img src={nbLogo} alt="Loading" className="h-16 w-16 rounded-2xl animate-pulse" />
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/40 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <p className="text-muted-foreground text-sm">
          {showRetry ? "Taking longer than expected..." : "Loading Sadguru Classes..."}
        </p>
        {showRetry && (
          <button
            onClick={() => window.location.reload()}
            className="text-primary hover:underline text-sm font-medium"
          >
            Refresh Page
          </button>
        )}
      </div>
    </div>
  );
});

PageLoader.displayName = "PageLoader";

// PublicRoute: redirect authenticated users to dashboard
const PublicRoute = ({ element }: { element: React.ReactElement }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return element;
};

// ProtectedRoute: only accessible to authenticated users
const ProtectedRoute = ({ element }: { element: React.ReactElement }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return element;
};

// AdminRoute: only accessible to users with admin role
const AdminRoute = ({ element }: { element: React.ReactElement }) => {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAdmin) return <Navigate to="/login" replace />;
  return element;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <BatchProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <HashRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes — redirect logged-in users to dashboard */}
                  <Route path="/" element={<PublicRoute element={<Index />} />} />
                  <Route path="/login" element={<PublicRoute element={<Login />} />} />
                  <Route path="/signup" element={<PublicRoute element={<Signup />} />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/install" element={<Install />} />
                  
                  {/* Admin Login/Register — public */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin/register" element={<AdminRegister />} />

                  {/* Admin Routes — role-guarded */}
                  <Route path="/admin" element={<AdminRoute element={<Admin />} />} />
                  <Route path="/admin/upload" element={<AdminRoute element={<AdminUpload />} />} />
                  <Route path="/admin/cms" element={<AdminRoute element={<AdminCMS />} />} />
                  <Route path="/admin/schedule" element={<AdminRoute element={<AdminSchedule />} />} />
                  <Route path="/admin/quiz" element={<AdminRoute element={<AdminQuizManager />} />} />
                  <Route path="/admin/live" element={<AdminRoute element={<AdminLiveManager />} />} />
                  <Route path="/admin/chatbot" element={<AdminRoute element={<AdminChatbotSettings />} />} />
                  <Route path="/admin/analytics" element={<AdminRoute element={<AdminAnalytics />} />} />
                  
                  {/* Protected Routes */}
                  <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
                  <Route path="/dashboard/my-courses" element={<ProtectedRoute element={<MyCourses />} />} />
                  <Route path="/my-courses" element={<ProtectedRoute element={<MyCourses />} />} />
                  <Route path="/my-courses/:courseId" element={<ProtectedRoute element={<MyCourseDetail />} />} />
                  <Route path="/courses" element={<ProtectedRoute element={<Courses />} />} />
                  <Route path="/course/:id" element={<ProtectedRoute element={<Course />} />} />
                  <Route path="/lesson/:id" element={<ProtectedRoute element={<Lesson />} />} />
                  
                  {/* Course Purchase & Learning Routes */}
                  <Route path="/buy-course" element={<ProtectedRoute element={<BuyCourse />} />} />
                  <Route path="/buy-course/:id" element={<ProtectedRoute element={<BuyCourse />} />} />
                  <Route path="/all-classes" element={<ProtectedRoute element={<AllClasses />} />} />
                  <Route path="/classes/:courseId/lessons" element={<ProtectedRoute element={<ErrorBoundary fallbackTitle="Lesson failed to load"><LessonView /></ErrorBoundary>} />} />
                  <Route path="/classes/:courseId/chapters" element={<ProtectedRoute element={<ChapterView />} />} />
                  <Route path="/classes/:courseId/chapter/:chapterId" element={<ProtectedRoute element={<LectureListing />} />} />
                  
                  {/* Quiz Routes */}
                  <Route path="/quiz/:quizId" element={<ProtectedRoute element={<QuizAttempt />} />} />
                  <Route path="/quiz/:quizId/result/:attemptId" element={<ProtectedRoute element={<QuizResult />} />} />

                  {/* Feature Pages */}
                   <Route path="/all-tests" element={<ProtectedRoute element={<AllTests />} />} />
                   <Route path="/live/:sessionId" element={<ProtectedRoute element={<LiveClass />} />} />
                   <Route path="/teacher/live/:sessionId" element={<ProtectedRoute element={<TeacherLiveView />} />} />
                  <Route path="/attendance" element={<ProtectedRoute element={<Attendance />} />} />
                  <Route path="/reports" element={<ProtectedRoute element={<Reports />} />} />
                  <Route path="/students" element={<ProtectedRoute element={<Students />} />} />
                  <Route path="/messages" element={<ProtectedRoute element={<Messages />} />} />
                  <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
                  <Route path="/settings" element={<ProtectedRoute element={<Settings />} />} />
                  <Route path="/timetable" element={<ProtectedRoute element={<Timetable />} />} />
                  <Route path="/books" element={<ProtectedRoute element={<Books />} />} />
                  <Route path="/notices" element={<ProtectedRoute element={<Notices />} />} />
                  <Route path="/materials" element={<ProtectedRoute element={<Materials />} />} />
                  <Route path="/syllabus" element={<ProtectedRoute element={<Syllabus />} />} />
                  
                   <Route path="/downloads" element={<ProtectedRoute element={<Downloads />} />} />
                   <Route path="/doubts" element={<ProtectedRoute element={<Doubts />} />} />
                   <Route path="*" element={<NotFound />} />
                </Routes>
              <BackButtonHandler />
              <ChatWidget />
              </Suspense>
            </HashRouter>
          </TooltipProvider>
        </BatchProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
