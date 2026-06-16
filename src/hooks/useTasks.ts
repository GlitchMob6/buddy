import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Task, CreateTaskPayload, UpdateTaskPayload } from '../types';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await invoke<Task[]>('get_task_tree');
      setTasks(data);
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(async (payload: CreateTaskPayload) => {
    try {
      const newTask = await invoke<Task>('create_task', { payload });
      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (e: any) {
      setError(e.toString());
      throw e;
    }
  }, []);

  const updateTask = useCallback(async (payload: UpdateTaskPayload) => {
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => 
        t.id === payload.id ? { ...t, ...payload, updated_at: new Date().toISOString() } : t
      ));
      
      const updatedTask = await invoke<Task>('update_task', { payload });
      
      // Confirm with server data
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
      return updatedTask;
    } catch (e: any) {
      setError(e.toString());
      fetchTasks(); // Revert optimistic update on error
      throw e;
    }
  }, [fetchTasks]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      // Optimistic update (note: this doesn't optimistically remove descendants yet)
      setTasks(prev => prev.filter(t => t.id !== id));
      
      await invoke('delete_task', { id });
      
      // Re-fetch to ensure all cascaded deletes are accurately reflected
      await fetchTasks();
    } catch (e: any) {
      setError(e.toString());
      fetchTasks(); // Revert
      throw e;
    }
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  };
}
