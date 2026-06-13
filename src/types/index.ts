// ── Enums ──────────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'archived';

export type SessionStatus = 'planned' | 'active' | 'paused' | 'completed' | 'abandoned';

export type ResourceType = 'APPLICATION' | 'FOLDER' | 'DOMAIN' | 'URL';

export type ViolationSeverity = 'low' | 'medium' | 'high';

export type BossKeyReason = 'Emergency' | 'Meeting' | 'Accidental' | 'Other';

export type UserFeedback = 'Easy' | 'Expected' | 'Hard' | 'Frustrating';

// ── Core models ────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  priority: number; // 1–10
  status: TaskStatus;
  deadline: string | null;
  estimated_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  name: string | null;
  start_time: string | null;
  end_time: string | null;
  status: SessionStatus;
  created_at: string;
  completed_at: string | null;
}

export interface SessionRevision {
  id: string;
  session_id: string;
  revision_type: string;
  old_value: string | null;
  new_value: string | null;
  timestamp: string;
}

export interface SessionTask {
  session_id: string;
  task_id: string;
  task_order: number;
  allocated_minutes: number;
}

export interface Resource {
  id: string;
  resource_type: ResourceType;
  resource_value: string;
  category: string;
  created_at: string;
}

export interface MonitoringEvent {
  id: string;
  session_id: string;
  event_type: string;
  value: string | null;
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  session_id: string;
  timestamp: string;
  active_resource: string | null;
  active_window_title: string | null;
  keystrokes_per_min: number | null;
  mouse_distance_per_min: number | null;
  idle_seconds: number | null;
}

export interface Violation {
  id: string;
  session_id: string;
  violation_type: string;
  severity: ViolationSeverity;
  resource: string | null;
  timestamp: string;
  resolved: boolean;
  false_positive: boolean;
}

export interface BossKeyUsage {
  id: string;
  session_id: string;
  timestamp: string;
  reason: BossKeyReason;
  free_exit_used: boolean;
  penalty_applied: boolean;
}

export interface BossKeyResult {
  usage: BossKeyUsage;
  free_exit_used: boolean;
  penalty_applied: boolean;
  free_exits_remaining: number;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  session_id: string;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  completed: boolean;
  started_at: string;
  finished_at: string | null;
  user_feedback: UserFeedback | null;
}

export interface UserModel {
  id: number;
  // Focus Profile
  focus_score: number;
  average_focus_duration: number;
  average_distraction_interval: number;
  // Execution Profile
  completion_rate: number;
  average_estimation_accuracy: number;
  average_session_length: number;
  preferred_work_window: string;
  // Behavior Profile
  violation_profile: string;
  boss_key_usage_count: number;
  most_common_distractions: string; // JSON array
  task_preference_profile: string;  // JSON object
  schedule_adherence: number;
  updated_at: string;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  session_id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

// ── AI types ───────────────────────────────────────────────────────────────────

export interface SubtaskSuggestion {
  temp_id: string;
  title: string;
  estimated_minutes: number;
}

export interface AiConfig {
  provider: 'byok' | 'ollama' | 'none';
  endpoint: string | null;
  model: string | null;
  configured: boolean;
}

// ── Payload types ──────────────────────────────────────────────────────────────

export interface CreateTaskPayload {
  title: string;
  parent_id?: string;
  description?: string;
  priority?: number;
  deadline?: string;
  estimated_minutes?: number;
}

export interface UpdateTaskPayload {
  id: string;
  title?: string;
  parent_id?: string;
  description?: string;
  priority?: number;
  status?: TaskStatus;
  deadline?: string;
  estimated_minutes?: number;
}

export interface CreateSessionPayload {
  name?: string;
}

export interface RegisterResourcePayload {
  resource_type: ResourceType;
  resource_value: string;
  category?: string;
}
