import { Node, Edge, Position } from '@xyflow/react';
import dagre from 'dagre';
import type { Task } from '../types';

const nodeWidth = 220;
const nodeHeight = 50;

/**
 * Compute visible tasks based on expand/collapse state.
 * Root nodes are always visible.
 * Children visible only if ALL ancestors are expanded.
 */
export function computeVisibleTaskIds(tasks: Task[], expandedIds: Set<string>): Set<string> {
  const visible = new Set<string>();

  // All root nodes are always visible
  tasks.filter(t => t.parent_id === null).forEach(t => visible.add(t.id));

  // Iteratively reveal children of expanded parents
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of tasks) {
      if (t.parent_id && visible.has(t.parent_id) && expandedIds.has(t.parent_id)) {
        if (!visible.has(t.id)) {
          visible.add(t.id);
          changed = true;
        }
      }
    }
  }

  return visible;
}

/**
 * Get the layout direction for a node by walking up to its root.
 */
export function getNodeDirection(task: Task, taskMap: Map<string, Task>): 'tb' | 'lr' {
  let current: Task | undefined = task;
  while (current && current.parent_id !== null) {
    current = taskMap.get(current.parent_id);
  }
  return (current?.layout_direction as 'tb' | 'lr') || 'tb';
}

/**
 * Convert tasks array to ReactFlow nodes + edges.
 * Uses saved positions when available, dagre fallback for unpositioned nodes.
 */
export function tasksToReactFlow(
  tasks: Task[],
  visibleIds: Set<string>,
  expandedIds: Set<string>,
  pinnedIds: Set<string>,
  selectedId: string | null,
) {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const visibleTasks = tasks.filter(t => visibleIds.has(t.id));

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Separate positioned vs unpositioned nodes
  const positioned: Task[] = [];
  const unpositioned: Task[] = [];

  visibleTasks.forEach(task => {
    if (task.pos_x != null && task.pos_y != null) {
      positioned.push(task);
    } else {
      unpositioned.push(task);
    }
  });

  // Create nodes from positioned tasks (use saved coords)
  positioned.forEach(task => {
    const dir = getNodeDirection(task, taskMap);
    const isHorizontal = dir === 'lr';
    const children = tasks.filter(t => t.parent_id === task.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(task.id);

    nodes.push({
      id: task.id,
      type: 'taskNode',
      data: {
        task,
        hasChildren,
        isExpanded,
        isPinned: pinnedIds.has(task.id),
        direction: dir,
        childCount: children.length,
      },
      position: { x: task.pos_x!, y: task.pos_y! },
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      selected: task.id === selectedId,
    });
  });

  // Create nodes from unpositioned tasks (dagre layout)
  if (unpositioned.length > 0) {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'TB' }); // Dagre defaults to TB for unpositioned

    unpositioned.forEach(t => g.setNode(t.id, { width: nodeWidth, height: nodeHeight }));
    unpositioned.forEach(t => {
      if (t.parent_id && unpositioned.some(u => u.id === t.parent_id)) {
        g.setEdge(t.parent_id, t.id);
      }
    });
    dagre.layout(g);

    unpositioned.forEach(task => {
      const pos = g.node(task.id);
      const children = tasks.filter(t => t.parent_id === task.id);
      nodes.push({
        id: task.id,
        type: 'taskNode',
        data: {
          task,
          hasChildren: children.length > 0,
          isExpanded: expandedIds.has(task.id),
          isPinned: pinnedIds.has(task.id),
          direction: 'tb',
          childCount: children.length,
        },
        position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 },
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
        selected: task.id === selectedId,
      });
    });
  }

  // Create edges (only between visible nodes)
  visibleTasks.forEach(task => {
    if (task.parent_id && visibleIds.has(task.parent_id)) {
      edges.push({
        id: `e-${task.parent_id}-${task.id}`,
        source: task.parent_id,
        target: task.id,
        type: 'default',
        animated: task.status === 'in_progress',
        style: {
          stroke: task.status === 'in_progress' ? 'var(--accent)' : 'var(--border-subtle)',
          strokeWidth: 2,
        },
      });
    }
  });

  // Sort nodes so parents render before children, selected node renders last (on top)
  nodes.sort((a, b) => {
    if (a.id === selectedId) return 1;
    if (b.id === selectedId) return -1;
    return 0;
  });

  return { nodes, edges };
}
