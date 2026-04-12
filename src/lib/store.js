import { writable } from 'svelte/store';

// Default routing states
export const activePage = writable('dashboard'); // 'dashboard', 'tasks', 'sessions', 'aichat', 'calendar', 'settings', 'profile', 'workspace'
export const activeWorkspace = writable('focus'); // 'focus', 'code', 'browser', 'pdf', 'notes'

// Task tree-canvas state
export const taskColumns = writable([]);           // array of arrays: [ [rootNodes], [childrenOfClickedNode], ... ]
export const activeNodePerColumn = writable({});   // { columnIndex: nodeId }
export const pinnedCards = writable([]);            // array of pinned node objects
export const taskLoading = writable(false);
