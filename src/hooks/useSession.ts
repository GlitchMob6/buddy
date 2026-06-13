/**
 * useSession — React hook for pseudo session state.
 *
 * Polls the active session on mount and exposes
 * create / start / pause / resume / complete / abandon.
 * Works with both pseudo (Phase 0) and real (Dev B) session commands —
 * same IPC signatures.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  createSession,
  startSession,
  pauseSession,
  resumeSession,
  completeSession,
  abandonSession,
  getActiveSession,
  getSessions,
} from '../lib/ipc';
import type { Session } from '../types';

interface UseSessionReturn {
  activeSession: Session | null;
  sessions: Session[];
  loading: boolean;
  error: string | null;
  create: (name?: string) => Promise<Session>;
  start: (id: string) => Promise<Session>;
  pause: (id: string) => Promise<Session>;
  resume: (id: string) => Promise<Session>;
  complete: (id: string) => Promise<Session>;
  abandon: (id: string) => Promise<Session>;
  refresh: () => Promise<void>;
}

export function useSession(): UseSessionReturn {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [active, all] = await Promise.all([
        getActiveSession(),
        getSessions(),
      ]);
      setActiveSession(active);
      setSessions(all);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const wrap = useCallback(
    async (fn: () => Promise<Session>): Promise<Session> => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn();
        await refresh();
        return result;
      } catch (e) {
        setError(String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  return {
    activeSession,
    sessions,
    loading,
    error,
    create: (name) => wrap(() => createSession({ name })),
    start:  (id)   => wrap(() => startSession(id)),
    pause:  (id)   => wrap(() => pauseSession(id)),
    resume: (id)   => wrap(() => resumeSession(id)),
    complete:(id)  => wrap(() => completeSession(id)),
    abandon: (id)  => wrap(() => abandonSession(id)),
    refresh,
  };
}
