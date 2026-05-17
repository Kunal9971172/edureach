import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import SignupPopup from "../components/SignupPop";
import HeroSection from "../components/HeroSection";
import AboutSection from "../components/AboutSection";
import AchievementsSection from "../components/AchievementSection";
import CoursesSection from "../components/CoursesSection";
import QuotesSection from "../components/QuoteSection";
import MentorsSection from "../components/MentorsSection";
import StudentLifeSection from "../components/StudentLife";
import EventsGallery from "../components/EventGallery";
import CounselorCTA from "../components/CouncelorCTA";
import Footer from "../components/Footer";
import HiringStatsSection from "../components/HiringStats";

export default function HomePage() {
  const { user } = useAuth();
  const [showSignupPopup, setShowSignupPopup] = useState(false);

  // Scroll trigger — show signup popup when visitor reaches Mentors section
  const handleReachMentors = () => {
    if (!user && !sessionStorage.getItem("popupShown")) {
      setShowSignupPopup(true);
      sessionStorage.setItem("popupShown", "true");
    }
  };

  return (
    <div>
      {/* Visible to everyone */}
      <HeroSection />
      <AboutSection />
      <AchievementsSection />
      <CoursesSection />
      <QuotesSection />
      <MentorsSection onReachMentors={handleReachMentors} />

      {/* Content below Mentors — GATED */}
      {user ? (
        <>
          <StudentLifeSection />
          <EventsGallery />
          <CounselorCTA onOpenCall={() => {
            // Can be left empty or removed entirely, we will just let the global floating chat button handle it, or trigger a custom event
            window.dispatchEvent(new CustomEvent('open-chat'));
          }} />
          <HiringStatsSection />
          <Footer />
        </>
      ) : (
        <section className="py-0 bg-cream text-center">
          <h2 className="text-3xl font-bold mb-4">Want to See More?</h2>
          <p className="text-gray-500 mb-8">
            Sign up to explore campus life, events, placement statistics,
            and talk to our AI counselor.
          </p>
          <button onClick={() => setShowSignupPopup(true)}
            className="bg-maroon text-white px-8 py-3 rounded-lg font-semibold">
            Sign Up to Unlock
          </button>
          <Footer />
        </section>
      )}

      <SignupPopup show={showSignupPopup} onClose={() => setShowSignupPopup(false)} />
    </div>
  );
}