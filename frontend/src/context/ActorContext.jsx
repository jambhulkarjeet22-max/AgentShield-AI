import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStoredApiKey, setStoredApiKey } from '../api/client';

const ActorContext = createContext(null);

export function ActorProvider({ children }) {
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [actorLabel, setActorLabel] = useState('Unauthenticated (Anonymous)');

  useEffect(() => {
    if (!apiKey) {
      setActorLabel('Anonymous Visitor (Read-Only Public)');
    } else if (apiKey.includes('admin')) {
      setActorLabel('System Administrator (Full Access)');
    } else if (apiKey.includes('analyst')) {
      setActorLabel('Security Analyst (Investigation & Campaigns)');
    } else if (apiKey.includes('employee')) {
      setActorLabel('Enterprise Employee (Standard Tasks)');
    } else if (apiKey.includes('guest')) {
      setActorLabel('Guest (Minimal Sandbox)');
    } else if (apiKey.includes('untrusted')) {
      setActorLabel('Untrusted Agent (Red Team Target)');
    } else {
      setActorLabel('Custom Key Authenticated');
    }
  }, [apiKey]);

  const updateApiKey = (newKey) => {
    const trimmed = (newKey || '').trim();
    setStoredApiKey(trimmed);
    setApiKey(trimmed);
  };

  const clearApiKey = () => {
    setStoredApiKey('');
    setApiKey('');
  };

  return (
    <ActorContext.Provider
      value={{
        apiKey,
        actorLabel,
        updateApiKey,
        clearApiKey,
        isAuthenticated: Boolean(apiKey),
      }}
    >
      {children}
    </ActorContext.Provider>
  );
}

export function useActor() {
  const context = useContext(ActorContext);
  if (!context) {
    throw new Error('useActor must be used within an ActorProvider');
  }
  return context;
}

