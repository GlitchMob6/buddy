/**
 * Typed IPC wrappers for all Buddy Tauri commands.
 * Import these instead of calling `invoke` directly anywhere in the app.
 * This gives you full TypeScript autocomplete and type safety.
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  AiConfig,
  ActivityLog,
  CreateSessionPayload,
  CreateTaskPayload,
  RegisterResourcePayload,
  Resource,
  ScannedResource,
  Session,
  SessionTask,
  SubtaskSuggestion,
  Task,
  UpdateResourceCategoryPayload,
  UpdateResourceRolePayload,
  UpdateTaskPayload,
  UserModel,
  Violation,
  Workspace,
  DiscoveredApp,
} from '../types';

// ── Tasks ──────────────────────────────────────────────────────────────────────

export const createTask = (payload: CreateTaskPayload): Promise<Task> =>
  invoke('create_task', { payload });

export const getTaskTree = (): Promise<Task[]> =>
  invoke('get_task_tree');

export const getTask = (id: string): Promise<Task> =>
  invoke('get_task', { id });

export const updateTask = (payload: UpdateTaskPayload): Promise<Task> =>
  invoke('update_task', { payload });

export const deleteTask = (id: string): Promise<void> =>
  invoke('delete_task', { id });

export const reorderTasks = (parentId: string, taskIds: string[]): Promise<void> =>
  invoke('reorder_tasks', { parentId, taskIds });

// ── Sessions ───────────────────────────────────────────────────────────────────

export const createSession = (payload: CreateSessionPayload): Promise<Session> =>
  invoke('create_session', { payload });

export const startSession = (id: string): Promise<Session> =>
  invoke('start_session', { id });

export const pauseSession = (id: string): Promise<Session> =>
  invoke('pause_session', { id });

export const resumeSession = (id: string): Promise<Session> =>
  invoke('resume_session', { id });

export const completeSession = (id: string): Promise<Session> =>
  invoke('complete_session', { id });

export const abandonSession = (id: string): Promise<Session> =>
  invoke('abandon_session', { id });

export const getActiveSession = (): Promise<Session | null> =>
  invoke('get_active_session');

export const getSessions = (statusFilter?: string): Promise<Session[]> =>
  invoke('get_sessions', { statusFilter: statusFilter ?? null });

export const addSessionTask = (
  sessionId: string,
  taskId: string,
  allocatedMinutes: number,
): Promise<void> => invoke('add_session_task', { sessionId, taskId, allocatedMinutes });

export const removeSessionTask = (sessionId: string, taskId: string): Promise<void> =>
  invoke('remove_session_task', { sessionId, taskId });

export const reorderSessionTasks = (sessionId: string, taskIds: string[]): Promise<void> =>
  invoke('reorder_session_tasks', { sessionId, taskIds });

export const updateTaskAllocation = (
  sessionId: string,
  taskId: string,
  newMinutes: number,
): Promise<void> => invoke('update_task_allocation', { sessionId, taskId, newMinutes });

export const getSessionTasks = (sessionId: string): Promise<SessionTask[]> =>
  invoke('get_session_tasks', { sessionId });

// ── Resources ──────────────────────────────────────────────────────────────────

export const scanResources = (): Promise<ScannedResource[]> =>
  invoke('scan_resources');

export const registerResource = (payload: RegisterResourcePayload): Promise<Resource> =>
  invoke('register_resource', { payload });

export const deleteResource = (id: string): Promise<void> =>
  invoke('delete_resource', { id });

export const getResources = (categoryFilter?: string): Promise<Resource[]> =>
  invoke('get_resources', { categoryFilter: categoryFilter ?? null });

export const updateResourceCategory = (payload: UpdateResourceCategoryPayload): Promise<Resource> =>
  invoke('update_resource_category', { payload });

export const assignResourceToTask = (taskId: string, resourceId: string): Promise<void> =>
  invoke('assign_resource_to_task', { taskId, resourceId });

export const unassignResourceFromTask = (taskId: string, resourceId: string): Promise<void> =>
  invoke('unassign_resource_from_task', { taskId, resourceId });

export const getTaskResources = (taskId: string): Promise<Resource[]> =>
  invoke('get_task_resources', { taskId });

export const discoverApps = (): Promise<DiscoveredApp[]> =>
  invoke('discover_apps');

export const updateResourceRole = (payload: UpdateResourceRolePayload): Promise<Resource> =>
  invoke('update_resource_role', { payload });

// ── Monitoring ─────────────────────────────────────────────────────────────────

export const startMonitoring = (sessionId: string): Promise<void> =>
  invoke('start_monitoring', { sessionId });

export const stopMonitoring = (): Promise<void> =>
  invoke('stop_monitoring');

export const getSessionViolations = (sessionId: string): Promise<Violation[]> =>
  invoke('get_session_violations', { sessionId });

export const markFalsePositive = (violationId: string): Promise<void> =>
  invoke('mark_false_positive', { violationId });

export const getActivityLog = (sessionId: string, limit?: number): Promise<ActivityLog[]> =>
  invoke('get_activity_log', { sessionId, limit: limit ?? null });

// ── Workspace ──────────────────────────────────────────────────────────────────

export const createWorkspace = (sessionId: string, name?: string): Promise<Workspace> =>
  invoke('create_workspace', { sessionId, name: name ?? null });

export const getSessionWorkspaces = (sessionId: string): Promise<Workspace[]> =>
  invoke('get_session_workspaces', { sessionId });

export const switchWorkspace = (workspaceId: string): Promise<void> =>
  invoke('switch_workspace', { workspaceId });

export const destroyWorkspace = (workspaceId: string): Promise<void> =>
  invoke('destroy_workspace', { workspaceId });

export const launchResource = (resourceId: string): Promise<void> =>
  invoke('launch_resource', { resourceId });

export const enterWorkspace = (): Promise<void> =>
  invoke('enter_workspace');

export const exitWorkspace = (): Promise<void> =>
  invoke('exit_workspace');

// ── User Model ─────────────────────────────────────────────────────────────────

export const getUserModel = (): Promise<UserModel> =>
  invoke('get_user_model');

export const recomputeUserModel = (): Promise<UserModel> =>
  invoke('recompute_user_model');

export const getFocusScoreHistory = (days?: number): Promise<[string, number][]> =>
  invoke('get_focus_score_history', { days: days ?? null });

// ── AI ─────────────────────────────────────────────────────────────────────────

export const generateSubtasks = (taskId: string, provider?: string): Promise<SubtaskSuggestion[]> =>
  invoke('generate_subtasks', { taskId, provider: provider ?? null });

export const acceptSubtasks = (taskId: string, subtaskIds: string[]): Promise<Task[]> =>
  invoke('accept_subtasks', { taskId, subtaskIds });

export const configureAiProvider = (
  providerType: string,
  endpoint?: string,
  apiKey?: string,
  model?: string,
): Promise<void> =>
  invoke('configure_ai_provider', {
    providerType,
    endpoint: endpoint ?? null,
    apiKey: apiKey ?? null,
    model: model ?? null,
  });

export const getAiConfig = (): Promise<AiConfig> =>
  invoke('get_ai_config');
