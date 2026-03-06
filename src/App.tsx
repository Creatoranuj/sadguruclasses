import { Suspense, lazy, memo, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BatchProvider } from "@/contexts/BatchContext";

// Critical path - load immediately
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Lazy loaded pages for code splitting
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Courses = lazy(() => import("./pages/Courses"));
const Course = lazy(() => import("./pages/Course"));
const Lesson = lazy(() => import("./pages/Lesson"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin Pages - Lazy loaded
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminRegister = lazy(() => import("./pages/AdminRegister"));
const AdminUpload = lazy(() => import("./pages/AdminUpload"));
const AdminCMS = lazy(() => import("./pages/AdminCMS"));
const AdminSchedule = lazy(() => import("./pages/AdminSchedule"));
// Other Protected Pages - Lazy loaded
const Attendance = lazy(() => import("./pages/Attendance"));
const Reports = lazy(() => import("./pages/Reports"));
const Students = lazy(() => import("./pages/Students"));
const Messages = lazy(() => import("./pages/Messages"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Timetable = lazy(() => import("./pages/Timetable"));
const Books = lazy(() => import("./pages/Books"));
const Notices = lazy(() => import("./pages/Notices"));
const Materials = lazy(() => import("./pages/Materials"));
const Syllabus = lazy(() => import("./pages/Syllabus"));
const BuyCourse = lazy(() => import("./pages/BuyCourse"));
const AllClasses = lazy(() => import("./pages/AllClasses"));
const LessonView = lazy(() => import("./pages/LessonView"));
const ChapterView = lazy(() => import("./pages/ChapterView"));
const LectureListing = lazy(() => import("./pages/LectureListing"));
const MyCourses = lazy(() => import("./pages/MyCourses"));
 const MyCourseDetail = lazy(() => import("./pages/MyCourseDetail"));
const AllTests = lazy(() => import("./pages/AllTests"));
const Install = lazy(() => import("./pages/Install"));

// Optimized QueryClient with better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Logo-based page loader with pulse animation
import refreshLogo from "@/assets/refresh-logo.png";

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
          <img src={refreshLogo} alt="Loading" className="h-16 w-16 rounded-2xl mahima-loader-logo" />
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/40 mahima-loader-ring" />
        </div>
        <p className="text-muted-foreground text-sm">
          {showRetry ? "Taking longer than expected..." : "Please wait & Deep Breath"}
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <BatchProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/install" element={<Install />} />
                  
                  {/* Admin Routes */}
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin/register" element={<AdminRegister />} />
                  <Route path="/admin/upload" element={<AdminUpload />} />
                  <Route path="/admin/cms" element={<AdminCMS />} />
                  <Route path="/admin/schedule" element={<AdminSchedule />} />
                  
                  {/* Protected Routes */}
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/dashboard/my-courses" element={<MyCourses />} />
                  <Route path="/my-courses" element={<MyCourses />} />
                  <Route path="/my-courses/:courseId" element={<MyCourseDetail />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/course/:id" element={<Course />} />
                  <Route path="/lesson/:id" element={<Lesson />} />
                  
                  {/* Course Purchase & Learning Routes */}
                  <Route path="/buy-course" element={<BuyCourse />} />
                  <Route path="/buy-course/:id" element={<BuyCourse />} />
                  <Route path="/all-classes" element={<AllClasses />} />
                  <Route path="/classes/:courseId/lessons" element={<LessonView />} />
                  <Route path="/classes/:courseId/chapters" element={<ChapterView />} />
                  <Route path="/classes/:courseId/chapter/:chapterId" element={<LectureListing />} />
                  
                  {/* Feature Pages */}
                  <Route path="/all-tests" element={<AllTests />} />
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/timetable" element={<Timetable />} />
                  <Route path="/books" element={<Books />} />
                  <Route path="/notices" element={<Notices />} />
                  <Route path="/materials" element={<Materials />} />
                  <Route path="/syllabus" element={<Syllabus />} />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </BatchProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
