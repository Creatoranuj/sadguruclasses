import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Monitor, Apple, Download, Share2, MoreVertical, Plus, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import refreshLogo from "@/assets/refresh-logo.png";

type Platform = "android" | "ios" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  return "desktop";
}

const Install = () => {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const navigate = useNavigate();

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={refreshLogo} alt="Sadguru Coaching Classes" className="h-8 w-8 rounded-lg" />
          <h1 className="text-lg font-bold text-foreground">Install App</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Platform tabs */}
        <div className="flex gap-2">
          {([
            { key: "android" as Platform, icon: Smartphone, label: "Android" },
            { key: "ios" as Platform, icon: Apple, label: "iOS" },
            { key: "desktop" as Platform, icon: Monitor, label: "Desktop" },
          ]).map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              variant={platform === key ? "default" : "outline"}
              size="sm"
              onClick={() => setPlatform(key)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        {/* Android Instructions */}
        {platform === "android" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Option 1: Download APK
                </CardTitle>
                <CardDescription>Install as a native Android app</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Download the APK file directly and install it on your device.
                </p>
                <Button asChild className="w-full gap-2">
                  <a
                    href="https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" />
                    Download APK from GitHub
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Note: You may need to enable "Install from unknown sources" in your phone settings.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Option 2: Install as PWA
                </CardTitle>
                <CardDescription>Add to home screen from browser</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Open this website in <strong className="text-foreground">Chrome</strong></li>
                  <li>
                    Tap the <MoreVertical className="inline h-4 w-4 text-foreground" /> menu button (top-right)
                  </li>
                  <li>Tap <strong className="text-foreground">"Install app"</strong> or <strong className="text-foreground">"Add to Home screen"</strong></li>
                  <li>The app icon will appear on your home screen</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        )}

        {/* iOS Instructions */}
        {platform === "ios" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Apple className="h-5 w-5 text-primary" />
                Install on iPhone / iPad
              </CardTitle>
              <CardDescription>Add to home screen from Safari</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
                <li>Open this website in <strong className="text-foreground">Safari</strong> (not Chrome)</li>
                <li>
                  Tap the <Share2 className="inline h-4 w-4 text-foreground" /> Share button (bottom bar)
                </li>
                <li>Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong></li>
                <li>Tap <strong className="text-foreground">"Add"</strong> in the top-right corner</li>
                <li>The app will appear on your home screen like a regular app</li>
              </ol>
              <p className="mt-4 text-xs text-muted-foreground">
                The app works offline and loads instantly — just like a native app!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Desktop Instructions */}
        {platform === "desktop" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-primary" />
                Install on Desktop
              </CardTitle>
              <CardDescription>Works on Chrome, Edge, and Brave</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
                <li>Open this website in <strong className="text-foreground">Chrome</strong>, <strong className="text-foreground">Edge</strong>, or <strong className="text-foreground">Brave</strong></li>
                <li>
                  Look for the <Download className="inline h-4 w-4 text-foreground" /> install icon in the address bar (right side)
                </li>
                <li>Click <strong className="text-foreground">"Install"</strong> when prompted</li>
                <li>The app will open in its own window and appear in your start menu / dock</li>
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Back to app */}
        <div className="text-center pt-4">
          <Button variant="outline" onClick={() => navigate("/")}>
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Install;
