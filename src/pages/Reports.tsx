/**
 * Reports.tsx
 * ============
 * Student reports and analytics page.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Layout/Header";
import Sidebar from "@/components/Layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEnrollments } from "@/hooks/useEnrollments";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft, BarChart3, BookOpen, Trophy, 
  TrendingUp, Clock, CheckCircle, Loader2 
} from "lucide-react";

const Reports = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, profile, isLoading: authLoading } = useAuth();
  const { enrollments, loading } = useEnrollments();

  // Mock stats for demo (in production, these would come from actual tracking)
  const stats = {
    totalCourses: enrollments.length,
    completedCourses: 0,
    averageProgress: 35,
    totalHours: 12,
    currentStreak: 5,
    achievements: 3,
  };

  // Auth redirect
  if (!authLoading && !isAuthenticated) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onMenuClick={() => setSidebarOpen(true)} />

      {/* Page Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="text-primary-foreground hover:bg-primary-foreground/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-primary-foreground">My Reports</h1>
      </div>

      <main className="flex-1 p-4 space-y-4">
        {/* Profile Summary */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center text-2xl font-bold">
                {(profile?.fullName || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile?.fullName || 'Student'}</h2>
                <p className="text-primary-foreground/80">Learning Progress Report</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{stats.totalCourses}</p>
              <p className="text-xs text-muted-foreground">Enrolled Courses</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold">{stats.completedCourses}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold">{stats.averageProgress}%</p>
              <p className="text-xs text-muted-foreground">Avg Progress</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto text-amber-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalHours}h</p>
              <p className="text-xs text-muted-foreground">Learning Time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-8 w-8 mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold">{stats.currentStreak}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
              <p className="text-2xl font-bold">{stats.achievements}</p>
              <p className="text-xs text-muted-foreground">Achievements</p>
            </CardContent>
          </Card>
        </div>

        {/* Course Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Course Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : enrollments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No courses enrolled yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate('/courses')}
                >
                  Browse Courses
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {enrollments.map((enrollment: any) => (
                  <div key={enrollment.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{enrollment.course?.title || 'Course'}</span>
                        {enrollment.course?.grade && (
                          <Badge variant="outline" className="text-xs">
                            Grade {enrollment.course.grade}
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {Math.floor(Math.random() * 50 + 20)}%
                      </span>
                    </div>
                    <Progress value={Math.floor(Math.random() * 50 + 20)} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Reports;
