// ── Enums ──────────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'archived';

export type SessionStatus = 'planned' | 'active' | 'paused' | 'completed' | 'abandoned';

export type ResourceType = 'APPLICATION';

export type AppRole = 'work_tool' | 'background' | 'on_demand';

export type ResourceCategory =
  | 'Browser'
  | 'Code'
  | 'Terminal'
  | 'Communication'
  | 'Media'
  | 'Design'
  | 'Productivity'
  | 'Other';

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
  // ── Canvas fields ──
  pos_x: number | null;
  pos_y: number | null;
  layout_direction: string | null;
  order_index: number;
  session_queued: boolean;
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
  /** Human-readable name (e.g., "Google Chrome" instead of exe path) */
  display_name: string | null;
  category: string;
  /** Base64-encoded PNG icon data */
  icon_data: string | null;
  app_role: AppRole;
  created_at: string;
}

/** Detected by OS scan — not yet persisted */
export interface ScannedResource {
  display_name: string;
  exe_path: string;
  category: string;
  icon_data: string | null;
}

export interface DiscoveredApp {
  display_name: string;
  exe_path: string;
  category: string;
  icon_data: string | null;
  suggested_role: AppRole;
  discovery_reason: string;
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
  // ── Canvas fields ──
  pos_x?: number;
  pos_y?: number;
  layout_direction?: 'tb' | 'lr';
  order_index?: number;
  session_queued?: boolean;
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
  // ── Canvas fields ──
  pos_x?: number;
  pos_y?: number;
  layout_direction?: 'tb' | 'lr';
  order_index?: number;
  session_queued?: boolean;
}

export type PlanBlockKind = 'task' | 'break';

export interface SessionPlanBlock {
  kind: PlanBlockKind;
  task_id: string | null;
  task_title: string | null;
  duration_minutes: number;
  order: number;
}

export interface BlueprintResponse {
  blocks: SessionPlanBlock[];
  total_work_minutes: number;
  total_break_minutes: number;
  deferred_task_ids: string[];
  warnings: string[];
}

export interface CreateSessionPayload {
  name?: string;
  task_ids?: string[];
  allocated_minutes?: number[];
  total_minutes?: number;
}

export interface RegisterResourcePayload {
  resource_value: string;
  display_name?: string;
  category?: string;
  app_role?: AppRole;
  icon_data?: string;
}

export interface UpdateResourceCategoryPayload {
  id: string;
  category: string;
}

export interface UpdateResourceRolePayload {
  id: string;
  app_role: AppRole;
}
