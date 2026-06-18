import { useState, useEffect, useCallback, useMemo } from 'react';
import type React from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useTasks } from '../../hooks/useTasks';
import { tasksToReactFlow, computeVisibleTaskIds } from '../../lib/reactFlowUtils';
import { useCanvasState } from '../../hooks/useCanvasState';

import TaskNode from './TaskNode';
import TaskInspector from './TaskInspector';
import ContextMenu from './ContextMenu';
import NewRoadmapModal from './NewRoadmapModal';
import './TaskCanvas.css';

const nodeTypes = {
  taskNode: TaskNode,
};

function TaskCanvasInner() {
  const { tasks, loading, error, createTask, updateTask, deleteTask } = useTasks();
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Canvas State Hooks
  const {
    expandedIds,
    pinnedIds,
    contextMenu,
    toggleExpand,
    expandNode,
    collapseUnpinned,
    togglePin,
    openContextMenu,
    closeContextMenu,
  } = useCanvasState(tasks);

  // Node Callbacks (injected into node data)
  const onToggleDone = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = (task.status === 'completed' || task.status === 'archived') ? 'todo' : 'completed';
    updateTask({ id: taskId, status: newStatus });
  }, [tasks, updateTask]);

  const onToggleSession = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    updateTask({ id: taskId, session_queued: !task.session_queued });
  }, [tasks, updateTask]);

  const onAddChild = useCallback(async (taskId: string) => {
    try {
      const parent = tasks.find(t => t.id === taskId);
      const newTask = await createTask({ 
        title: 'New Subtask', 
        parent_id: taskId,
        layout_direction: (parent?.layout_direction as 'tb' | 'lr') || 'tb'
      });
      expandNode(taskId);
      setSelectedTaskId(newTask.id);
    } catch (e: any) {
      alert(`Failed to create subtask: ${e}`);
    }
  }, [tasks, createTask, expandNode]);

  // Layout engine
  useEffect(() => {
    const visibleIds = computeVisibleTaskIds(tasks, expandedIds);
    const { nodes: newNodes, edges: newEdges } = tasksToReactFlow(
      tasks,
      visibleIds,
      expandedIds,
      pinnedIds,
      selectedTaskId
    );
    
    // Inject callbacks into node data
    const finalNodes = newNodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        onToggleDone,
        onToggleSession,
        onAddChild,
        onToggleExpand: toggleExpand,
      }
    }));

    setNodes(finalNodes);
    setEdges(newEdges);
  }, [tasks, expandedIds, pinnedIds, selectedTaskId, setNodes, setEdges, onToggleDone, onToggleSession, onAddChild, toggleExpand]);

  // React Flow Handlers
  const onConnect = useCallback(
    async (params: Connection | Edge) => {
      if (params.source && params.target) {
        try {
          await updateTask({ id: params.target, parent_id: params.source });
          expandNode(params.source);
        } catch (e: any) {
          alert(`Failed to reparent: ${e}`);
        }
      }
    },
    [updateTask, expandNode]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedTaskId(node.id);
    expandNode(node.id);
    collapseUnpinned(node.id);
    closeContextMenu();
  }, [expandNode, collapseUnpinned, closeContextMenu]);

  const onPaneClick = useCallback(() => {
    setSelectedTaskId(null);
    collapseUnpinned();
    closeContextMenu();
  }, [collapseUnpinned, closeContextMenu]);

  const onNodeDragStop = useCallback((_event: any, node: Node) => {
    updateTask({ id: node.id, pos_x: node.position.x, pos_y: node.position.y });
  }, [updateTask]);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    openContextMenu(event.clientX, event.clientY, node.id);
  }, [openContextMenu]);

  // Handlers
  const handleCreateRoot = async (data: { title: string; description: string; deadline: string; direction: 'tb' | 'lr' }) => {
    try {
      const newTask = await createTask({
        title: data.title,
        description: data.description || undefined,
        deadline: data.deadline || undefined,
        layout_direction: data.direction,
        // Center roughly in viewport (better logic could use reactflow instance to project screen coords to flow coords)
        pos_x: 100, 
        pos_y: 100,
      });
      setIsModalOpen(false);
      setSelectedTaskId(newTask.id);
    } catch (e: any) {
      alert(`Failed to create root task: ${e}`);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      if (selectedTaskId === id) setSelectedTaskId(null);
    } catch (e: any) {
      alert(`Failed to delete task: ${e}`);
    }
  };

  const selectedTask = useMemo(() => {
    return tasks.find(t => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  if (loading && tasks.length === 0) {
    return <div style={{ padding: 24 }}>Loading canvas...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: 'var(--danger)' }}>Error: {error}</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Header overlay */}
      <div style={{
        position: 'absolute',
        left: 24,
        top: 24,
        zIndex: 5,
        display: 'flex',
        gap: 12,
        alignItems: 'center'
      }}>
        <button 
          className="btn btn-primary"
          style={{ padding: '8px 16px', fontWeight: 500 }}
          onClick={() => setIsModalOpen(true)}
        >
          + New Roadmap
        </button>
        <div style={{
          background: 'var(--bg-elevated)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-secondary)',
        }}>
          {tasks.length} total nodes
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={onNodeContextMenu}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >

        <Controls />
        <MiniMap zoomable pannable nodeStrokeColor="var(--border-focus)" nodeColor="var(--bg-elevated)" maskColor="var(--bg-base)" />
      </ReactFlow>

      {/* Overlays */}
      {selectedTask && (
        <TaskInspector
          task={selectedTask}
          onUpdate={async (payload) => { await updateTask(payload); }}
          onDelete={handleDeleteTask}
          onClose={() => setSelectedTaskId(null)}
          onAddSubtask={onAddChild}
        />
      )}
      
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isPinned={pinnedIds.has(contextMenu.nodeId)}
          onEdit={() => setSelectedTaskId(contextMenu.nodeId)}
          onPin={() => togglePin(contextMenu.nodeId)}
          onDelete={() => handleDeleteTask(contextMenu.nodeId)}
          onClose={closeContextMenu}
        />
      )}

      {isModalOpen && (
        <NewRoadmapModal
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateRoot}
        />
      )}
    </div>
  );
}

export default function TaskCanvas() {
  return (
    <ReactFlowProvider>
      <TaskCanvasInner />
    </ReactFlowProvider>
  );
}
