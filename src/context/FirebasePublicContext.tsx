'use client';

import { db } from '@/lib/firebase/config';
import { createContext, useContext, ReactNode } from 'react';

interface FirebasePublicContextType {
  db: typeof db;
}

const FirebasePublicContext = createContext<FirebasePublicContextType | null>(null);

export function FirebasePublicProvider({ children }: { children: ReactNode }) {
  return (
    <FirebasePublicContext.Provider value={{ db }}>
      {children}
    </FirebasePublicContext.Provider>
  );
}

export function useFirebasePublic() {
  const context = useContext(FirebasePublicContext);
  if (!context) {
    throw new Error('useFirebasePublic must be used within FirebasePublicProvider');
  }
  return context;
}
