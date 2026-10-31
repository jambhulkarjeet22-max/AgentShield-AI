'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { CyberHologramHero } from '@/components/landing/CyberHologramHero';
import { CyberBattlefieldSection } from '@/components/landing/CyberBattlefieldSection';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { SiteFooter } from '@/components/landing/SiteFooter';

export default function LandingPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  // If user is already authenticated, force-redirect straight to /dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  if (isLoaded && isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground">
        <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 animate-pulse mb-4">
          <ShieldAlert className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-sm font-mono text-muted-foreground">Redirecting to Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-blue-600/30">
      {/* 3D Dot-Matrix Holographic Globe Hero Section */}
      <CyberHologramHero />

      {/* Cyber Battlefield Triad Architecture Section */}
      <CyberBattlefieldSection />

      {/* Benefits Section */}
      <BenefitsSection />

      {/* EngineTech Site Footer */}
      <SiteFooter />
    </div>
  );
}

