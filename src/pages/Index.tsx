import { useMemo, memo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Menu } from "lucide-react";

import Hero, { HeroData, HeroStat } from "../components/Landing/Hero";
import Subjects from "../components/Landing/Subjects";
import Features from "../components/Landing/Features";
import WhyChooseUs from "../components/Landing/WhyChooseUs";
import OnlineLearning from "../components/Landing/OnlineLearning";
import StudyMaterials from "../components/Landing/StudyMaterials";
import Testimonials from "../components/Landing/Testimonials";
import LeadForm from "../components/Landing/LeadForm";
import GraduationBanner from "../components/Landing/GraduationBanner";
import Footer from "../components/Landing/Footer";
import { Button } from "../components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "../components/ui/sheet";
import logo from "../assets/sadguru-logo.png";
import { useLandingData } from "../hooks/useLandingData";

const defaultHeroData: HeroData = {
  title: "Welcome to Sadguru Classes",
  subtitle: "Quality education for every student",
  cta_text: "Get Started",
};

const Navigation = memo(({ isAuthenticated }: { isAuthenticated: boolean }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = (
    <>
      <Link to="/courses" onClick={() => setMobileOpen(false)}>
        <Button variant="ghost" className="h-11 w-full justify-start text-foreground hover:bg-muted transition-colors duration-200">
          Courses
        </Button>
      </Link>
      <Link to="/books" onClick={() => setMobileOpen(false)}>
        <Button variant="ghost" className="h-11 w-full justify-start text-foreground hover:bg-muted transition-colors duration-200">
          Books
        </Button>
      </Link>
      {isAuthenticated ? (
        <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
          <Button className="h-11 w-full">Dashboard</Button>
        </Link>
      ) : (
        <>
          <Link to="/login" onClick={() => setMobileOpen(false)}>
            <Button variant="ghost" className="h-11 w-full justify-start text-foreground hover:bg-muted transition-colors duration-200">
              Login
            </Button>
          </Link>
          <Link to="/signup" onClick={() => setMobileOpen(false)}>
            <Button className="h-11 w-full">Sign Up</Button>
          </Link>
        </>
      )}
    </>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logo}
            alt="Sadguru Classes"
            className="h-10 w-10 rounded-xl"
            loading="eager"
          />
          <span className="font-bold text-xl text-foreground hidden sm:inline">
            Sadguru Classes
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          {navItems}
        </div>

        {/* Mobile hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <img src={logo} alt="Logo" className="h-8 w-8 rounded-lg" />
                Sadguru Classes
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-2 mt-6">
              {navItems}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
});

Navigation.displayName = "Navigation";

const Index = () => {
  const { isAuthenticated } = useAuth();
  const authState = useMemo(() => isAuthenticated, [isAuthenticated]);
  const { stats, getContentByKey } = useLandingData();

  const heroData = useMemo(() => {
    const dbHero = getContentByKey("hero");
    if (dbHero) return { title: dbHero.title || defaultHeroData.title, subtitle: dbHero.subtitle || defaultHeroData.subtitle, cta_text: dbHero.cta_text || defaultHeroData.cta_text };
    return defaultHeroData;
  }, [getContentByKey]);

  const heroStats: HeroStat[] = useMemo(() =>
    stats.map(s => ({ stat_key: s.statKey, stat_value: s.statValue })),
    [stats]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={authState} />
      
      <main className="pt-20">
        <Hero data={heroData} stats={heroStats} />
        <Subjects />
        <Features />
        <WhyChooseUs />
        <OnlineLearning />
        <StudyMaterials />
        <Testimonials />
        <LeadForm />
        <GraduationBanner />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
