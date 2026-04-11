import { writable } from 'svelte/store';

// Default routing states
export const activePage = writable('dashboard'); // 'dashboard', 'tasks', 'sessions', 'aichat', 'calendar', 'settings', 'profile', 'workspace'
export const activeWorkspace = writable('focus'); // 'focus', 'code', 'browser', 'pdf', 'notes'
