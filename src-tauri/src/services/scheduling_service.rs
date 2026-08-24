/// Scheduling service — deterministic task scoring, ordering, and break insertion.
///
/// Implements the Session Engine B1a rules:
///   - Selection Score = Deadline Score + Priority Score
///   - Task ordering by urgency → priority → user selection order
///   - Cold-start break insertion (no User Model dependency)
///   - Capacity overflow → partial scheduling + deferral

use crate::models::session::{BlueprintResponse, PlanBlockKind, SessionPlanBlock};
use crate::models::task::Task;

// ── Deadline buckets ──────────────────────────────────────────────────────────

/// Returns deadline urgency score (0.0 – 1.0).
/// Follows sessionengine.md Section 1.5.
fn deadline_score(deadline: &Option<String>) -> f64 {
    let deadline_str = match deadline {
        Some(d) if !d.is_empty() => d,
        _ => return 0.0, // No deadline → no bonus
    };

    // Parse deadline — try multiple formats
    let deadline_date = if let Ok(dt) = chrono::NaiveDate::parse_from_str(deadline_str, "%Y-%m-%d") {
        dt
    } else if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(deadline_str, "%Y-%m-%dT%H:%M:%S%.fZ") {
        dt.date()
    } else if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(deadline_str, "%Y-%m-%dT%H:%M:%S") {
        dt.date()
    } else {
        return 0.0;
    };

    let today = chrono::Utc::now().date_naive();
    let days_until = (deadline_date - today).num_days();

    if days_until <= 0 {
        // Critical: overdue or due today
        1.0
    } else if days_until <= 2 {
        // Urgent: within 1–2 days
        0.8
    } else if days_until <= 7 {
        // Upcoming: within 3–7 days
        0.5
    } else {
        // Future: > 7 days
        0.2
    }
}

/// Returns priority score (0.0 – 1.0) from priority 1–10.
fn priority_score(priority: i32) -> f64 {
    (priority.clamp(1, 10) as f64) / 10.0
}

/// Combined selection score.
/// Weighting: deadline 50%, priority 40%, preference 10% (preference=0 for MVP B1a).
fn selection_score(task: &Task) -> f64 {
    let d = deadline_score(&task.deadline);
    let p = priority_score(task.priority);
    // preference_modifier = 0.0 for B1a (no User Model integration yet)
    0.50 * d + 0.40 * p + 0.10 * 0.0
}

// ── Task ordering ─────────────────────────────────────────────────────────────

/// Sort tasks by selection score descending, stable-sort to preserve user order on ties.
pub fn order_tasks(tasks: &mut [Task]) {
    // Stable sort preserves insertion (user selection) order for equal scores
    tasks.sort_by(|a, b| {
        let sa = selection_score(a);
        let sb = selection_score(b);
        sb.partial_cmp(&sa).unwrap_or(std::cmp::Ordering::Equal)
    });
}

// ── Break insertion ───────────────────────────────────────────────────────────

/// Cold-start break defaults (sessionengine.md Section 3.1).
/// Returns (focus_block_minutes, break_duration_minutes).
fn cold_start_break_params(total_session_minutes: i32) -> (i32, i32) {
    if total_session_minutes <= 30 {
        // No automatic breaks for short sessions
        (total_session_minutes, 0)
    } else if total_session_minutes <= 60 {
        (45, 5)
    } else if total_session_minutes <= 120 {
        (45, 5)
    } else {
        (50, 10)
    }
}

// ── Blueprint generation ──────────────────────────────────────────────────────

/// The minimum meaningful work block in minutes (Section 1.9 / 2.4).
const MIN_WORK_BLOCK: i32 = 15;

