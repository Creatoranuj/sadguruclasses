/**
 * Settings.tsx
 * =============
 * User settings and preferences page.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Layout/Header";
import Sidebar from "@/components/Layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { 
  ArrowLeft, Bell, Moon, Lock, Shield, 
  Smartphone, Globe, Trash2, LogOut, Save 
} from "lucide-react";

const Settings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, profile, logout, isLoading: authLoading } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  
  // Settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Handle delete account (placeholder)
  const handleDeleteAccount = () => {
    toast.info("Please contact support to delete your account");
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
        <h1 className="text-lg font-semibold text-primary-foreground">Settings</h1>
      </div>

      <main className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full">
        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>Manage how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications" className="flex-1">
                <div className="font-medium">Email Notifications</div>
                <div className="text-sm text-muted-foreground">Receive updates via email</div>
              </Label>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notifications" className="flex-1">
                <div className="font-medium">Push Notifications</div>
                <div className="text-sm text-muted-foreground">Receive browser notifications</div>
              </Label>
              <Switch
                id="push-notifications"
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Moon className="h-5 w-5 text-primary" />
              Appearance
            </CardTitle>
            <CardDescription>Customize how the app looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode" className="flex-1">
                <div className="font-medium">Dark Mode</div>
                <div className="text-sm text-muted-foreground">Use dark theme</div>
              </Label>
              <Switch
                id="dark-mode"
                checked={isDarkMode}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Security
            </CardTitle>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="two-factor" className="flex-1">
                <div className="font-medium">Two-Factor Authentication</div>
                <div className="text-sm text-muted-foreground">Add an extra layer of security</div>
              </Label>
              <Switch
                id="two-factor"
                checked={twoFactor}
                onCheckedChange={setTwoFactor}
              />
            </div>
            <Separator />
            <Button variant="outline" className="w-full justify-start gap-2">
              <Lock className="h-4 w-4" />
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
            <CardDescription>Manage your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
              onClick={handleDeleteAccount}
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button className="w-full" onClick={() => toast.success("Settings saved!")}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </main>
    </div>
  );
};

export default Settings;
