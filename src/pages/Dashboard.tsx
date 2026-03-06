import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Layout/Header";
import Sidebar from "@/components/Layout/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  PlayCircle, Zap, 
  ClipboardCheck, FileText, Users, Calendar
} from "lucide-react";
import refreshLogo from "@/assets/refresh-logo.png";
import BatchSelector from "@/components/dashboard/BatchSelector";
import UpcomingSchedule from "@/components/dashboard/UpcomingSchedule";

import cubeIcon from "@/assets/icons/cube-3d.png";
import checkmarkIcon from "@/assets/icons/checkmark-3d.png";
import doubtsIcon from "@/assets/icons/doubts-3d.png";
import scienceIcon from "@/assets/icons/science-3d.png";
import bellIcon from "@/assets/icons/bell-3d.png";
import homeIcon from "@/assets/icons/home-3d.png";
import studentIcon from "@/assets/icons/student-3d.png";

const studentQuickActions = [
  { iconSrc: cubeIcon, label: "All Classes", path: "/all-classes", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { iconSrc: checkmarkIcon, label: "All Tests", path: "/all-tests", bg: "bg-purple-50 dark:bg-purple-950/30" },
  { iconSrc: doubtsIcon, label: "My Doubts", path: "/messages", bg: "bg-teal-50 dark:bg-teal-950/30" },
  { iconSrc: scienceIcon, label: "Library", path: "/materials", bg: "bg-pink-50 dark:bg-pink-950/30" },
  { iconSrc: bellIcon, label: "Notices", path: "/notices", bg: "bg-orange-50 dark:bg-orange-950/30" },
  { iconSrc: checkmarkIcon, label: "Performance", path: "/reports", bg: "bg-green-50 dark:bg-green-950/30" },
];

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, role, isAuthenticated, isLoading: authLoading } = useAuth();

  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch enrollments directly from Supabase
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('*, courses(*)')
          .eq('user_id', user!.id)
          .eq('status', 'active');

        if (enrollments && enrollments.length > 0) {
          const enrolled = enrollments.map((e: any) => ({
            id: e.courses?.id,
            title: e.courses?.title,
            description: e.courses?.description,
            grade: e.courses?.grade,
            imageUrl: e.courses?.image_url,
            thumbnailUrl: e.courses?.thumbnail_url,
            progressPercent: e.progress_percentage || 0,
          }));
          setMyCourses(enrolled);
          setProgressPercent(enrolled[0]?.progressPercent || 0);
        }
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate, isAuthenticated, authLoading, user]);

  const teacherFeatures = [
    { icon: ClipboardCheck, label: "Attendance", color: "text-blue-600 bg-blue-100", path: "/attendance" },
    { icon: FileText, label: "Report Card", color: "text-purple-600 bg-purple-100", path: "/reports" },
    { icon: Users, label: "Students", color: "text-green-600 bg-green-100", path: "/students" },
    { icon: Calendar, label: "Timetable", color: "text-orange-600 bg-orange-100", path: "/timetable" },
  ];

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="relative">
          <img src={refreshLogo} alt="Loading" className="h-16 w-16 rounded-2xl sadhguru-loader-logo" />
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/40 sadhguru-loader-ring" />
        </div>
        <p className="mt-4 text-muted-foreground font-medium">Please wait & Deep Breath</p>
      </div>
    );
  }

  const isTeacher = role === 'teacher' || role === 'admin';

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <Header 
        onMenuClick={() => setSidebarOpen(true)} 
        userName={profile?.fullName || "User"} 
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full pb-20 md:pb-6">

        {isTeacher ? (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {teacherFeatures.map((feature, idx) => (
                <div 
                  key={idx} 
                  onClick={() => navigate(feature.path)}
                  className="bg-card p-6 rounded-xl border border-border hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-center group"
                >
                  <div className={`p-3 rounded-full ${feature.color} group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <span className="font-semibold text-foreground">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <BatchSelector />
            {myCourses.length > 0 ? (
              <Card
                className="overflow-hidden shadow-sm cursor-pointer group hover:shadow-md transition-shadow"
                onClick={() => navigate(`/my-courses/${myCourses[0].id}`)}
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="sm:w-48 h-36 sm:h-auto bg-muted relative overflow-hidden flex-shrink-0">
                    <img 
                      src={myCourses[0].imageUrl || myCourses[0].thumbnailUrl || "/placeholder.svg"} 
                      alt={myCourses[0].title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-center gap-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-xs">
                        Class {myCourses[0].grade || "General"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Continue where you left</span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground line-clamp-1">{myCourses[0].title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {myCourses[0].description || "Keep pushing your limits!"}
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>Progress</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                    </div>
                    <Button size="sm" className="mt-1 w-fit bg-accent text-accent-foreground hover:bg-accent/90">
                      <Zap className="h-4 w-4 mr-1" /> Resume
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="border-2 border-dashed p-10 text-center">
                <img src={cubeIcon} alt="No courses" width={48} height={48} className="w-12 h-12 object-contain mx-auto mb-3" loading="lazy" decoding="async" />
                <h3 className="font-bold text-lg text-foreground">No active courses</h3>
                <p className="text-muted-foreground mb-4">Enroll in a course to start learning.</p>
                <Button onClick={() => navigate('/courses')}>Browse Courses</Button>
              </Card>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              {studentQuickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${action.bg}`}>
                    <img
                      src={action.iconSrc}
                      alt={action.label}
                      width={40}
                      height={40}
                      className="w-10 h-10 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{action.label}</span>
                </button>
              ))}
            </div>

            {/* Upcoming Schedule */}
            <UpcomingSchedule />

            {myCourses.length > 0 && (
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-foreground">My Batches</h2>
                  <Button variant="link" size="sm" onClick={() => navigate('/my-courses')}>View All</Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {myCourses.map((course) => (
                    <Card key={course.id} className="hover:shadow-md transition-all cursor-pointer overflow-hidden" onClick={() => navigate(`/my-courses/${course.id}`)}>
                      <div className="h-32 bg-muted relative">
                        <img src={course.imageUrl || course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-base mb-1 line-clamp-1">{course.title}</h3>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{course.description}</p>
                        <Button size="sm" className="w-full">
                          <PlayCircle className="h-4 w-4 mr-2" /> Start Learning
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {!isTeacher && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30 md:hidden">
          <div className="flex items-center justify-around h-14">
            <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-0.5">
              <img src={homeIcon} alt="Home" width={24} height={24}
                className={`w-6 h-6 object-contain ${location.pathname !== '/dashboard' ? 'opacity-50 grayscale' : ''}`}
                loading="lazy" decoding="async" />
              <span className={`text-[10px] font-medium ${location.pathname === '/dashboard' ? 'text-accent' : 'text-muted-foreground'}`}>Home</span>
            </button>
            <button onClick={() => navigate('/courses')} className="flex flex-col items-center gap-0.5">
              <img src={scienceIcon} alt="Courses" width={24} height={24}
                className={`w-6 h-6 object-contain ${location.pathname !== '/courses' ? 'opacity-50 grayscale' : ''}`}
                loading="lazy" decoding="async" />
              <span className={`text-[10px] font-medium ${location.pathname === '/courses' ? 'text-accent' : 'text-muted-foreground'}`}>Courses</span>
            </button>
            <button onClick={() => navigate('/my-courses')} className="flex flex-col items-center gap-0.5">
              <img src={studentIcon} alt="My Courses" width={24} height={24}
                className={`w-6 h-6 object-contain ${location.pathname !== '/my-courses' ? 'opacity-50 grayscale' : ''}`}
                loading="lazy" decoding="async" />
              <span className={`text-[10px] font-medium ${location.pathname === '/my-courses' ? 'text-accent' : 'text-muted-foreground'}`}>My Courses</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default Dashboard;
