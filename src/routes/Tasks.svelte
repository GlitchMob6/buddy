<script>
    import { onMount, tick, afterUpdate } from 'svelte';
    import { FolderOpen, Pin, Plus, X, GripVertical, Trash2 } from 'lucide-svelte';
    import { taskColumns, activeNodePerColumn, pinnedCards, taskLoading } from '../lib/store.js';

    const API_BASE = 'http://localhost:8000';

    // Local reactive mirrors of stores
    let columns = [];
    let activeNodes = {};
    let pinned = [];
    let loading = false;

    // Canvas
    let canvasEl;
    let columnsContainerEl;

    // Modals
    let showNewModal = false;
    let showDetailModal = false;
    let detailNode = null;

    // New node form
    let formType = 'Task';
    let formTitle = '';
    let formPriority = 'med';
    let formDueDate = '';
    let formEstimatedMinutes = '';
    let formPenaltyLevel = 0;
    let formDescription = '';

    // Detail edit form
    let editTitle = '';
    let editDescription = '';
    let editPriority = 'med';
    let editDueDate = '';
    let editEstimatedMinutes = '';
    let editPenaltyLevel = 0;

    // Drag state
    let dragState = null; // { colIndex, nodeIndex, node, startY, currentY }

    // SVG arrows
    let arrowPaths = [];

    // Hover state
    let hoveredCardId = null;

    // Store subscriptions
    const unsubs = [];
    onMount(() => {
        unsubs.push(taskColumns.subscribe(v => { columns = v; }));
        unsubs.push(activeNodePerColumn.subscribe(v => { activeNodes = v; }));
        unsubs.push(pinnedCards.subscribe(v => { pinned = v; }));
        unsubs.push(taskLoading.subscribe(v => { loading = v; }));
        fetchRootNodes();
        return () => unsubs.forEach(u => u());
    });

    afterUpdate(() => {
        recalcArrows();
    });

    // ── API ──────────────────────────────────────────────────────
    async function fetchNodes(parentId) {
        const url = parentId != null
            ? `${API_BASE}/tasks?parent_id=${parentId}`
            : `${API_BASE}/tasks?parent_id=null`;
        const r = await fetch(url);
        if (!r.ok) throw new Error('Failed to fetch');
        const data = await r.json();
        return Array.isArray(data) ? data : (data.tasks || []);
    }

    async function fetchRootNodes() {
        taskLoading.set(true);
        try {
            const roots = await fetchNodes(null);
            taskColumns.set([roots]);
            activeNodePerColumn.set({});
        } catch (e) {
            console.error('Failed to fetch root nodes:', e);
            taskColumns.set([[]]);
        } finally {
            taskLoading.set(false);
        }
    }

    async function handleGroupClick(colIndex, node) {
        // Set this node as active for this column
        const newActive = { ...activeNodes };
        newActive[colIndex] = node.id;

        // Remove all columns to the right (except pinned cards remain)
        const newColumns = columns.slice(0, colIndex + 1);

        // Remove active nodes for removed columns
        Object.keys(newActive).forEach(k => {
            if (parseInt(k) > colIndex) delete newActive[k];
        });

        activeNodePerColumn.set(newActive);
        taskColumns.set(newColumns);

        // Fetch children
        taskLoading.set(true);
        try {
            const children = await fetchNodes(node.id);
            taskColumns.update(cols => [...cols, children]);
            await tick();
            scrollToNewColumn();
        } catch (e) {
            console.error('Failed to fetch children:', e);
        } finally {
            taskLoading.set(false);
        }
    }

    function scrollToNewColumn() {
        if (!canvasEl) return;
        const pinnedColWidth = pinned.length > 0 ? 236 : 0; // 200 + 20 + 16
        const totalColumnsWidth = columns.length * 280; // 220 + 60
        const targetScroll = pinnedColWidth + totalColumnsWidth - canvasEl.clientWidth + 100;
        canvasEl.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }

    async function toggleTask(e, node) {
        e.stopPropagation();
        const newStatus = node.status === 'done' ? 'pending' : 'done';

        // Optimistic update across all columns
        taskColumns.update(cols => cols.map(col =>
            col.map(n => n.id === node.id ? { ...n, status: newStatus } : n)
        ));
        // Also update pinned
        pinnedCards.update(pins =>
            pins.map(n => n.id === node.id ? { ...n, status: newStatus } : n)
        );

        try {
            const r = await fetch(`${API_BASE}/tasks/${node.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (!r.ok) throw new Error('Update failed');
        } catch (e) {
            console.error(e);
            // Revert on failure
            taskColumns.update(cols => cols.map(col =>
                col.map(n => n.id === node.id ? { ...n, status: node.status } : n)
            ));
            pinnedCards.update(pins =>
                pins.map(n => n.id === node.id ? { ...n, status: node.status } : n)
            );
        }
    }

    // ── Pin logic ────────────────────────────────────────────────
    function togglePin(e, node) {
        e.stopPropagation();
        const isPinned = pinned.some(p => p.id === node.id);
        if (isPinned) {
            pinnedCards.update(pins => pins.filter(p => p.id !== node.id));
        } else {
            pinnedCards.update(pins => [...pins, { ...node }]);
        }
    }

    function isNodePinned(nodeId) {
        return pinned.some(p => p.id === nodeId);
    }

    // ── Detail modal ─────────────────────────────────────────────
    function openDetail(e, node) {
        e.stopPropagation();
        detailNode = node;
        editTitle = node.title || '';
        editDescription = node.description || '';
        editPriority = node.priority || 'med';
        editDueDate = node.due_date ? node.due_date.slice(0, 16) : '';
        editEstimatedMinutes = node.estimated_mins || '';
        editPenaltyLevel = node.penalty_level || 0;
        showDetailModal = true;
    }

    async function saveDetail() {
        if (!detailNode) return;
        const updates = {
            title: editTitle,
            description: editDescription,
            priority: editPriority,
            estimated_mins: parseInt(editEstimatedMinutes) || 60,
            penalty_level: parseInt(editPenaltyLevel) || 0
        };
        if (editDueDate) {
            updates.due_date = editDueDate;
        }
        try {
            const r = await fetch(`${API_BASE}/tasks/${detailNode.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (r.ok) {
                // Refresh the column this node belongs to
                const parentId = detailNode.parent_id;
                const colIndex = findColumnOfNode(detailNode.id);
                if (colIndex >= 0) {
                    const refreshed = await fetchNodes(parentId);
                    taskColumns.update(cols => {
                        const newCols = [...cols];
                        newCols[colIndex] = refreshed;
                        return newCols;
                    });
                }
                // Update pinned copy
                pinnedCards.update(pins =>
                    pins.map(p => p.id === detailNode.id ? { ...p, ...updates, title: editTitle } : p)
                );
                showDetailModal = false;
            }
        } catch (e) {
            console.error('Save failed:', e);
        }
    }

    async function deleteNode() {
        if (!detailNode) return;
        try {
            const r = await fetch(`${API_BASE}/tasks/${detailNode.id}`, { method: 'DELETE' });
            if (r.ok) {
                const colIndex = findColumnOfNode(detailNode.id);
                if (colIndex >= 0) {
                    const parentId = detailNode.parent_id;
                    const refreshed = await fetchNodes(parentId);
                    taskColumns.update(cols => {
                        const newCols = [...cols];
                        newCols[colIndex] = refreshed;
                        // Remove child columns if this was an active node
                        if (activeNodes[colIndex] === detailNode.id) {
                            return newCols.slice(0, colIndex + 1);
                        }
                        return newCols;
                    });
                }
                pinnedCards.update(pins => pins.filter(p => p.id !== detailNode.id));
                showDetailModal = false;
            }
        } catch (e) {
            console.error('Delete failed:', e);
        }
    }

    function findColumnOfNode(nodeId) {
        for (let i = 0; i < columns.length; i++) {
            if (columns[i].some(n => n.id === nodeId)) return i;
        }
        return -1;
    }

    // ── New node ─────────────────────────────────────────────────
    function getCurrentParentId() {
        // The active branch's deepest active node, or null for root
        const maxActiveCol = Math.max(...Object.keys(activeNodes).map(Number), -1);
        if (maxActiveCol >= 0) return activeNodes[maxActiveCol];
        return null;
    }

    async function submitNode(e) {
        e.preventDefault();
        if (!formTitle.trim()) return;

        const parentId = getCurrentParentId();
        const payload = {
            title: formTitle,
            parent_id: parentId,
            node_type: formType === 'Group' ? 'group' : 'task'
        };

        if (formDueDate) payload.due_date = formDueDate;
        if (formDescription) payload.description = formDescription;

        if (formType === 'Task') {
            payload.priority = formPriority;
            if (formEstimatedMinutes) payload.estimated_mins = parseInt(formEstimatedMinutes);
            payload.penalty_level = parseInt(formPenaltyLevel);
        }

        try {
            const r = await fetch(`${API_BASE}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (r.ok) {
                showNewModal = false;
                resetForm();
                // Refresh the correct column
                const refreshed = await fetchNodes(parentId);
                taskColumns.update(cols => {
                    const newCols = [...cols];
                    // Find which column corresponds to parentId
                    if (parentId == null) {
                        newCols[0] = refreshed;
                    } else {
                        // It's the column after the one containing the parent
                        const parentColIndex = findColumnOfNode(parentId);
                        if (parentColIndex >= 0 && parentColIndex + 1 < newCols.length) {
                            newCols[parentColIndex + 1] = refreshed;
                        }
                    }
                    return newCols;
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    function resetForm() {
        formTitle = '';
        formDueDate = '';
        formEstimatedMinutes = '';
        formPenaltyLevel = 0;
        formDescription = '';
        formPriority = 'med';
    }

    // ── Drag reorder ─────────────────────────────────────────────
    function startDrag(e, colIndex, nodeIndex, node) {
        e.stopPropagation();
        const startY = e.clientY || e.touches?.[0]?.clientY || 0;
        dragState = { colIndex, nodeIndex, node, startY, currentY: startY, offsetY: 0 };

        const onMove = (ev) => {
            const y = ev.clientY || ev.touches?.[0]?.clientY || 0;
            dragState = { ...dragState, currentY: y, offsetY: y - dragState.startY };
        };
        const onUp = async () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);

            if (!dragState) return;
            const { colIndex: ci, nodeIndex: ni, offsetY } = dragState;
            const cardHeight = 132; // 120 + 12 gap
            const moveBy = Math.round(offsetY / cardHeight);
            const newIndex = Math.max(0, Math.min(columns[ci].length - 1, ni + moveBy));

            if (newIndex !== ni) {
                // Reorder
                taskColumns.update(cols => {
                    const newCols = [...cols];
                    const col = [...newCols[ci]];
                    const [moved] = col.splice(ni, 1);
                    col.splice(newIndex, 0, moved);
                    newCols[ci] = col;
                    return newCols;
                });

                // Save new order
                const movedNode = columns[ci]?.[ni];
                if (movedNode) {
                    try {
                        await fetch(`${API_BASE}/tasks/${movedNode.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ order_index: newIndex })
                        });
                    } catch (e) {
                        console.error('Order save failed:', e);
                    }
                }
            }
            dragState = null;
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }

    // ── SVG Arrows ───────────────────────────────────────────────
    function recalcArrows() {
        if (!columnsContainerEl) { arrowPaths = []; return; }

        const newPaths = [];
        const containerRect = columnsContainerEl.getBoundingClientRect();

        for (let colIdx = 0; colIdx < columns.length - 1; colIdx++) {
            const parentId = activeNodes[colIdx];
            if (!parentId) continue;

            // Find parent card element
            const parentEl = columnsContainerEl.querySelector(`[data-node-id="${parentId}"]`);
            if (!parentEl) continue;

            const parentRect = parentEl.getBoundingClientRect();
            const x1 = parentRect.right - containerRect.left;
            const y1 = parentRect.top + parentRect.height / 2 - containerRect.top;

            // Find children in next column
            const childCol = columns[colIdx + 1];
            if (!childCol) continue;

            for (const child of childCol) {
                const childEl = columnsContainerEl.querySelector(`[data-node-id="${child.id}"]`);
                if (!childEl) continue;

                const childRect = childEl.getBoundingClientRect();
                const x2 = childRect.left - containerRect.left;
                const y2 = childRect.top + childRect.height / 2 - containerRect.top;

                const cx1 = x1 + 40;
                const cx2 = x2 - 40;

                newPaths.push({
                    d: `M ${x1} ${y1} C ${cx1} ${y1} ${cx2} ${y2} ${x2} ${y2}`,
                    endX: x2,
                    endY: y2,
                    angle: Math.atan2(y2 - (y2), x2 - cx2)
                });
            }
        }
        arrowPaths = newPaths;
    }

    // ── Helpers ───────────────────────────────────────────────────
    function formatDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        return `${mo}/${da}`;
    }

    function formatCreatedDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function penaltyLabel(level) {
        const labels = ['none', 'mild', 'moderate', 'strict'];
        return labels[level] || 'none';
    }

    $: pinnedCount = pinned.length;
    $: canvasWidth = Math.max(
        (pinned.length > 0 ? 236 : 0) + columns.length * 280 + 100,
        100
    );
    $: canvasHeight = '100%';
