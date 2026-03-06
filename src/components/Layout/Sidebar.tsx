import { X, Home, BookOpen, Users, Calendar, FileText, MessageCircle, Settings, LogOut, User, Bell, Library, ShieldCheck } from "lucide-react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import logo from "@/assets/mahima-logo.png";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: GraduationCap, label: "My Courses", path: "/my-courses" },
  { icon: BookOpen, label: "Courses", path: "/courses" },
  { icon: Library, label: "Books", path: "/books" },
  { icon: Bell, label: "Notices", path: "/notices" },
  { icon: Users, label: "Students", path: "/students" },
  { icon: Calendar, label: "Attendance", path: "/attendance" },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
  { icon: User, label: "Profile", path: "/profile" },
  { icon: Settings, label: "Settings", path: "/settings" },
];


const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, logout, isAuthenticated, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
    onClose();
    toast.success("Logged out successfully");
    navigate("/");
  };


  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-72 bg-sidebar z-50 shadow-xl transition-transform duration-300 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded-lg" />
            <span className="font-bold text-lg text-sidebar-foreground">
              Sadguru Coaching
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Admin Panel Link */}
          {isAuthenticated && isAdmin && (
            <Link
              to="/admin"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 mx-2 mt-2 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
            >
              <ShieldCheck className="h-5 w-5" />
              <span>Admin Panel</span>
            </Link>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          {isAuthenticated && user && (
            <div className="mb-3 px-2">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.fullName || 'User'}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
            </div>
          )}
          {isAuthenticated ? (
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </Button>
          ) : (
            <Link to="/login" onClick={onClose}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              >
                <LogOut className="h-5 w-5" />
                <span>Login</span>
              </Button>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