/// Generate a session blueprint from selected tasks and total session time.
///
/// # Arguments
/// * `tasks` — Tasks the user selected, in their selection order. Will be re-ordered by score.
/// * `total_session_minutes` — Total session duration including breaks.
///
/// # Returns
/// A `BlueprintResponse` with ordered blocks, deferred tasks, and warnings.
pub fn generate_blueprint(
    tasks: &[Task],
    total_session_minutes: i32,
) -> BlueprintResponse {
    let mut warnings: Vec<String> = Vec::new();

    if tasks.is_empty() {
        return BlueprintResponse {
            blocks: vec![],
            total_work_minutes: 0,
            total_break_minutes: 0,
            deferred_task_ids: vec![],
            warnings: vec!["No tasks selected.".to_string()],
        };
    }

    let (focus_block, break_duration) = cold_start_break_params(total_session_minutes);

    // Calculate available work time by estimating breaks we'll insert.
    // We'll do a greedy approach: build the plan, inserting breaks after every `focus_block` minutes.
    // First, order tasks by selection score.
    let mut ordered_tasks: Vec<Task> = tasks.to_vec();
    order_tasks(&mut ordered_tasks);

    // Check for overdue tasks and generate warnings
    for t in &ordered_tasks {
        if let Some(ref dl) = t.deadline {
            if !dl.is_empty() {
                if let Ok(d) = chrono::NaiveDate::parse_from_str(dl, "%Y-%m-%d") {
                    let today = chrono::Utc::now().date_naive();
                    if d < today {
                        warnings.push(format!(
                            "\"{}\" is overdue. Recommended to keep in this session.",
                            t.title
                        ));
                    }
                }
            }
        }
    }

    // Greedily fill blocks
    let mut blocks: Vec<SessionPlanBlock> = Vec::new();
    let mut deferred_task_ids: Vec<String> = Vec::new();
    let mut total_work: i32 = 0;
    let mut total_breaks: i32 = 0;
    let mut since_last_break: i32 = 0; // minutes of work since last break
    let mut order_idx: i32 = 0;

    // Available time budget
    let mut remaining_budget = total_session_minutes;

    for task in &ordered_tasks {
        if remaining_budget <= 0 {
            deferred_task_ids.push(task.id.clone());
            continue;
        }

        let task_duration = task.estimated_minutes.max(1);

        // Can we fit this task (or at least a partial block)?
        if remaining_budget < MIN_WORK_BLOCK {
            // Not enough time for even a minimal block
            deferred_task_ids.push(task.id.clone());
            continue;
        }

        // Allocate either the full estimate or whatever fits
        let allocate = task_duration.min(remaining_budget);

        // If it doesn't fully fit and the remainder is less than MIN_WORK_BLOCK, partial
        if allocate < task_duration && allocate < MIN_WORK_BLOCK {
            deferred_task_ids.push(task.id.clone());
            continue;
        }

        // Check if we need a break before this block
        if break_duration > 0 && since_last_break >= focus_block && remaining_budget > break_duration + MIN_WORK_BLOCK {
            blocks.push(SessionPlanBlock {
                kind: PlanBlockKind::Break,
                task_id: None,
                task_title: None,
                duration_minutes: break_duration,
                order: order_idx,
            });
            order_idx += 1;
            remaining_budget -= break_duration;
            total_breaks += break_duration;
            since_last_break = 0;
        }

        // Re-check budget after break
        let allocate = task_duration.min(remaining_budget);
        if allocate < MIN_WORK_BLOCK {
            deferred_task_ids.push(task.id.clone());
            continue;
        }

        // If the task block exceeds focus_block length, split it with breaks
        if break_duration > 0 && allocate > focus_block {
            let mut remaining_task = allocate;
            while remaining_task > 0 {
                // Insert break if needed (not before the first chunk of this task)
                if since_last_break >= focus_block && remaining_budget > break_duration + MIN_WORK_BLOCK {
                    blocks.push(SessionPlanBlock {
                        kind: PlanBlockKind::Break,
                        task_id: None,
                        task_title: None,
                        duration_minutes: break_duration,
                        order: order_idx,
                    });
                    order_idx += 1;
                    remaining_budget -= break_duration;
                    total_breaks += break_duration;
                    since_last_break = 0;
                }

                let chunk = remaining_task.min(focus_block).min(remaining_budget);
                if chunk < MIN_WORK_BLOCK && remaining_task > chunk {
                    // Can't fit even a minimum chunk, defer the rest
                    break;
                }
                if chunk <= 0 {
                    break;
                }

                blocks.push(SessionPlanBlock {
                    kind: PlanBlockKind::Task,
                    task_id: Some(task.id.clone()),
                    task_title: Some(task.title.clone()),
                    duration_minutes: chunk,
                    order: order_idx,
                });
                order_idx += 1;
                remaining_budget -= chunk;
                total_work += chunk;
                since_last_break += chunk;
                remaining_task -= chunk;
            }
        } else {
            // Simple single block
            blocks.push(SessionPlanBlock {
                kind: PlanBlockKind::Task,
                task_id: Some(task.id.clone()),
                task_title: Some(task.title.clone()),
                duration_minutes: allocate,
                order: order_idx,
            });
            order_idx += 1;
            remaining_budget -= allocate;
            total_work += allocate;
            since_last_break += allocate;
        }

        // Warn about partial allocation
        if allocate < task_duration {
            warnings.push(format!(
                "\"{}\" partially scheduled ({}/{} min). Remaining work deferred.",
                task.title, allocate, task_duration
            ));
        }
    }

    // Warn about total overflow
    let total_estimated: i32 = ordered_tasks.iter().map(|t| t.estimated_minutes).sum();
    if total_estimated > total_session_minutes {
        warnings.push(format!(
            "Selected tasks require ~{} min but session is {} min. {} task(s) deferred.",
            total_estimated,
            total_session_minutes,
            deferred_task_ids.len()
        ));
    }

    BlueprintResponse {
        blocks,
        total_work_minutes: total_work,
        total_break_minutes: total_breaks,
        deferred_task_ids,
        warnings,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::task::{Task, TaskStatus};

    fn make_task(id: &str, title: &str, priority: i32, estimated: i32, deadline: Option<&str>) -> Task {
        Task {
            id: id.to_string(),
            parent_id: None,
            title: title.to_string(),
            description: None,
            priority,
            status: TaskStatus::Todo,
            deadline: deadline.map(|s| s.to_string()),
            estimated_minutes: estimated,
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
            pos_x: None,
            pos_y: None,
            layout_direction: None,
            order_index: 0,
            session_queued: false,
        }
    }

    #[test]
    fn test_all_tasks_fit() {
        let tasks = vec![
            make_task("1", "Low priority", 3, 20, None),
            make_task("2", "High priority", 9, 30, None),
        ];
        let bp = generate_blueprint(&tasks, 60);
        // High priority should come first
        assert_eq!(bp.blocks[0].task_id.as_deref(), Some("2"));
        assert!(bp.deferred_task_ids.is_empty());
        assert!(bp.total_work_minutes <= 60);
    }

    #[test]
    fn test_task_deferred_when_no_fit() {
        let tasks = vec![
            make_task("1", "Task A", 8, 40, None),
            make_task("2", "Task B", 5, 40, None),
        ];
        let bp = generate_blueprint(&tasks, 50);
        // Task A should be scheduled, Task B deferred or partially
        assert!(!bp.blocks.is_empty());
        assert!(bp.total_work_minutes <= 50);
    }

    #[test]
    fn test_empty_tasks() {
        let bp = generate_blueprint(&[], 60);
        assert!(bp.blocks.is_empty());
        assert_eq!(bp.warnings.len(), 1);
    }

    #[test]
    fn test_breaks_inserted_long_session() {
        let tasks = vec![
            make_task("1", "Long task", 7, 120, None),
        ];
        let bp = generate_blueprint(&tasks, 150);
        // Should have at least one break block
        let break_count = bp.blocks.iter().filter(|b| matches!(b.kind, PlanBlockKind::Break)).count();
        assert!(break_count > 0, "Expected breaks in a 150-min session with a 120-min task");
    }

    #[test]
    fn test_deadline_task_sorted_first() {
        let today = chrono::Utc::now().date_naive();
        let tomorrow = (today + chrono::Duration::days(1)).format("%Y-%m-%d").to_string();

        let tasks = vec![
            make_task("1", "No deadline", 9, 30, None),
            make_task("2", "Due tomorrow", 5, 30, Some(&tomorrow)),
        ];
        let bp = generate_blueprint(&tasks, 90);
        // Due-tomorrow task should come first despite lower priority
        assert_eq!(bp.blocks[0].task_id.as_deref(), Some("2"));
    }
}
