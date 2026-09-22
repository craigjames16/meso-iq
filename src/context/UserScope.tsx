import React, { useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { resetAllCaches } from '../hooks/cache';

/**
 * Scopes client-side data to the signed-in user. When the user changes
 * (sign out, sign in, sign up, account deletion), every data cache is
 * emptied and the children remount, so no state from the previous account
 * survives into the next one.
 */
export const UserScope: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const previous = useRef<string | null | undefined>(undefined);

  if (previous.current !== undefined && previous.current !== userId) {
    // Before the new tree renders, so nothing reads the old user's data.
    resetAllCaches();
  }
  previous.current = userId;

  return <React.Fragment key={userId ?? 'signed-out'}>{children}</React.Fragment>;
};
