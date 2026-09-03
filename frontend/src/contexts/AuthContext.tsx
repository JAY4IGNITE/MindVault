import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Loader2 } from 'lucide-react';

interface MockUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}

interface AuthContextType {
  currentUser: User | MockUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setDevUser: (email: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  signOut: async () => {},
  setDevUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | MockUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if a dev user exists in session storage
    const devToken = sessionStorage.getItem('mindvault_dev_token');
    const devEmail = sessionStorage.getItem('mindvault_dev_email');

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          setCurrentUser(user);
        } else if (devToken && devEmail) {
          setCurrentUser({
            uid: devToken.replace('TEST_TOKEN_', ''),
            email: devEmail,
            displayName: devEmail.split('@')[0],
            getIdToken: async () => devToken,
          });
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Auth state change listener encountered error:', error);
        if (devToken && devEmail) {
          setCurrentUser({
            uid: devToken.replace('TEST_TOKEN_', ''),
            email: devEmail,
            displayName: devEmail.split('@')[0],
            getIdToken: async () => devToken,
          });
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const setDevUser = (email: string) => {
    const uid = 'dev_' + email.replace(/[^a-zA-Z0-9]/g, '_');
    const token = `TEST_TOKEN_${uid}`;
    sessionStorage.setItem('mindvault_dev_token', token);
    sessionStorage.setItem('mindvault_dev_email', email);
    setCurrentUser({
      uid,
      email,
      displayName: email.split('@')[0],
      getIdToken: async () => token,
    });
  };

  const signOut = async () => {
    sessionStorage.removeItem('mindvault_dev_token');
    sessionStorage.removeItem('mindvault_dev_email');
    try {
      await fbSignOut(auth);
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-primary gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <span className="text-sm text-secondary font-medium tracking-wide">
          Verifying MindVault cryptographic session...
        </span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading, signOut, setDevUser }}>
      {children}
    </AuthContext.Provider>
  );
};
