import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  PawPrint,
  ShieldCheck,
  MapPin,
  Sparkles,
  Bell,
  Heart,
} from "lucide-react";

const HERO =
  "https://static.prod-images.emergentagent.com/jobs/ff2e7dab-f218-4051-89c3-35f6086b9662/images/7c9a54386988bfa7bb52e110bdc784eed05e3092f34d68fdbd952858dc7561b1.png";
const REUNITED =
  "https://images.unsplash.com/photo-1634739932778-ede9a54d183d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwzfHxoYXBweSUyMGRvZyUyMG93bmVyJTIwcmV1bml0ZWR8ZW58MHx8fHwxNzc4MzM5MzU2fDA&ixlib=rb-4.1.0&q=85";
const VOLUNTEERS =
  "https://images.unsplash.com/photo-1774050021883-b711be066448?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwxfHxyZXNjdWUlMjB2b2x1bnRlZXJzJTIwY29tbXVuaXR5fGVufDB8fHx8MTc3ODMzOTM1Nnww&ixlib=rb-4.1.0&q=85";

export default function LandingPage() {
  return (
    <div className="bg-[#FDFBF7] min-h-screen text-[#1A2F24]">
      <header
        data-testid="landing-header"
        className="sticky top-0 z-30 backdrop-blur-xl bg-[#FDFBF7]/80 border-b border-[#EAE5D9]"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="landing-brand">
            <div className="h-8 w-8 rounded-md bg-[#E06A4F] flex items-center justify-center">
              <PawPrint className="h-4 w-4 text-white" strokeWidth={2.4} />
            </div>
            <span className="font-display font-black text-lg">Findr</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              data-testid="landing-login-link"
              className="px-4 py-2 text-sm font-semibold text-[#1A2F24] hover:text-[#E06A4F]"
            >
              Login
            </Link>
            <Link to="/signup" data-testid="landing-signup-link">
              <Button className="bg-[#E06A4F] hover:bg-[#C95B42] text-white rounded-md">
                Join Findr
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 py-16 lg:py-24">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <span className="text-xs uppercase tracking-[0.3em] text-[#7D9774] font-semibold mb-4">
              Community-Driven · Open Source · For Everyone
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
              When someone goes missing,
              <span className="text-[#E06A4F]"> the whole town shows up.</span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-[#4A5F54] leading-relaxed max-w-xl">
              Findr unites neighbours, NGOs and rescue volunteers around lost pets and
              missing people. Report sightings, get instant matches, and bring loved
              ones home — faster.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" data-testid="hero-cta-primary">
                <Button
                  size="lg"
                  className="bg-[#E06A4F] hover:bg-[#C95B42] text-white rounded-md px-7"
                >
                  Get Started — it's free
                </Button>
              </Link>
              <Link to="/login" data-testid="hero-cta-secondary">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[#1A2F24] text-[#1A2F24] hover:bg-[#1A2F24] hover:text-[#FDFBF7] rounded-md px-7"
                >
                  I have an account
                </Button>
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              <div>
                <div className="font-display text-3xl font-black text-[#1A2F24]">12k+</div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#8A9A92] mt-1">
                  Reunited
                </div>
              </div>
              <div>
                <div className="font-display text-3xl font-black text-[#1A2F24]">340</div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#8A9A92] mt-1">
                  Active NGOs
                </div>
              </div>
              <div>
                <div className="font-display text-3xl font-black text-[#1A2F24]">5km</div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#8A9A92] mt-1">
                  Avg radius
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border border-[#EAE5D9] aspect-[4/5]">
              <img
                src={HERO}
                alt="Sunrise over a neighborhood"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-[#1A2F24]/80 to-transparent">
                <p className="text-[#FDFBF7] font-display text-xl">
                  "Found Bruno within 30 minutes. The map alerts changed everything."
                </p>
                <p className="text-xs uppercase tracking-[0.2em] text-[#FDFBF7]/70 mt-2">
                  — Kavya, Bengaluru
                </p>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-[#1A2F24] text-[#FDFBF7] rounded-xl px-5 py-4 shadow-xl hidden md:block">
              <div className="text-xs uppercase tracking-[0.2em] text-[#7D9774]">
                Live now
              </div>
              <div className="font-display font-bold mt-1">42 reports nearby</div>
            </div>
          </div>
        </div>
      </section>

      {/* BENTO */}
      <section className="bg-[#F4F1EA]/60 border-y border-[#EAE5D9]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bento-card p-8 lg:row-span-2 flex flex-col">
              <ShieldCheck className="h-8 w-8 text-[#7D9774]" />
              <h3 className="mt-4 font-display font-bold text-2xl">
                NGO Coordination
              </h3>
              <p className="mt-2 text-[#4A5F54] leading-relaxed">
                Verified rescue NGOs claim cases, coordinate temporary shelter, and
                drive cases to reunification — all visible in real time.
              </p>
              <div className="mt-6 flex-1 rounded-xl overflow-hidden">
                <img
                  src={VOLUNTEERS}
                  alt="rescue volunteers"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="bento-card p-8">
              <Sparkles className="h-8 w-8 text-[#E06A4F]" />
              <h3 className="mt-4 font-display font-bold text-2xl">
                Smart Matching
              </h3>
              <p className="mt-2 text-[#4A5F54] leading-relaxed">
                Our matcher cross-checks species, colour, location and description
                keywords to surface high-confidence matches automatically.
              </p>
            </div>
            <div className="bento-card p-8">
              <MapPin className="h-8 w-8 text-[#669BBC]" />
              <h3 className="mt-4 font-display font-bold text-2xl">
                Live Map View
              </h3>
              <p className="mt-2 text-[#4A5F54] leading-relaxed">
                Drop a pin where it happened. See every report around you on an
                interactive map, with terracotta and sage markers.
              </p>
            </div>
            <div className="bento-card p-8 flex gap-5 lg:col-span-2">
              <div className="rounded-xl overflow-hidden w-32 h-32 shrink-0">
                <img
                  src={REUNITED}
                  alt="Reunited"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <Heart className="h-6 w-6 text-[#E06A4F]" />
                <h3 className="mt-2 font-display font-bold text-2xl">
                  Stories of reunion
                </h3>
                <p className="mt-2 text-[#4A5F54] leading-relaxed">
                  Every match is a small reunion. Findr was built so families don't
                  have to go through it alone.
                </p>
              </div>
            </div>
            <div className="bento-card p-8">
              <Bell className="h-8 w-8 text-[#E2B15B]" />
              <h3 className="mt-4 font-display font-bold text-2xl">
                Nearby Alerts
              </h3>
              <p className="mt-2 text-[#4A5F54] leading-relaxed">
                Set your area and radius. We'll ping you when something happens
                within walking distance.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="bento-card p-10 lg:p-16 text-center">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            Ready to bring someone home?
          </h2>
          <p className="mt-4 text-[#4A5F54] max-w-2xl mx-auto">
            Create a free account in seconds. Report a case, browse nearby alerts,
            or volunteer as an NGO.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/signup" data-testid="footer-cta">
              <Button
                size="lg"
                className="bg-[#E06A4F] hover:bg-[#C95B42] text-white rounded-md px-8"
              >
                Create your account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#EAE5D9] py-8 text-center text-sm text-[#8A9A92]">
        © {new Date().getFullYear()} Findr. Built with care for community recovery.
      </footer>
    </div>
  );
}