</script>

<div class="tasks-page">
    <!-- Top bar -->
    <header class="tasks-header">
        <div class="header-left">
            <h1>Tasks</h1>
            {#if pinnedCount > 0}
                <span class="pin-count">
                    <Pin size={12} />
                    {pinnedCount} pinned
                </span>
            {/if}
        </div>
        <button class="new-node-btn" on:click={() => showNewModal = true}>
            <Plus size={14} />
            New Node
        </button>
    </header>

    <!-- Canvas -->
    <div class="canvas" bind:this={canvasEl}>
        <div class="canvas-inner" bind:this={columnsContainerEl} style="min-width: {canvasWidth}px;">
            <!-- SVG Arrow layer -->
            <svg class="arrow-layer" style="min-width: {canvasWidth}px;">
                <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="var(--accent)" fill-opacity="0.5" />
                    </marker>
                </defs>
                {#each arrowPaths as arrow}
                    <path
                        d={arrow.d}
                        fill="none"
                        stroke="var(--accent)"
                        stroke-opacity="0.3"
                        stroke-width="1.5"
                        marker-end="url(#arrowhead)"
                    />
                {/each}
            </svg>

            <!-- Pinned column -->
            {#if pinned.length > 0}
                <div class="column pinned-column">
                    <div class="column-label">
                        <Pin size={12} />
                        Pinned
                    </div>
                    <div class="column-scroll">
                        {#each pinned as node (node.id)}
                            <div
                                class="card pinned-card"
                                class:group-card={node.node_type === 'group'}
                                class:task-card={node.node_type === 'task'}
                                class:done={node.status === 'done'}
                                data-node-id="pinned-{node.id}"
                                on:mouseenter={() => hoveredCardId = `pin-${node.id}`}
                                on:mouseleave={() => hoveredCardId = null}
                            >
                                <!-- Pin icon (unpin) -->
                                <button class="pin-btn pinned-active" on:click={(e) => togglePin(e, node)} title="Unpin">
                                    <Pin size={13} />
                                </button>

                                {#if node.node_type === 'group'}
                                    <div class="card-icon">
                                        <FolderOpen size={16} />
                                    </div>
                                    <div class="card-title">{node.title}</div>
                                    {#if node.due_date}
                                        <div class="card-date">{formatDate(node.due_date)}</div>
                                    {/if}
                                    <div class="child-badge">{node.child_count || 0}</div>
                                    <div class="progress-track">
                                        <div class="progress-fill" style="width: {node.progress || 0}%"></div>
                                    </div>
                                {:else}
                                    <button class="checkbox" class:checked={node.status === 'done'} on:click={(e) => toggleTask(e, node)}>
                                        {#if node.status === 'done'}
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        {/if}
                                    </button>
                                    <div class="card-title" class:strikethrough={node.status === 'done'}>{node.title}</div>
                                    {#if node.priority}
                                        <span class="priority-pill priority-{node.priority}">{node.priority}</span>
                                    {/if}
                                    {#if node.due_date}
                                        <div class="card-date">{formatDate(node.due_date)}</div>
                                    {/if}
                                    {#if node.estimated_mins}
                                        <div class="card-est">{node.estimated_mins}m</div>
                                    {/if}
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Tree columns -->
            {#each columns as col, colIndex (colIndex)}
                <div class="column">
                    <div class="column-label">
                        {#if colIndex === 0}
                            Root
                        {:else}
                            Depth {colIndex}
                        {/if}
                    </div>
                    <div class="column-scroll">
                        {#if loading && colIndex === columns.length - 1 && col.length === 0}
                            <div class="col-loading">
                                <div class="pulse-dot"></div>
                                <div class="pulse-dot d2"></div>
                                <div class="pulse-dot d3"></div>
                            </div>
                        {:else if col.length === 0}
                            <div class="col-empty">No items</div>
                        {:else}
                            {#each col as node, nodeIndex (node.id)}
                                {@const isActive = activeNodes[colIndex] === node.id}
                                {@const isDragging = dragState && dragState.colIndex === colIndex && dragState.nodeIndex === nodeIndex}
                                {@const isPinned = isNodePinned(node.id)}
                                <div
                                    class="card"
                                    class:group-card={node.node_type === 'group'}
                                    class:task-card={node.node_type === 'task'}
                                    class:active={isActive}
                                    class:dragging={isDragging}
                                    class:done={node.status === 'done'}
                                    data-node-id={node.id}
                                    style={isDragging ? `transform: translateY(${dragState.offsetY}px) scale(1.05); z-index: 50;` : ''}
                                    on:mouseenter={() => hoveredCardId = node.id}
                                    on:mouseleave={() => hoveredCardId = null}
                                    on:click={(e) => {
                                        if (node.node_type === 'group') {
                                            handleGroupClick(colIndex, node);
                                        } else {
                                            openDetail(e, node);
                                        }
                                    }}
                                >
                                    <!-- Drag handle -->
                                    <button
                                        class="drag-handle"
                                        on:mousedown={(e) => startDrag(e, colIndex, nodeIndex, node)}
                                        title="Drag to reorder"
                                    >
                                        <GripVertical size={12} />
                                    </button>

                                    <!-- Pin button (visible on hover) -->
                                    <button
                                        class="pin-btn"
                                        class:pinned-active={isPinned}
                                        class:visible={hoveredCardId === node.id || isPinned}
                                        on:click={(e) => togglePin(e, node)}
                                        title={isPinned ? 'Unpin' : 'Pin'}
                                    >
                                        <Pin size={13} />
                                    </button>

                                    {#if node.node_type === 'group'}
                                        <!-- Group card content -->
                                        <div class="card-icon">
                                            <FolderOpen size={16} />
                                        </div>
                                        <div class="card-title">{node.title}</div>
                                        {#if node.due_date}
                                            <div class="card-date">{formatDate(node.due_date)}</div>
                                        {/if}
                                        <div class="child-badge">{node.child_count || 0}</div>
                                        <div class="progress-track">
                                            <div class="progress-fill" style="width: {node.progress || 0}%"></div>
                                        </div>

                                        <!-- Hover overlay for groups -->
                                        {#if hoveredCardId === node.id}
                                            <div class="hover-overlay">
                                                {#if node.estimated_mins}
                                                    <span>Est: {node.estimated_mins}m</span>
                                                {/if}
                                                {#if node.penalty_level > 0}
                                                    <span>Penalty: {penaltyLabel(node.penalty_level)}</span>
                                                {/if}
                                                {#if node.created_at}
                                                    <span>Created: {formatCreatedDate(node.created_at)}</span>
                                                {/if}
                                            </div>
                                        {/if}
                                    {:else}
                                        <!-- Task card content -->
                                        <button class="checkbox" class:checked={node.status === 'done'} on:click={(e) => toggleTask(e, node)}>
                                            {#if node.status === 'done'}
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            {/if}
                                        </button>
                                        <div class="card-title" class:strikethrough={node.status === 'done'}>{node.title}</div>
                                        {#if node.priority}
                                            <span class="priority-pill priority-{node.priority}">{node.priority}</span>
                                        {/if}
                                        {#if node.due_date}
                                            <div class="card-date">{formatDate(node.due_date)}</div>
                                        {/if}
                                        {#if node.estimated_mins}
                                            <div class="card-est">{node.estimated_mins}m</div>
                                        {/if}
                                        {#if node.penalty_level > 0}
                                            <span class="penalty-badge">{penaltyLabel(node.penalty_level)}</span>
                                        {/if}

                                        <!-- Hover description -->
                                        {#if hoveredCardId === node.id && node.description}
                                            <div class="hover-overlay">
                                                <span class="desc-text">{node.description}</span>
                                            </div>
                                        {/if}
                                    {/if}
                                </div>
                            {/each}
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>

<!-- ═══ NEW NODE MODAL ═══ -->
{#if showNewModal}
    <div class="modal-backdrop" on:click={() => showNewModal = false}>
        <div class="modal" on:click|stopPropagation>
            <div class="modal-header">
                <h2>New Node</h2>
                <button class="modal-close" on:click={() => showNewModal = false}>
                    <X size={18} />
                </button>
            </div>
            <form on:submit={submitNode}>
                <div class="form-group toggles">
                    <button type="button" class="toggle-btn" class:active={formType === 'Group'} on:click={() => formType = 'Group'}>Group</button>
                    <button type="button" class="toggle-btn" class:active={formType === 'Task'} on:click={() => formType = 'Task'}>Task</button>
                </div>

                <div class="form-group">
                    <label>Title <span class="req">*</span></label>
                    <input type="text" bind:value={formTitle} required placeholder="{formType} title" />
                </div>

                <div class="form-group">
                    <label>Due Date</label>
                    <input type="datetime-local" bind:value={formDueDate} />
                </div>

                {#if formType === 'Task'}
                    <div class="form-group">
                        <label>Priority</label>
                        <div class="priority-selector">
                            <button type="button" class="prio-btn low" class:selected={formPriority === 'low'} on:click={() => formPriority = 'low'}>Low</button>
                            <button type="button" class="prio-btn med" class:selected={formPriority === 'med'} on:click={() => formPriority = 'med'}>Med</button>
                            <button type="button" class="prio-btn high" class:selected={formPriority === 'high'} on:click={() => formPriority = 'high'}>High</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Estimated Minutes</label>
                        <input type="number" bind:value={formEstimatedMinutes} min="0" placeholder="e.g. 30" />
                    </div>
                    <div class="form-group">
                        <label>Penalty Level</label>
                        <div class="penalty-selector">
                            {#each [0, 1, 2, 3] as lvl}
                                <button type="button" class="penalty-opt" class:selected={formPenaltyLevel === lvl} on:click={() => formPenaltyLevel = lvl}>
                                    <span class="penalty-num">{lvl}</span>
                                    <span class="penalty-lbl">{penaltyLabel(lvl)}</span>
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}

                <div class="form-actions">
                    <button type="button" class="btn-cancel" on:click={() => showNewModal = false}>Cancel</button>
                    <button type="submit" class="btn-submit">Create</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- ═══ DETAIL MODAL ═══ -->
{#if showDetailModal && detailNode}
    <div class="modal-backdrop" on:click={() => showDetailModal = false}>
        <div class="modal detail-modal" on:click|stopPropagation>
            <div class="modal-header">
                <h2>Edit Task</h2>
                <div class="modal-header-actions">
                    <button class="delete-btn" on:click={deleteNode} title="Delete">
                        <Trash2 size={16} />
                    </button>
                    <button class="modal-close" on:click={() => showDetailModal = false}>
                        <X size={18} />
                    </button>
                </div>
            </div>
            <form on:submit|preventDefault={saveDetail}>
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" bind:value={editTitle} required />
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea bind:value={editDescription} rows="3" placeholder="Add description..."></textarea>
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <div class="priority-selector">
                        <button type="button" class="prio-btn low" class:selected={editPriority === 'low'} on:click={() => editPriority = 'low'}>Low</button>
                        <button type="button" class="prio-btn med" class:selected={editPriority === 'med'} on:click={() => editPriority = 'med'}>Med</button>
                        <button type="button" class="prio-btn high" class:selected={editPriority === 'high'} on:click={() => editPriority = 'high'}>High</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="datetime-local" bind:value={editDueDate} />
                </div>
                <div class="form-group">
                    <label>Estimated Minutes</label>
                    <input type="number" bind:value={editEstimatedMinutes} min="0" />
                </div>
                <div class="form-group">
                    <label>Penalty Level</label>
                    <div class="penalty-selector">
                        {#each [0, 1, 2, 3] as lvl}
                            <button type="button" class="penalty-opt" class:selected={editPenaltyLevel === lvl} on:click={() => editPenaltyLevel = lvl}>
                                <span class="penalty-num">{lvl}</span>
                                <span class="penalty-lbl">{penaltyLabel(lvl)}</span>
                            </button>
                        {/each}
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel" on:click={() => showDetailModal = false}>Cancel</button>
                    <button type="submit" class="btn-submit">Save</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<style>
    /* ═══ PAGE LAYOUT ═══ */
    .tasks-page {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        overflow: hidden;
        background: var(--bg-base);
    }

    .tasks-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 28px 16px;
        flex-shrink: 0;
        border-bottom: 1px solid var(--border);
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .tasks-header h1 {
        font-family: var(--font-sans);
        font-size: 22px;
        font-weight: 600;
        color: var(--text-primary);
    }

    .pin-count {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--accent);
        background: var(--accent-dim);
        padding: 4px 10px;
        border-radius: 12px;
        border: 1px solid rgba(139, 92, 246, 0.12);
    }

    .new-node-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: var(--accent);
        color: #fff;
        border: none;
        padding: 8px 16px;
        border-radius: var(--radius-sm);
        font-family: var(--font-sans);
        font-weight: 500;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .new-node-btn:hover {
        background: var(--accent-hover);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }

    /* ═══ CANVAS ═══ */
    .canvas {
        flex: 1;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-behavior: smooth;
        position: relative;
        background: var(--bg-base);
        /* Diagonal grid texture */
        background-image:
            repeating-linear-gradient(
                45deg,
                transparent,
                transparent 19px,
                rgba(255, 255, 255, 0.03) 19px,
                rgba(255, 255, 255, 0.03) 20px
            ),
            repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 19px,
                rgba(255, 255, 255, 0.03) 19px,
                rgba(255, 255, 255, 0.03) 20px
            );
    }

    .canvas-inner {
        display: flex;
        gap: 0;
        padding: 24px 20px;
        height: 100%;
        position: relative;
    }

    /* ═══ SVG ARROWS ═══ */
    .arrow-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
    }

    /* ═══ COLUMNS ═══ */
    .column {
        flex-shrink: 0;
        width: 220px;
        margin-right: 60px;
        display: flex;
        flex-direction: column;
        position: relative;
        z-index: 2;
    }

    .pinned-column {
        border-right: 1px solid var(--border);
        padding-right: 16px;
        margin-right: 44px;
    }

    .column-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--text-tertiary);
        text-transform: uppercase;
        letter-spacing: 1.2px;
        margin-bottom: 16px;
        padding-left: 4px;
    }

    .column-scroll {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding-right: 4px;
        padding-bottom: 20px;
    }

    .col-loading {
        display: flex;
        gap: 6px;
        align-items: center;
        justify-content: center;
        padding: 40px 0;
    }

    .pulse-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--accent);
        animation: pulse 1s ease-in-out infinite;
    }
    .pulse-dot.d2 { animation-delay: 0.15s; }
    .pulse-dot.d3 { animation-delay: 0.3s; }

    @keyframes pulse {
        0%, 100% { opacity: 0.2; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1.2); }
    }

    .col-empty {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--text-tertiary);
        text-align: center;
        padding: 40px 0;
    }

    /* ═══ CARD BASE ═══ */
    .card {
        width: 200px;
        height: 120px;
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        padding: 12px;
        position: relative;
        cursor: pointer;
        transition: all 0.25s ease;
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        overflow: visible;
    }

    .card:hover {
        border-color: var(--border-active);
    }

    .card.group-card:hover {
        transform: scale(1.03);
    }

    .card.task-card:hover {
        transform: scale(1.02);
    }

    .card.active {
        background: var(--accent-dim);
        border-left: 3px solid var(--accent);
    }

    .card.dragging {
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
        opacity: 0.95;
    }

    .card.pinned-card {
        border: 1px solid rgba(139, 92, 246, 0.15);
        box-shadow: 0 0 12px rgba(139, 92, 246, 0.06);
    }

    /* ═══ DRAG HANDLE ═══ */
    .drag-handle {
        position: absolute;
        top: 4px;
        left: 4px;
        background: none;
        border: none;
        color: var(--text-tertiary);
        cursor: grab;
        padding: 2px;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 5;
    }
    .card:hover .drag-handle {
        opacity: 0.6;
    }
    .drag-handle:hover {
        opacity: 1 !important;
        color: var(--text-secondary);
    }
    .drag-handle:active {
        cursor: grabbing;
    }

    /* ═══ PIN BUTTON ═══ */
    .pin-btn {
        position: absolute;
        top: 6px;
        right: 6px;
        background: none;
        border: none;
        color: var(--text-tertiary);
        cursor: pointer;
        padding: 3px;
        border-radius: 4px;
        opacity: 0;
        transition: all 0.2s;
        z-index: 5;
    }
    .pin-btn.visible,
    .card:hover .pin-btn {
        opacity: 1;
    }
    .pin-btn:hover {
        color: var(--accent);
        background: var(--accent-dim);
    }
    .pin-btn.pinned-active {
        color: var(--accent);
        opacity: 1;
    }

    /* ═══ GROUP CARD ═══ */
    .card-icon {
        color: var(--accent);
        margin-bottom: 2px;
    }

    .card-title {
        font-family: var(--font-sans);
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
    }
    .card-title.strikethrough {
        text-decoration: line-through;
        color: var(--text-secondary);
    }

    .card-date {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--text-secondary);
        margin-top: auto;
    }

    .child-badge {
        position: absolute;
        top: 8px;
        right: 28px;
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-size: 10px;
        padding: 1px 7px;
        border-radius: 10px;
    }

    .progress-track {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--bg-elevated);
        border-radius: 0 0 var(--radius-md) var(--radius-md);
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: var(--accent);
        transition: width 0.4s ease;
        border-radius: 0 0 0 var(--radius-md);
    }

    /* ═══ TASK CARD ═══ */
    .checkbox {
        flex-shrink: 0;
        width: 16px;
        height: 16px;
        border-radius: 4px;
        border: 1.5px solid var(--border-active);
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: transparent;
        transition: all 0.2s;
        padding: 0;
        margin-bottom: 4px;
    }
    .checkbox.checked {
        background: var(--accent);
        border-color: var(--accent);
        color: #fff;
    }
    .checkbox svg {
        width: 10px;
        height: 10px;
    }

    .priority-pill {
        display: inline-block;
        font-family: var(--font-mono);
        font-size: 9px;
        padding: 1px 7px;
        border-radius: 8px;
        text-transform: lowercase;
        letter-spacing: 0.3px;
        width: fit-content;
        align-self: flex-start;
    }
    .priority-high { background: rgba(244, 63, 94, 0.1); color: var(--red); }
    .priority-med { background: rgba(251, 191, 36, 0.1); color: var(--amber); }
    .priority-low { background: rgba(52, 211, 153, 0.1); color: var(--green); }

    .card-est {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--text-tertiary);
        position: absolute;
        bottom: 8px;
        right: 10px;
    }

    .penalty-badge {
        font-family: var(--font-mono);
        font-size: 9px;
        padding: 1px 6px;
        border-radius: 6px;
        background: rgba(244, 63, 94, 0.08);
        color: var(--red);
        position: absolute;
        bottom: 8px;
        left: 12px;
    }

    /* ═══ HOVER OVERLAY ═══ */
    .hover-overlay {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 4px;
        background: var(--bg-elevated);
        border: 1px solid var(--border-active);
        border-radius: var(--radius-sm);
        padding: 8px 10px;
        display: flex;
        flex-direction: column;
        gap: 3px;
        z-index: 20;
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--text-secondary);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        animation: fadeSlideIn 0.15s ease;
    }

    .desc-text {
        font-family: var(--font-sans);
        font-size: 11px;
        line-height: 1.4;
        color: var(--text-secondary);
    }

    @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* ═══ MODALS ═══ */
    .modal-backdrop {
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 200;
        animation: fadeIn 0.15s ease;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .modal {
        background: var(--bg-elevated);
        border: 1px solid var(--border-active);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 420px;
        padding: 24px;
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
        animation: modalSlide 0.2s ease;
    }

    .detail-modal {
        max-width: 460px;
        max-height: 85vh;
        overflow-y: auto;
    }

    @keyframes modalSlide {
        from { opacity: 0; transform: translateY(12px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .modal-header h2 {
        font-family: var(--font-sans);
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
    }

    .modal-header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .modal-close {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.15s;
    }
    .modal-close:hover {
        color: var(--text-primary);
        background: var(--bg-hover);
    }

    .delete-btn {
        background: none;
        border: none;
        color: var(--text-tertiary);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.15s;
    }
    .delete-btn:hover {
        color: var(--red);
        background: rgba(244, 63, 94, 0.08);
    }

    /* ═══ FORM ═══ */
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 16px;
    }

    .toggles {
        flex-direction: row;
        background: var(--bg-surface);
        padding: 4px;
        border-radius: var(--radius-md);
        border: 1px solid var(--border);
    }
    .toggle-btn {
        flex: 1;
        padding: 8px;
        background: transparent;
        border: none;
        color: var(--text-secondary);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: 13px;
        transition: all 0.2s;
    }
    .toggle-btn.active {
        background: var(--bg-elevated);
        color: var(--text-primary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    }

    .form-group label {
        font-family: var(--font-sans);
        font-size: 12px;
        color: var(--text-secondary);
        letter-spacing: 0.3px;
    }
    .form-group .req { color: var(--red); }

    input, select, textarea {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        color: var(--text-primary);
        padding: 10px 12px;
        border-radius: var(--radius-sm);
        font-family: var(--font-sans);
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s;
        width: 100%;
    }
    textarea {
        resize: vertical;
        min-height: 60px;
    }
    input:focus, select:focus, textarea:focus {
        border-color: var(--accent);
    }

    /* Priority selector */
    .priority-selector {
        display: flex;
        gap: 6px;
    }
    .prio-btn {
        flex: 1;
        padding: 6px 0;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .prio-btn.low.selected { background: rgba(52, 211, 153, 0.1); color: var(--green); border-color: rgba(52, 211, 153, 0.3); }
    .prio-btn.med.selected { background: rgba(251, 191, 36, 0.1); color: var(--amber); border-color: rgba(251, 191, 36, 0.3); }
    .prio-btn.high.selected { background: rgba(244, 63, 94, 0.1); color: var(--red); border-color: rgba(244, 63, 94, 0.3); }

    /* Penalty selector */
    .penalty-selector {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
    }
    .penalty-opt {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: 6px 4px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s;
    }
    .penalty-opt.selected {
        border-color: var(--accent);
        background: var(--accent-dim);
        color: var(--text-primary);
    }
    .penalty-num {
        font-family: var(--font-mono);
        font-size: 14px;
        font-weight: 600;
    }
    .penalty-lbl {
        font-family: var(--font-mono);
        font-size: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 24px;
    }

    .btn-cancel {
        background: transparent;
        border: 1px solid var(--border);
        color: var(--text-primary);
        padding: 8px 16px;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: 13px;
        transition: all 0.15s;
    }
    .btn-cancel:hover {
        border-color: var(--border-active);
        background: var(--bg-hover);
    }

    .btn-submit {
        background: var(--accent);
        border: none;
        color: #fff;
        padding: 8px 20px;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: 13px;
        font-weight: 500;
        transition: all 0.15s;
    }
    .btn-submit:hover {
        background: var(--accent-hover);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }
</style>
