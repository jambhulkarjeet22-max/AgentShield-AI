'use client';

import { ReactNode } from 'react';
import { ConvexReactClient, ConvexProvider } from 'convex/react';

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  'https://resolute-kookabura-314.convex.cloud';

const convex = new ConvexReactClient(convexUrl);

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}
