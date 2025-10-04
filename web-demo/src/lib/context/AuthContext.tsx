/**
 * Authentication Context
 * Manages global authentication state with Kratos session
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { kratosClient, Session, Identity } from '@/lib/api/kratos';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  session: Session | null;
  identity: Identity | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshSession = async () => {
    try {
      const sessionData = await kratosClient.getSession();
      setSession(sessionData);
    } catch (error) {
      setSession(null);
    }
  };

  const logout = async () => {
    try {
      const logoutFlow = await kratosClient.createLogoutFlow();
      await kratosClient.submitLogout(logoutFlow.logout_token);
      setSession(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    const initSession = async () => {
      await refreshSession();
      setIsLoading(false);
    };
    initSession();
  }, []);

  const value: AuthContextType = {
    session,
    identity: session?.identity || null,
    isLoading,
    isAuthenticated: !!session?.active,
    refreshSession,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
