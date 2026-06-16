/**
 * useResources — React hook for resource registry state.
 *
 * Loads all registered resources on mount and exposes
 * scan / register / delete / updateCategory / discoverApps / updateRole operations.
 * Includes a localStorage fallback for offline/mock operation.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  scanResources,
  registerResource,
  deleteResource,
  getResources,
  updateResourceCategory,
  discoverApps,
  updateResourceRole,
} from '../lib/ipc';
import type {
  Resource,
  ScannedResource,
  RegisterResourcePayload,
  UpdateResourceCategoryPayload,
  DiscoveredApp,
  UpdateResourceRolePayload,
} from '../types';

/** Group resources by category, sorted alphabetically within each group. */
export function groupByCategory(resources: Resource[]): Record<string, Resource[]> {
  const grouped: Record<string, Resource[]> = {};
  for (const r of resources) {
    const cat = r.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(r);
  }
  // Sort each group by display_name or resource_value
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) =>
      (a.display_name ?? a.resource_value).localeCompare(b.display_name ?? b.resource_value)
    );
  }
  return grouped;
}

/** Deterministic order for category sections. */
export const CATEGORY_ORDER = [
  'Browser',
  'Code',
  'Terminal',
  'Communication',
  'Media',
  'Design',
  'Productivity',
  'Other',
];

interface UseResourcesReturn {
  resources: Resource[];
  grouped: Record<string, Resource[]>;
  scanning: boolean;
  loading: boolean;
  error: string | null;
  scan: () => Promise<ScannedResource[]>;
  register: (payload: RegisterResourcePayload) => Promise<Resource>;
  registerBatch: (payloads: RegisterResourcePayload[]) => Promise<Resource[]>;
  remove: (id: string) => Promise<void>;
  updateCategory: (payload: UpdateResourceCategoryPayload) => Promise<Resource>;
  discoverApps: () => Promise<DiscoveredApp[]>;
  updateRole: (payload: UpdateResourceRolePayload) => Promise<Resource>;
  refresh: () => Promise<void>;
}

export function useResources(): UseResourcesReturn {
  const [resources, setResources] = useState<Resource[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const STORAGE_KEY = 'buddy_resources';

  const saveToStorage = (list: Resource[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save resources to localStorage', e);
    }
  };

  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Resource[] = JSON.parse(stored);
        setResources(parsed.map(r => ({
          ...r,
          resource_type: 'APPLICATION',
          created_at: new Date().toISOString()
        } as Resource)));
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load resources from localStorage', e);
    }
    setResources([]);
    return [] as Resource[];
  };

  const refresh = useCallback(async (silent = false) => {
    try {
      const all = await getResources();
      setResources(all);
      saveToStorage(all);
      setError(null);
      if (silent !== true) {
        window.dispatchEvent(new Event('buddy_resources_updated'));
      }
    } catch (e) {
      console.warn('IPC getResources failed, falling back to localStorage');
      loadFromStorage();
      setError(String(e));
    }
  }, []);

  useEffect(() => { 
    refresh(true); 
    const handleUpdate = () => refresh(true);
    window.addEventListener('buddy_resources_updated', handleUpdate);
    return () => window.removeEventListener('buddy_resources_updated', handleUpdate);
  }, [refresh]);

  const grouped = groupByCategory(resources);

  const scan = useCallback(async (): Promise<ScannedResource[]> => {
    setScanning(true);
    setError(null);
    try {
      const results = await scanResources();
      return results;
    } catch (e) {
      setError(String(e));
      return [];
    } finally {
      setScanning(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterResourcePayload): Promise<Resource> => {
    setLoading(true);
    setError(null);
    try {
      const result = await registerResource(payload);
      await refresh();
      return result;
    } catch (e) {
      // Fallback: create mock resource
      const mock: Resource = {
        id: Date.now().toString(),
        resource_value: payload.resource_value,
        display_name: payload.display_name || payload.resource_value,
        category: payload.category || 'Other',
        app_role: payload.app_role || 'work_tool',
        icon_data: payload.icon_data ?? null,
        resource_type: 'APPLICATION' as const,
        created_at: new Date().toISOString(),
      };
      const newList = [...resources, mock];
      setResources(newList);
      saveToStorage(newList);
      setError(String(e));
      return mock;
    } finally {
      setLoading(false);
    }
  }, [resources, refresh]);

  const registerBatch = useCallback(async (payloads: RegisterResourcePayload[]): Promise<Resource[]> => {
    setLoading(true);
    setError(null);
    try {
      const results: Resource[] = [];
      for (const p of payloads) {
        const r = await registerResource(p);
        results.push(r);
      }
      await refresh();
      return results;
    } catch (e) {
      const mocks = payloads.map((p, idx) => ({
        id: `${Date.now()}_${idx}`,
        resource_value: p.resource_value,
        display_name: p.display_name || p.resource_value,
        category: p.category || 'Other',
        app_role: p.app_role || 'work_tool',
        icon_data: p.icon_data ?? null,
        resource_type: 'APPLICATION' as const,
        created_at: new Date().toISOString(),
      }));
      const newList = [...resources, ...mocks];
      setResources(newList);
      saveToStorage(newList);
      setError(String(e));
      return mocks;
    } finally {
      setLoading(false);
    }
  }, [resources, refresh]);

  const remove = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await deleteResource(id);
      await refresh();
    } catch (e) {
      const filtered = resources.filter(r => r.id !== id);
      setResources(filtered);
      saveToStorage(filtered);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [resources, refresh]);

  const updateCategory = useCallback(async (payload: UpdateResourceCategoryPayload): Promise<Resource> => {
    setLoading(true);
    setError(null);
    try {
      const result = await updateResourceCategory(payload);
      await refresh();
      return result;
    } catch (e) {
      const updated = resources.map(r =>
        r.id === payload.id ? { ...r, category: payload.category } : r
      );
      setResources(updated);
      saveToStorage(updated);
      setError(String(e));
      return updated.find(r => r.id === payload.id)!;
    } finally {
      setLoading(false);
    }
  }, [resources, refresh]);

  const updateRole = useCallback(async (payload: UpdateResourceRolePayload): Promise<Resource> => {
    setLoading(true);
    setError(null);
    try {
      const result = await updateResourceRole(payload);
      await refresh();
      return result;
    } catch (e) {
      const updated = resources.map(r =>
        r.id === payload.id ? { ...r, app_role: payload.app_role } : r
      );
      setResources(updated);
      saveToStorage(updated);
      setError(String(e));
      return updated.find(r => r.id === payload.id)!;
    } finally {
      setLoading(false);
    }
  }, [resources, refresh]);

  const discoverAppsFn = useCallback(async (): Promise<DiscoveredApp[]> => {
    try {
      return await discoverApps();
    } catch (e) {
      setError(String(e));
      return [];
    }
  }, []);

  return {
    resources,
    grouped,
    scanning,
    loading,
    error,
    scan,
    register,
    registerBatch,
    remove,
    updateCategory,
    discoverApps: discoverAppsFn,
    updateRole,
    refresh,
  };
}
