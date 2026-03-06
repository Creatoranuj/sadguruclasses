import { useState, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, Search, PlayCircle, BookOpen, Clock, 
  Filter, GraduationCap, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";

interface EnrolledCourse {
  id: number;
  title: string;
  description: string | null;
  grade: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  price: number | null;
  purchased_at: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}

type StatusFilter = "all" | "in-progress" | "completed";

const CourseCard = memo(({ course, onNavigate, formatDate }: { course: EnrolledCourse; onNavigate: (id: number) => void; formatDate: (d: string) => string }) => (
  <Card 
    className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-border"
    onClick={() => onNavigate(course.id)}
  >
    <div className="relative h-40 bg-muted overflow-hidden">
      <img
        src={course.thumbnailUrl || course.imageUrl || '/placeholder.svg'}
        alt={course.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <PlayCircle className="h-14 w-14 text-white" />
      </div>
      <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
        Class {course.grade || 'General'}
      </Badge>
    </div>
    <CardContent className="p-4">
      <h3 className="font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
        {course.title}
      </h3>
      {course.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{course.description}</p>
      )}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            {course.completedLessons}/{course.totalLessons} completed
          </span>
          <span className="text-primary font-medium">{course.progressPercent}%</span>
        </div>
        <Progress value={course.progressPercent} className="h-1.5" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDate(course.purchased_at)}
        </span>
        <Button size="sm" variant="ghost" className="gap-1 text-primary">
          {course.progressPercent > 0 ? "Continue" : "Start"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
));
CourseCard.displayName = "CourseCard";

const MyCourses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState("recent");
  const [grades, setGrades] = useState<string[]>([]);

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      if (!user) { setLoading(false); return; }

      try {
        // Fetch enrollments with course data from Supabase
        const { data: enrollments, error } = await supabase
          .from('enrollments')
          .select('*, courses(*)')
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (error) throw error;

        // Fetch user progress for all courses
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('lesson_id, completed, course_id')
          .eq('user_id', user.id);

        // Fetch total lessons per course
        const courseIds = (enrollments || []).map((e: any) => e.course_id);
        const { data: allLessons } = await supabase
          .from('lessons')
          .select('id, course_id')
          .in('course_id', courseIds.length > 0 ? courseIds : [-1]);

        const enrolledCourses: EnrolledCourse[] = (enrollments || []).map((enrollment: any) => {
          const course = enrollment.courses;
          if (!course) return null;

          const courseLessons = (allLessons || []).filter((l: any) => l.course_id === course.id);
          const completedLessons = (progressData || []).filter(
            (p: any) => p.course_id === course.id && p.completed
          );
          const totalLessons = courseLessons.length;
          const progressPercent = totalLessons > 0 
            ? Math.round((completedLessons.length / totalLessons) * 100) 
            : 0;

          return {
            id: course.id,
            title: course.title,
            description: course.description,
            grade: course.grade,
            imageUrl: course.image_url,
            thumbnailUrl: course.thumbnail_url,
            price: course.price,
            purchased_at: enrollment.purchased_at || new Date().toISOString(),
            totalLessons,
            completedLessons: completedLessons.length,
            progressPercent,
          };
        }).filter(Boolean) as EnrolledCourse[];

        setCourses(enrolledCourses);
        const uniqueGrades = [...new Set(enrolledCourses.map(c => c.grade).filter(Boolean))] as string[];
        setGrades(uniqueGrades);
      } catch (error) {
        console.error("Error fetching enrolled courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrolledCourses();
  }, [user]);

  const filteredCourses = courses
    .filter(c => {
      if (searchQuery.trim() && !c.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (gradeFilter !== "all" && c.grade !== gradeFilter) return false;
      if (statusFilter === "completed" && c.progressPercent < 100) return false;
      if (statusFilter === "in-progress" && (c.progressPercent === 0 || c.progressPercent >= 100)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "progress") return b.progressPercent - a.progressPercent;
      return new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime();
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle>Login Required</CardTitle>
            <CardDescription>Please login to view your purchased courses</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "in-progress", label: "In Progress" },
    { id: "completed", label: "Completed" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">My Courses</h1>
              <p className="text-sm text-muted-foreground">
                {courses.length} {courses.length === 1 ? 'course' : 'courses'} purchased
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 pt-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/dashboard">Dashboard</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>My Courses</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <main className="container mx-auto px-4 py-6">
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search your courses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {grades.map((grade) => (
                <SelectItem key={grade} value={grade}>Class {grade}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && courses.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <GraduationCap className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Courses Yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">Browse our catalog to find the perfect course.</p>
              <Button onClick={() => navigate('/courses')}>
                <BookOpen className="h-4 w-4 mr-2" /> Browse Courses
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && courses.length > 0 && filteredCourses.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Results</h3>
              <Button variant="outline" onClick={() => { setSearchQuery(""); setGradeFilter("all"); setStatusFilter("all"); }}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && filteredCourses.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onNavigate={(id) => navigate(`/my-courses/${id}`)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyCourses;
