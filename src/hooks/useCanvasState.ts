import { useState, useCallback } from 'react';
import type { Task } from '../types';

export interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
}

export function useCanvasState(tasks: Task[]) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const expandNode = useCallback((nodeId: string) => {
    setExpandedIds(prev => new Set(prev).add(nodeId));
  }, []);

  const collapseUnpinned = useCallback((keepAncestorsOf?: string) => {
    setExpandedIds(() => {
      const keep = new Set<string>();
      
      // Always keep pinned nodes expanded
      for (const pid of pinnedIds) {
        keep.add(pid);
        // Walk up ancestors
        let curr = tasks.find(t => t.id === pid);
        while (curr?.parent_id) {
          keep.add(curr.parent_id);
          curr = tasks.find(t => t.id === curr!.parent_id);
        }
      }
      
      // Keep ancestors of the specified node
      if (keepAncestorsOf) {
        let curr = tasks.find(t => t.id === keepAncestorsOf);
        while (curr) {
          keep.add(curr.id);
          curr = curr.parent_id ? tasks.find(t => t.id === curr!.parent_id) : undefined;
        }
      }
      
      return keep;
    });
  }, [tasks, pinnedIds]);

  const togglePin = useCallback((nodeId: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const openContextMenu = useCallback((x: number, y: number, nodeId: string) => {
    setContextMenu({ x, y, nodeId });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return {
    expandedIds,
    pinnedIds,
    contextMenu,
    toggleExpand,
    expandNode,
    collapseUnpinned,
    togglePin,
    openContextMenu,
    closeContextMenu,
  };
}
