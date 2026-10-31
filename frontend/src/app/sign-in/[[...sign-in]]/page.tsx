import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
        <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <span className="font-bold text-xl tracking-tight text-foreground">
          Agentra
        </span>
      </Link>
      <SignIn fallbackRedirectUrl="/dashboard" />
    </div>
  );
}

