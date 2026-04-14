<script>
    import { onMount, tick } from 'svelte';
    import { fade } from 'svelte/transition';
    import { Plus, X, Trash2, Zap } from 'lucide-svelte';

    const API_BASE = 'http://localhost:8000';

    // ── STATE ──────────────────────────────────────────────────
    let nodes = [];
    let selectedId = null;
    let visibleNodeIds = new Set();
    let expandedIds = new Set();
    let dragGroup = [];
    let panX = 0, panY = 0;
    let zoom = 1;
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let contextMenu = { visible: false, x: 0, y: 0, nodeId: null };
    let sidePanel = { open: false, node: null };
    let pinnedIds = new Set();

    // New roadmap modal
    let showNewModal = false;
    let formTitle = '';
    let formDescription = '';
    let formDueDate = '';
    let formDirection = 'tb';

    // Side panel edit form
    let editTitle = '';
    let editDescription = '';
    let editDueDate = '';

    // Drag state
    let dragNode = null;
    let dragStart = { x: 0, y: 0 };
    let dragNodeStart = { x: 0, y: 0 };

    // Hover state
    let hoveredNodeId = null;

    // Canvas dimensions
    let svgEl;
    let containerEl;
    let canvasWidth = 0;
    let canvasHeight = 0;

    // Node card constants
    const CARD_W = 200;
    const CARD_MIN_H = 80;
    const CHILD_ROW_H = 28;
    const HEADER_H = 42;

    // ── DERIVED ────────────────────────────────────────────────
    $: rootNodes = nodes.filter(n => n.parent_id === null);
    // Concern 3: sort children by order_index so reorder is reflected everywhere
    function childrenOf(parentId) {
        return nodes
            .filter(n => n.parent_id === parentId)
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }
    function getNode(id) {
        return nodes.find(n => n.id === id);
    }

    $: visibleNodes = nodes.filter(n => visibleNodeIds.has(n.id));

    function cardHeight(node) {
        return CARD_MIN_H;
    }

    function recomputeVisibleNodes() {
        let newVis = new Set();
        nodes.filter(n => n.parent_id === null).forEach(n => newVis.add(n.id));

        let changed = true;
        while(changed) {
            changed = false;
            for (let n of nodes) {
                if (n.parent_id !== null && newVis.has(n.parent_id) && expandedIds.has(n.parent_id)) {
                    if (!newVis.has(n.id)) {
                        newVis.add(n.id);
                        changed = true;
                    }
                }
            }
        }
        visibleNodeIds = newVis;
    }

    function nodeDirection(node) {
        // Walk up tree to find root's direction
        let current = node;
        while (current && current.parent_id !== null) {
            current = getNode(current.parent_id);
        }
        return current?.task_type || 'tb';
    }

    // ── LIFECYCLE ──────────────────────────────────────────────
    onMount(() => {
        fetchAllNodes();
        const ro = new ResizeObserver(() => {
            if (svgEl) {
                canvasWidth = svgEl.clientWidth;
                canvasHeight = svgEl.clientHeight;
            }
        });
        // Defer observation to next tick so svgEl is bound
        requestAnimationFrame(() => {
            if (svgEl) {
                ro.observe(svgEl);
                canvasWidth = svgEl.clientWidth;
                canvasHeight = svgEl.clientHeight;
            }
        });

        function handleClickOutside(e) {
            if (contextMenu.visible) {
                contextMenu = { ...contextMenu, visible: false };
            }
        }
        window.addEventListener('click', handleClickOutside);

        return () => {
            ro.disconnect();
            window.removeEventListener('click', handleClickOutside);
        };
    });

    // ── API ────────────────────────────────────────────────────
    async function fetchAllNodes() {
        try {
            const r = await fetch(`${API_BASE}/tasks/all`);
            if (!r.ok) throw new Error('fetch failed');
            nodes = await r.json();
            recomputeVisibleNodes();
        } catch (e) {
            console.error('Failed to fetch nodes:', e);
            nodes = [];
        }
    }

    async function createNode(payload) {
        try {
            const r = await fetch(`${API_BASE}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!r.ok) throw new Error('create failed');
            const created = await r.json();
            nodes = [...nodes, created];
            recomputeVisibleNodes();
            return created;
        } catch (e) {
            console.error('Create failed:', e);
            return null;
        }
    }

    async function patchNode(id, updates) {
        try {
            const r = await fetch(`${API_BASE}/tasks/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!r.ok) throw new Error('patch failed');
            nodes = nodes.map(n => n.id === id ? { ...n, ...updates } : n);
        } catch (e) {
            console.error('Patch failed:', e);
        }
    }

    async function deleteNode(id) {
        try {
            const r = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
            if (!r.ok) throw new Error('delete failed');
            // Remove node and all descendants
            const toRemove = new Set();
            function collectDescendants(parentId) {
                toRemove.add(parentId);
                nodes.filter(n => n.parent_id === parentId).forEach(c => collectDescendants(c.id));
            }
            collectDescendants(id);
            nodes = nodes.filter(n => !toRemove.has(n.id));
            pinnedIds.delete(id);
            pinnedIds = new Set(pinnedIds);
            recomputeVisibleNodes();
        } catch (e) {
            console.error('Delete failed:', e);
        }
    }

    // ── ZOOM & PAN ─────────────────────────────────────────────
    function handleWheel(e) {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
            // Pinch zoom (trackpad) or ctrl+scroll
            const delta = -e.deltaY * 0.005;
            const newZoom = Math.max(0.3, Math.min(2, zoom + delta));
            // Zoom toward cursor
            const rect = containerEl.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const scale = newZoom / zoom;
            panX = mx - scale * (mx - panX);
            panY = my - scale * (my - panY);
            zoom = newZoom;
        } else {
            // Regular scroll = pan
            panX -= e.deltaX;
            panY -= e.deltaY;
        }
    }

    function handleCanvasMouseDown(e) {
        if (e.button !== 0) return;
        // Only start panning if clicking on empty canvas (SVG itself or the background rect)
        if (e.target === svgEl || e.target.classList.contains('canvas-bg')) {
            isPanning = true;
            panStart = { x: e.clientX - panX, y: e.clientY - panY };
            selectedId = null;
            // Collapse all non-pinned expanded nodes
            let keepExpanded = new Set();
            for (let pid of pinnedIds) {
                let curr = pid;
                while (curr) {
                    keepExpanded.add(curr);
                    curr = getNode(curr)?.parent_id;
                }
                if (expandedIds.has(pid)) keepExpanded.add(pid);
            }
            expandedIds = keepExpanded;
            recomputeVisibleNodes();
        }
    }

    function handleCanvasMouseMove(e) {
        if (isPanning) {
            panX = e.clientX - panStart.x;
            panY = e.clientY - panStart.y;
        }
        if (dragNode) {
            const dx = (e.clientX - dragStart.x) / zoom;
            const dy = (e.clientY - dragStart.y) / zoom;
            nodes = nodes.map(n => {
                const dg = dragGroup.find(d => d.node.id === n.id);
                if (dg) {
                    return { ...n, pos_x: dg.startX + dx, pos_y: dg.startY + dy };
                }
                return n;
            });
        }
    }

    function handleCanvasMouseUp(e) {
        if (isPanning) {
            isPanning = false;
        }
        if (dragNode) {
            const parentIdForReorder = dragNode.parent_id;
            // Promise.all to save all elements in the drag group
            Promise.all(dragGroup.map(dg => {
                const node = nodes.find(n => n.id === dg.node.id);
                return patchNode(node.id, { pos_x: node.pos_x, pos_y: node.pos_y });
            }));
            if (parentIdForReorder !== null) {
                reorderSiblings(parentIdForReorder);
            }
            dragNode = null;
            dragGroup = [];
        }
    }

    // ── SIBLING REORDER (Concern 3) ───────────────────────────
    async function reorderSiblings(parentId) {
        // Get all siblings (nodes with same parent_id)
        const siblings = nodes
            .filter(n => n.parent_id === parentId)
            .sort((a, b) => (a.pos_y || 0) - (b.pos_y || 0));

        if (siblings.length === 0) return;

        // Assign new order_index based on sorted Y position
        const updates = [];
        siblings.forEach((sib, i) => {
            if (sib.order_index !== i) {
                updates.push({ id: sib.id, order_index: i });
            }
        });

        if (updates.length === 0) return;

        // Optimistic local update for immediate reactivity
        nodes = nodes.map(n => {
            const upd = updates.find(u => u.id === n.id);
            return upd ? { ...n, order_index: upd.order_index } : n;
        });

        // Persist each sibling's new order_index via PATCH
        await Promise.all(
            updates.map(u => patchNode(u.id, { order_index: u.order_index }))
        );
    }

    // ── NODE DRAG ──────────────────────────────────────────────
    function handleNodeMouseDown(e, node) {
        if (e.button !== 0) return;
        e.stopPropagation();

        selectedId = node.id;

        // Auto-collapse unpinned, keep ancestors and pinned visible
        let keepExpanded = new Set();
        let current = node.parent_id;
        while (current) {
            keepExpanded.add(current);
            current = getNode(current)?.parent_id;
        }
        for (let pid of pinnedIds) {
            let curr = pid;
            while (curr) {
                keepExpanded.add(curr);
                curr = getNode(curr)?.parent_id;
            }
            if (expandedIds.has(pid)) keepExpanded.add(pid);
        }
        keepExpanded.add(node.id);
        expandedIds = keepExpanded;

        // Automatically configure target positions for unpositioned children
        const kids = childrenOf(node.id);
        const dir = nodeDirection(node);
        let patched = false;
        kids.forEach((child, i) => {
            if ((!child.pos_x && !child.pos_y) || (child.pos_x === 0 && child.pos_y === 0)) {
                if (dir === 'lr') {
                    child.pos_x = (node.pos_x || 0) + 240;
                    child.pos_y = (node.pos_y || 0) + i * 90;
                } else {
                    child.pos_x = node.pos_x || 0;
                    child.pos_y = (node.pos_y || 0) + 120 + i * 90;
                }
                patchNode(child.id, {pos_x: child.pos_x, pos_y: child.pos_y});
                patched = true;
            }
        });
        if (patched) nodes = [...nodes];
        recomputeVisibleNodes();

        // Drag Setup: Move parent and all its currently visible descendants
        function getVisibleDesc(id) {
            let desc = [];
            let c = nodes.filter(n => n.parent_id === id && visibleNodeIds.has(n.id));
            for (let x of c) {
                desc.push(x);
                desc = desc.concat(getVisibleDesc(x.id));
            }
            return desc;
        }
        let draggedNodes = [node, ...getVisibleDesc(node.id)];
        dragGroup = draggedNodes.map(n => ({
            node: n,
            startX: n.pos_x || 0,
            startY: n.pos_y || 0
        }));

        dragNode = node;
        dragStart = { x: e.clientX, y: e.clientY };
    }

    // ── CONTEXT MENU ───────────────────────────────────────────
    function handleContextMenu(e, node) {
        e.preventDefault();
        e.stopPropagation();
        contextMenu = {
            visible: true,
            x: e.clientX,
            y: e.clientY,
            nodeId: node.id
        };
    }

    function ctxEdit() {
        const node = getNode(contextMenu.nodeId);
        if (node) openSidePanel(node);
        contextMenu = { ...contextMenu, visible: false };
    }

    async function ctxDelete() {
        const id = contextMenu.nodeId;
        contextMenu = { ...contextMenu, visible: false };
        if (confirm('Delete this node and all its children?')) {
            if (sidePanel.open && sidePanel.node?.id === id) {
                sidePanel = { open: false, node: null };
            }
            await deleteNode(id);
        }
    }

    function ctxPin() {
        const id = contextMenu.nodeId;
        if (pinnedIds.has(id)) {
            pinnedIds.delete(id);
        } else {
            pinnedIds.add(id);
        }
        pinnedIds = new Set(pinnedIds);
        contextMenu = { ...contextMenu, visible: false };
    }

    // ── SIDE PANEL ─────────────────────────────────────────────
    function openSidePanel(node) {
        editTitle = node.title || '';
        editDescription = node.description || '';
        editDueDate = node.due_date ? node.due_date.slice(0, 10) : '';
        sidePanel = { open: true, node };
    }

    function closeSidePanel() {
        sidePanel = { open: false, node: null };
    }

    async function saveSidePanel() {
        if (!sidePanel.node) return;
        const updates = { title: editTitle, description: editDescription || null };
        if (editDueDate) updates.due_date = editDueDate;
        else updates.due_date = null;
        await patchNode(sidePanel.node.id, updates);
        sidePanel = { open: true, node: { ...sidePanel.node, ...updates } };
    }

    async function deleteSidePanelNode() {
        if (!sidePanel.node) return;
        if (confirm('Delete this node and all its children?')) {
            const id = sidePanel.node.id;
            closeSidePanel();
            await deleteNode(id);
        }
    }

    // ── CHECKBOXES ─────────────────────────────────────────────
    async function toggleDone(e, nodeId) {
        e.stopPropagation();
        const node = getNode(nodeId);
        if (!node) return;
        const newStatus = node.status === 'done' ? 'pending' : 'done';
        nodes = nodes.map(n => n.id === nodeId ? { ...n, status: newStatus } : n);
        await patchNode(nodeId, { status: newStatus });
    }

    async function toggleSession(e, nodeId) {
        e.stopPropagation();
        const node = getNode(nodeId);
        if (!node) return;
        const newVal = !node.session_queued;
        nodes = nodes.map(n => n.id === nodeId ? { ...n, session_queued: newVal } : n);
        await patchNode(nodeId, { session_queued: newVal });
    }

    // ── NEW ROADMAP ────────────────────────────────────────────
    async function submitNewRoadmap(e) {
        e.preventDefault();
        if (!formTitle.trim()) return;

        // Get live dimensions from svgEl, fallback to window
        const cw = svgEl ? svgEl.clientWidth : window.innerWidth;
        const ch = svgEl ? svgEl.clientHeight : window.innerHeight;

        const px = (cw / 2 - panX) / zoom - CARD_W / 2;
        const py = (ch / 2 - panY) / zoom - CARD_MIN_H / 2;

        const payload = {
            title: formTitle,
            parent_id: null,
            node_type: 'task',
            task_type: formDirection,
            pos_x: px,
            pos_y: py,
        };
        if (formDescription) payload.description = formDescription;
        if (formDueDate) payload.due_date = formDueDate;

        console.log('Creating node with:', payload);
        const created = await createNode(payload);
        console.log('Response from backend:', created);
        console.log('Nodes after update:', nodes);

        showNewModal = false;
        formTitle = '';
        formDescription = '';
        formDueDate = '';
        formDirection = 'tb';
    }

    // ── ADD CHILD ──────────────────────────────────────────────
    async function addChild(parentNode) {
        const siblings = childrenOf(parentNode.id);
        const dir = nodeDirection(parentNode);
        let px, py;
        if (dir === 'lr') {
            px = (parentNode.pos_x || 0) + 240;
            py = (parentNode.pos_y || 0) + siblings.length * 90;
        } else {
            px = parentNode.pos_x || 0;
            py = (parentNode.pos_y || 0) + 120 + siblings.length * 90;
        }

        const created = await createNode({
            title: '',
            parent_id: parentNode.id,
            node_type: 'task',
            task_type: parentNode.task_type,
            pos_x: px,
            pos_y: py,
        });
        if (created) {
            openSidePanel(created);
        }
    }

    // ── ARROWS ─────────────────────────────────────────────────
    function getArrows(nodeList) {
        const arrows = [];
        for (const node of nodeList) {
            if (node.parent_id === null) continue;
            const parent = getNode(node.parent_id);
            if (!parent || !visibleNodeIds.has(parent.id)) continue;

            const dir = nodeDirection(node);
            const pH = CARD_MIN_H;
            const cH = CARD_MIN_H;

            let d;
            if (dir === 'lr') {
                const x1 = (parent.pos_x || 0) + CARD_W;
                const y1 = (parent.pos_y || 0) + pH / 2;
                const x2 = node.pos_x || 0;
                const y2 = (node.pos_y || 0) + cH / 2;
                const cp = 50;
                d = `M ${x1} ${y1} C ${x1 + cp} ${y1} ${x2 - cp} ${y2} ${x2} ${y2}`;
            } else {
                const x1 = (parent.pos_x || 0) + CARD_W / 2;
                const y1 = (parent.pos_y || 0) + pH;
                const x2 = (node.pos_x || 0) + CARD_W / 2;
                const y2 = node.pos_y || 0;
                const cp = 50;
                d = `M ${x1} ${y1} C ${x1} ${y1 + cp} ${x2} ${y2 - cp} ${x2} ${y2}`;
            }

            arrows.push({ d, id: `${parent.id}-${node.id}` });
        }
        return arrows;
    }

    $: arrows = getArrows(visibleNodes);

    // ── HELPERS ────────────────────────────────────────────────
    function formatDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        return `${mo}/${da}`;
    }
