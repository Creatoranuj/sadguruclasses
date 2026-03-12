import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Layout/Header";
import Sidebar from "@/components/Layout/Sidebar";
import BottomNav from "@/components/Layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, User, Mail, Shield, LogOut, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import AvatarUploadModal from "@/components/profile/AvatarUploadModal";

const Profile = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile, role, isLoading, logout, refetchUserData } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.fullName || "");
  const [mobileInput, setMobileInput] = useState(profile?.mobile || "");
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  // Sync inputs when profile loads from context
  const lastProfileId = useState<string | null>(null);
  if (profile && profile.id !== lastProfileId[0]) {
    lastProfileId[1](profile.id);
    if (!isEditing) {
      setNameInput(profile.fullName || "");
      setMobileInput(profile.mobile || "");
    }
  }

  const handleSave = useCallback(async () => {
    if (!profile) return;
    try {
      const { error } = await supabase
        .from('profiles').update({ full_name: nameInput, mobile: mobileInput }).eq('id', profile.id);
      if (error) throw error;
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      await refetchUserData();
    } catch {
      toast.error("Failed to update profile");
    }
  }, [profile, nameInput, mobileInput, refetchUserData]);

  const handleLogout = useCallback(async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/");
  }, [logout, navigate]);

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onMenuClick={() => setSidebarOpen(true)} />

      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-primary-foreground hover:bg-primary-foreground/10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-primary-foreground">Profile</h1>
      </div>

      <main className="flex-1 p-4 space-y-6 pb-20 md:pb-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center py-6">
          <div className="relative">
            <ProfileAvatar
              avatarUrl={profile?.avatarUrl}
              fullName={profile?.fullName}
              userId={profile?.id || user.id}
              size="md"
              onClick={() => setAvatarModalOpen(true)}
            />
            <Button
              size="icon"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
              onClick={() => setAvatarModalOpen(true)}
            >
              <User className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">{profile?.fullName || "No Name"}</h2>
          <p className="text-sm text-muted-foreground capitalize">{role || "User"}</p>
        </div>

        {/* Avatar Upload Modal */}
        <AvatarUploadModal
          isOpen={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          userId={profile?.id || user.id}
          currentAvatarUrl={profile?.avatarUrl}
          fullName={profile?.fullName}
          onUploadComplete={async () => {
            await refetchUserData();
          }}
        />

        {/* Profile Info */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" /> Full Name
              </Label>
              <Input id="name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} disabled={!isEditing} className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" /> Mobile Number
              </Label>
              <Input id="mobile" type="tel" value={mobileInput} onChange={(e) => setMobileInput(e.target.value)} disabled={!isEditing} placeholder="Enter mobile number" className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" /> Email
              </Label>
              <Input id="email" value={profile?.email || user.email || ""} disabled className="bg-muted border-border" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" /> Role
              </Label>
              <div className="h-10 px-3 py-2 rounded-md bg-muted border border-border text-sm text-muted-foreground capitalize">
                {role || "member"}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => { setNameInput(profile?.fullName || ""); setMobileInput(profile?.mobile || ""); setIsEditing(false); }} className="flex-1">Cancel</Button>
                <Button onClick={handleSave} className="flex-1 bg-primary hover:bg-primary/90">Save Changes</Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full">Edit Profile</Button>
            )}
          </div>
        </div>

        <Button onClick={handleLogout} variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground gap-2">
          <LogOut className="h-5 w-5" /> Sign Out
        </Button>
      </main>
      <BottomNav />
    </div>
  );
};

export default Profile;
