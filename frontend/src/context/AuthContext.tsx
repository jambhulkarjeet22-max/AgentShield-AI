'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { MockActor, UserSession } from '@/types';
import {
  getCurrentSession,
  PRECONFIGURED_ACTORS,
  switchActor as doSwitchActor,
} from '@/services/auth-service';
import { setStoredApiKey } from '@/services/api-client';

interface AuthContextType {
  session: UserSession;
  actors: Record<string, MockActor>;
  switchUser: (actorKey: string) => void;
  setCustomApiKey: (key: string) => void;
  logout: () => void;
}

const DEFAULT_SESSION: UserSession = {
  actor_id: 'admin-001',
  role: 'ADMIN',
  name: 'ADMIN',
  email: 'admin@agentra.internal',
  api_key: 'mock-key-admin-secret-7701',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession>(DEFAULT_SESSION);

  useEffect(() => {
    setSession(getCurrentSession());
  }, []);

  const switchUser = (actorKey: string) => {
    const updated = doSwitchActor(actorKey);
    setSession(updated);
  };

  const setCustomApiKey = (key: string) => {
    setStoredApiKey(key);
    setSession(getCurrentSession());
  };

  const logout = () => {
    setStoredApiKey('');
    setSession(getCurrentSession());
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        actors: PRECONFIGURED_ACTORS,
        switchUser,
        setCustomApiKey,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