</script>

<div class="tasks-page" bind:this={containerEl}>
    <!-- Top bar -->
    <header class="tasks-header">
        <div class="header-left">
            <h1>Roadmap</h1>
            {#if rootNodes.length > 0}
                <span class="roadmap-count">{rootNodes.length} roadmap{rootNodes.length !== 1 ? 's' : ''}</span>
            {/if}
        </div>
        <button class="new-roadmap-btn" on:click={() => showNewModal = true}>
            <Plus size={14} />
            New Roadmap
        </button>
    </header>

    <!-- SVG Canvas -->
    <div class="canvas-container">
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <svg
            class="canvas-svg"
            bind:this={svgEl}
            on:wheel|preventDefault={handleWheel}
            on:mousedown={handleCanvasMouseDown}
            on:mousemove={handleCanvasMouseMove}
            on:mouseup={handleCanvasMouseUp}
            on:mouseleave={handleCanvasMouseUp}
        >
            <rect class="canvas-bg" width="100%" height="100%" fill="var(--bg-base)" />

            <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                    <polygon points="0 0, 8 3, 0 6" fill="var(--text-tertiary)" fill-opacity="0.6" />
                </marker>
            </defs>

            <g transform="translate({panX},{panY}) scale({zoom})">
                <!-- Arrows -->
                {#each arrows as arrow (arrow.id)}
                    <path
                        d={arrow.d}
                        fill="none"
                        stroke="var(--text-tertiary)"
                        stroke-width="1.5"
                        stroke-opacity="0.6"
                        marker-end="url(#arrowhead)"
                    />
                {/each}

                <!-- Nodes -->
                {#each visibleNodes as node (node.id)}
                    {@const kids = childrenOf(node.id)}
                    {@const h = cardHeight(node)}
                    {@const isSelected = selectedId === node.id}
                    {@const isPinned = pinnedIds.has(node.id)}
                    {@const isHovered = hoveredNodeId === node.id}
                    {@const dir = nodeDirection(node)}
                    {@const isExpanded = expandedIds.has(node.id)}
                    <foreignObject
                        x={node.pos_x || 0}
                        y={node.pos_y || 0}
                        width={CARD_W}
                        height={CARD_MIN_H + 40}
                        style="overflow: visible;"
                        in:fade={{ duration: 250 }}
                    >
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div
                            class="node-card"
                            class:selected={isSelected}
                            class:pinned={isPinned}
                            class:done={node.status === 'done'}
                            style="width: {CARD_W}px; min-height: {CARD_MIN_H}px;"
                            on:mousedown={(e) => handleNodeMouseDown(e, node)}
                            on:contextmenu={(e) => handleContextMenu(e, node)}
                            on:mouseenter={() => hoveredNodeId = node.id}
                            on:mouseleave={() => hoveredNodeId = null}
                        >
                            <!-- Header row -->
                            <div class="node-header">
                                <!-- Done checkbox -->
                                <button class="done-ring" class:checked={node.status === 'done'} on:mousedown|stopPropagation on:click={(e) => toggleDone(e, node.id)}>
                                    {#if node.status === 'done'}
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    {/if}
                                </button>

                                <!-- Title -->
                                <span class="node-title" class:strikethrough={node.status === 'done'}>
                                    {node.title || 'Untitled'}
                                </span>

                                <!-- Session checkbox -->
                                <button class="session-square" class:queued={node.session_queued} on:mousedown|stopPropagation on:click={(e) => toggleSession(e, node.id)}>
                                    {#if node.session_queued}
                                        <Zap size={10} />
                                    {/if}
                                </button>
                            </div>

                            <!-- Add child button on hover if expanded or has no kids yet -->
                            {#if isHovered && (kids.length === 0 || isExpanded)}
                                <button
                                    class="add-child-btn"
                                    class:bottom={dir === 'tb'}
                                    class:right-side={dir === 'lr'}
                                    on:mousedown|stopPropagation
                                    on:click|stopPropagation={() => addChild(node)}
                                    title="Add child node"
                                >
                                    <Plus size={12} />
                                </button>
                            {/if}

                            <!-- Hover info tooltip -->
                            {#if isHovered && (node.description || node.due_date)}
                                <div class="info-tooltip">
                                    {#if node.description}
                                        <p class="tooltip-desc">{node.description}</p>
                                    {/if}
                                    {#if node.due_date}
                                        <span class="tooltip-date">Due: {formatDate(node.due_date)}</span>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </foreignObject>
                {/each}
            </g>
        </svg>
    </div>
</div>

<!-- ═══ CONTEXT MENU ═══ -->
{#if contextMenu.visible}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="ctx-menu" style="left: {contextMenu.x}px; top: {contextMenu.y}px;" on:click|stopPropagation>
        <button class="ctx-item" on:click={ctxEdit}>Edit</button>
        <button class="ctx-item danger" on:click={ctxDelete}>Delete</button>
        <button class="ctx-item" on:click={ctxPin}>
            {pinnedIds.has(contextMenu.nodeId) ? 'Unpin' : 'Pin'}
        </button>
    </div>
{/if}

<!-- ═══ SIDE PANEL ═══ -->
<div class="side-panel" class:open={sidePanel.open}>
    <div class="panel-header">
        <h3>Edit Node</h3>
        <button class="panel-close" on:click={closeSidePanel}>
            <X size={16} />
        </button>
    </div>
    <div class="panel-body">
        <div class="form-group">
            <label>Title</label>
            <input type="text" bind:value={editTitle} placeholder="Node title" />
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea bind:value={editDescription} rows="3" placeholder="Optional description..."></textarea>
        </div>
        <div class="form-group">
            <label>Due Date</label>
            <input type="date" bind:value={editDueDate} />
        </div>
    </div>
    <div class="panel-actions">
        <button class="btn-save" on:click={saveSidePanel}>Save</button>
        <button class="btn-delete" on:click={deleteSidePanelNode}>
            <Trash2 size={14} />
            Delete
        </button>
    </div>
</div>

<!-- ═══ NEW ROADMAP MODAL ═══ -->
{#if showNewModal}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-backdrop" on:click={() => showNewModal = false}>
        <div class="modal" on:click|stopPropagation>
            <div class="modal-header">
                <h2>New Roadmap</h2>
                <button class="modal-close" on:click={() => showNewModal = false}>
                    <X size={18} />
                </button>
            </div>
            <form on:submit={submitNewRoadmap}>
                <div class="form-group">
                    <label>Title <span class="req">*</span></label>
                    <input type="text" bind:value={formTitle} required placeholder="Roadmap title" />
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea bind:value={formDescription} rows="2" placeholder="Optional description..."></textarea>
                </div>
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="date" bind:value={formDueDate} />
                </div>
                <div class="form-group">
                    <label>Direction</label>
                    <div class="dir-toggle">
                        <button type="button" class="dir-btn" class:active={formDirection === 'tb'} on:click={() => formDirection = 'tb'}>
                            ↓ Top-to-Bottom
                        </button>
                        <button type="button" class="dir-btn" class:active={formDirection === 'lr'} on:click={() => formDirection = 'lr'}>
                            → Left-to-Right
                        </button>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel" on:click={() => showNewModal = false}>Cancel</button>
                    <button type="submit" class="btn-submit">Create</button>
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

    .roadmap-count {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--text-secondary);
        background: var(--bg-elevated);
        padding: 3px 10px;
        border-radius: 10px;
        border: 1px solid var(--border);
    }

    .new-roadmap-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: var(--accent);
        color: var(--white);
        border: none;
        padding: 8px 16px;
        border-radius: var(--radius-sm);
        font-family: var(--font-sans);
        font-weight: 500;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .new-roadmap-btn:hover {
        background: var(--accent-hover);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px var(--accent-glow);
    }

    /* ═══ CANVAS ═══ */
    .canvas-container {
        flex: 1;
        overflow: hidden;
        position: relative;
        background: var(--bg-base);
    }

    .canvas-svg {
        width: 100%;
        height: 100%;
        display: block;
        cursor: grab;
        user-select: none;
    }
    .canvas-svg:active {
        cursor: grabbing;
    }

    /* ═══ NODE CARD ═══ */
    .node-card {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 0;
        cursor: grab;
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        position: relative;
        overflow: visible;
        font-family: var(--font-sans);
    }
    .node-card:active {
        cursor: grabbing;
    }
    .node-card:hover {
        border-color: var(--border-active);
    }
    .node-card.selected {
        transform: scale(1.06);
        box-shadow: 0 8px 32px var(--accent-glow);
        z-index: 10;
    }
    .node-card.pinned {
        border-color: var(--accent);
    }
    .node-card.done {
        opacity: 0.7;
    }

    /* ═══ NODE HEADER ═══ */
    .node-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 10px 10px 10px;
        min-height: 42px;
    }

    .node-title {
        flex: 1;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.3;
    }
    .node-title.strikethrough {
        text-decoration: line-through;
        color: var(--text-secondary);
    }

    /* ═══ DONE RING CHECKBOX ═══ */
    .done-ring {
        flex-shrink: 0;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 1.5px solid var(--border-active);
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: transparent;
        transition: all 0.2s ease;
        padding: 0;
    }
    .done-ring:hover {
        border-color: var(--green);
    }
    .done-ring.checked {
        background: var(--green);
        border-color: var(--green);
        color: var(--white);
    }
    .done-ring svg {
        width: 10px;
        height: 10px;
    }

    /* ═══ SESSION SQUARE CHECKBOX ═══ */
    .session-square {
        flex-shrink: 0;
        width: 18px;
        height: 18px;
        border-radius: 4px;
        border: 1.5px solid var(--border-active);
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: transparent;
        transition: all 0.2s ease;
        padding: 0;
    }
    .session-square:hover {
        border-color: var(--accent);
    }
    .session-square.queued {
        background: var(--accent);
        border-color: var(--accent);
        color: var(--white);
    }

    /* ═══ ADD CHILD BUTTON ═══ */
    .add-child-btn {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--accent);
        border: none;
        color: var(--white);
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 20;
        box-shadow: 0 2px 8px var(--accent-glow);
        animation: fadeIn 0.15s ease;
    }
    .add-child-btn.bottom {
        bottom: -11px;
        left: 50%;
        transform: translateX(-50%);
    }
    .add-child-btn.right-side {
        right: -11px;
        top: 50%;
        transform: translateY(-50%);
    }
    .add-child-btn:hover {
        transform: translateX(-50%) scale(1.15);
        box-shadow: 0 4px 12px var(--accent-glow);
    }
    .add-child-btn.right-side:hover {
        transform: translateY(-50%) scale(1.15);
    }

    /* ═══ INFO TOOLTIP ═══ */
    .info-tooltip {
        position: absolute;
        top: 0;
        left: calc(100% + 8px);
        width: 180px;
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 10px 12px;
        z-index: 30;
        animation: slideInRight 0.2s ease;
        pointer-events: none;
    }
    .tooltip-desc {
        font-size: 11px;
        color: var(--text-secondary);
        line-height: 1.4;
        margin: 0 0 6px 0;
    }
    .tooltip-date {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--text-tertiary);
    }

    @keyframes slideInRight {
        from { opacity: 0; transform: translateX(-8px); }
        to { opacity: 1; transform: translateX(0); }
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    /* ═══ CONTEXT MENU ═══ */
    .ctx-menu {
        position: fixed;
        z-index: 300;
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 4px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        animation: ctxScaleIn 0.12s ease;
        min-width: 120px;
    }
    @keyframes ctxScaleIn {
        from { opacity: 0; transform: scale(0.92); }
        to { opacity: 1; transform: scale(1); }
    }
    .ctx-item {
        display: block;
        width: 100%;
        padding: 0 12px;
        height: 32px;
        line-height: 32px;
        background: none;
        border: none;
        color: var(--text-primary);
        font-family: var(--font-sans);
        font-size: 12px;
        cursor: pointer;
        border-radius: 6px;
        text-align: left;
        transition: background 0.15s;
    }
    .ctx-item:hover {
        background: var(--bg-surface);
    }
    .ctx-item.danger:hover {
        background: color-mix(in srgb, var(--red) 10%, transparent);
        color: var(--red);
    }

    /* ═══ SIDE PANEL ═══ */
    .side-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 280px;
        height: 100vh;
        background: var(--bg-elevated);
        border-left: 1px solid var(--border);
        z-index: 250;
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.25s ease;
    }
    .side-panel.open {
        transform: translateX(0);
    }
    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid var(--border);
    }
    .panel-header h3 {
        font-family: var(--font-sans);
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
    }
    .panel-close {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.15s;
    }
    .panel-close:hover {
        color: var(--text-primary);
        background: var(--bg-hover);
    }
    .panel-body {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
    }
    .panel-actions {
        padding: 16px 20px;
        border-top: 1px solid var(--border);
        display: flex;
        gap: 8px;
    }
    .btn-save {
        flex: 1;
        background: var(--accent);
        border: none;
        color: var(--white);
        padding: 8px 16px;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: 13px;
        font-weight: 500;
        transition: all 0.15s;
    }
    .btn-save:hover {
        background: var(--accent-hover);
        box-shadow: 0 4px 12px var(--accent-glow);
    }
    .btn-delete {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: transparent;
        border: 1px solid color-mix(in srgb, var(--red) 20%, transparent);
        color: var(--red);
        padding: 8px 12px;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: 12px;
        transition: all 0.15s;
    }
    .btn-delete:hover {
        background: color-mix(in srgb, var(--red) 10%, transparent);
        border-color: color-mix(in srgb, var(--red) 40%, transparent);
    }

    /* ═══ MODAL ═══ */
    .modal-backdrop {
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 200;
        animation: fadeIn 0.15s ease;
    }

    .modal {
        background: var(--bg-elevated);
        border: 1px solid var(--border-active);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 400px;
        padding: 24px;
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
        animation: modalSlide 0.2s ease;
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

    /* ═══ FORMS ═══ */
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 16px;
    }
    .form-group label {
        font-family: var(--font-sans);
        font-size: 12px;
        color: var(--text-secondary);
        letter-spacing: 0.3px;
    }
    .form-group .req { color: var(--red); }

    input, textarea {
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
    input:focus, textarea:focus {
        border-color: var(--accent);
    }

    /* Direction toggle */
    .dir-toggle {
        display: flex;
        gap: 6px;
        background: var(--bg-surface);
        padding: 4px;
        border-radius: var(--radius-md);
        border: 1px solid var(--border);
    }
    .dir-btn {
        flex: 1;
        padding: 8px;
        background: transparent;
        border: none;
        color: var(--text-secondary);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: 12px;
        transition: all 0.2s;
    }
    .dir-btn.active {
        background: var(--bg-elevated);
        color: var(--text-primary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
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
        color: var(--white);
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
        box-shadow: 0 4px 12px var(--accent-glow);
    }
</style>
