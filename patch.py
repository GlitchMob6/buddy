import re
import sys

with open('/home/bwoy/buddy/src/routes/Tasks.svelte', 'r') as f:
    c = f.read()

# 1. State changes
c = c.replace("let sidePanel = { open: false, node: null };", """let cardPages = {};
    let editPopup = { open: false, node: null, x: 0, y: 0, origX: 0 };
    let editTitle = '';
    let editDescription = '';
    let editDueDate = '';
    let dateError = false;""")

c = c.replace("""    // Side panel edit form
    let editTitle = '';
    let editDescription = '';
    let editDueDate = '';""", """    let modalDateError = false;""")

c = c.replace("""    // Drag state
    let dragNode = null;
    let dragStart = { x: 0, y: 0 };
    let dragNodeStart = { x: 0, y: 0 };""", """    // Drag state
    let dragNode = null;
    let draggingId = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let dragStartScreenX = 0;
    let dragStartScreenY = 0;
    let isDragging = false;
    let rafId = null;""")

# 2. window event listener
c = c.replace("""        function handleClickOutside(e) {
            if (contextMenu.visible) {
                contextMenu = { ...contextMenu, visible: false };
            }
        }
        window.addEventListener('click', handleClickOutside);

        return () => {
            ro.disconnect();
            window.removeEventListener('click', handleClickOutside);
        };""", """        function handleClickOutside(e) {
            if (contextMenu.visible) {
                contextMenu = { ...contextMenu, visible: false };
            }
        }
        function handleKeydown(e) {
            if (e.key === 'Escape' && editPopup.open) {
                editPopup = { open: false, node: null, x: 0, y: 0, origX: 0 };
            }
        }
        window.addEventListener('click', handleClickOutside);
        window.addEventListener('keydown', handleKeydown);

        return () => {
            ro.disconnect();
            window.removeEventListener('click', handleClickOutside);
            window.removeEventListener('keydown', handleKeydown);
        };""")


# 3. Canvas Mouse Events
c_mousemove = """    function validateDateStr(d) {
        if (!d) return true;
        return /^\d{4}-\d{2}-\d{2}$/.test(d);
    }

    function handleCanvasMouseMove(e) {
        if (isPanning) {
            panX = e.clientX - panStart.x;
            panY = e.clientY - panStart.y;
        }
        if (isDragging) {
            e.preventDefault();
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                const dx = (e.clientX - dragStartScreenX) / zoom;
                const dy = (e.clientY - dragStartScreenY) / zoom;
                dragOffsetX = dx;
                dragOffsetY = dy;
            });
        }
    }"""

c_mouseup = """    function handleCanvasMouseUp(e) {
        document.body.style.userSelect = '';
        if (isPanning) {
            isPanning = false;
        }
        if (isDragging) {
            nodes = nodes.map(n => {
                const dg = dragGroup.find(d => d.node.id === n.id);
                if (dg) {
                    return { ...n, pos_x: dg.startX + dragOffsetX, pos_y: dg.startY + dragOffsetY };
                }
                return n;
            });
            const parentIdForReorder = dragNode?.parent_id;

            Promise.all(dragGroup.map(dg => {
                return patchNode(dg.node.id, { 
                    pos_x: dg.startX + dragOffsetX, 
                    pos_y: dg.startY + dragOffsetY 
                });
            }));
            
            if (parentIdForReorder !== null) {
                reorderSiblings(parentIdForReorder);
            }
            dragNode = null;
            draggingId = null;
            isDragging = false;
            dragOffsetX = 0;
            dragOffsetY = 0;
            dragGroup = [];
        }
    }"""

c = re.sub(r"    function handleCanvasMouseMove\(e\) \{[\s\S]*?            \}\);\n        \}\n    \}", c_mousemove, c)

c = re.sub(r"    function handleCanvasMouseUp\(e\) \{[\s\S]*?            dragGroup = \[\];\n        \}\n    \}", c_mouseup, c)

# 4. Node Mouse Down
c = c.replace("""    function handleNodeMouseDown(e, node) {
        if (e.button !== 0) return;
        e.stopPropagation();""", """    function handleNodeMouseDown(e, node) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();""")

c = c.replace("""        dragGroup = draggedNodes.map(n => ({
            node: n,
            startX: n.pos_x || 0,
            startY: n.pos_y || 0
        }));

        dragNode = node;
        dragStart = { x: e.clientX, y: e.clientY };
    }""", """        dragGroup = draggedNodes.map(n => ({
            node: n,
            startX: n.pos_x || 0,
            startY: n.pos_y || 0
        }));

        dragNode = node;
        draggingId = node.id;
        dragStartScreenX = e.clientX;
        dragStartScreenY = e.clientY;
        isDragging = true;
    }

    function isNodeDragging(id) {
        return isDragging && dragGroup.some(dg => dg.node.id === id);
    }

    function changePage(nodeId, pageIdx) {
        cardPages[nodeId] = pageIdx;
    }""")

# 5. Side Panel -> Edit Popup
c = c.replace("if (node) openSidePanel(node);", "if (node) openEditPopup(node);")

c = c.replace("""        if (confirm('Delete this node and all its children?')) {
            if (sidePanel.open && sidePanel.node?.id === id) {
                sidePanel = { open: false, node: null };
            }
            await deleteNode(id);
        }""", """        if (confirm('Delete this node and all its children?')) {
            if (editPopup.open && editPopup.node?.id === id) {
                closeEditPopup();
            }
            await deleteNode(id);
        }""")

# addChild
c = c.replace("openSidePanel(created);", "openEditPopup(created);")

c_edit_popup = """    // ── EDIT POPUP ─────────────────────────────────────────────
    function openEditPopup(node) {
        editTitle = node.title || '';
        editDescription = node.description || '';
        editDueDate = node.due_date ? node.due_date.slice(0, 10) : '';
        dateError = false;

        const popupW = 240;
        let cx = node.pos_x || 0;
        let cy = node.pos_y || 0;
        let pX = cx + CARD_W + 12;
        
        const popupScreenRight = pX * zoom + panX + popupW;
        if (popupScreenRight > canvasWidth) {
            pX = cx - popupW - 12;
        }

        editPopup = { open: true, node, x: pX, y: cy, origX: cx };
    }

    function closeEditPopup() {
        editPopup = { open: false, node: null, x: 0, y: 0, origX: 0 };
    }

    async function saveEditPopup() {
        if (!editPopup.node) return;
        if (!validateDateStr(editDueDate)) {
            dateError = true;
            return;
        }
        dateError = false;
        
        const updates = { title: editTitle, description: editDescription || null };
        if (editDueDate) updates.due_date = editDueDate;
        else updates.due_date = null;
        
        await patchNode(editPopup.node.id, updates);
        editPopup = { ...editPopup, node: { ...editPopup.node, ...updates } };
        closeEditPopup();
    }

    async function deleteEditPopupNode() {
        if (!editPopup.node) return;
        if (confirm('Delete this node and all its children?')) {
            const id = editPopup.node.id;
            closeEditPopup();
            await deleteNode(id);
        }
    }"""

c = re.sub(r"    // ── SIDE PANEL ─────────────────────────────────────────────[\s\S]*?            await deleteNode\(id\);\n        \}\n    \}", c_edit_popup, c)

# 6. Modal submit edits
c = re.sub(r"    async function submitNewRoadmap\(e\) \{\n        e\.preventDefault\(\);\n        if \(\!formTitle\.trim\(\)\) return;", """    async function submitNewRoadmap(e) {\n        e.preventDefault();\n        if (!formTitle.trim()) return;\n        if (!validateDateStr(formDueDate)) {\n            modalDateError = true;\n            return;\n        }\n        modalDateError = false;""", c)

# 7. Arrows lines
c = c.replace("""            arrows.push({ d, id: `${parent.id}-${node.id}` });""", """            arrows.push({ d, x1, y1, x2, y2, id: `${parent.id}-${node.id}` });""")

# SVG bindings and text dragging
c = c.replace("<svg", "<svg\n            class:is-dragging={isDragging}\n            on:mousedown={() => { document.body.style.userSelect = 'none' }}")


c_svg_arrows = """                <!-- Arrows -->
                {#if !isDragging}
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
                {:else}
                    {#each arrows as arrow (arrow.id)}
                        <!-- draw simplified straight lines during drag for performance -->
                        <line 
                            x1={arrow.x1} y1={arrow.y1} 
                            x2={arrow.x2} y2={arrow.y2}
                            stroke="var(--text-tertiary)" 
                            stroke-width="1" 
                            opacity="0.3"
                        />
                    {/each}
                {/if}"""

c = re.sub(r"                <!-- Arrows -->\n                \{#each arrows as arrow \(arrow\.id\)\}[\s\S]*?                \{/each\}", c_svg_arrows, c)


# Foreign object changes
c = c.replace("""                    <foreignObject
                        x={node.pos_x || 0}
                        y={node.pos_y || 0}
                        width={CARD_W}
                        height={CARD_MIN_H + 40}
                        style="overflow: visible;"
                        in:fade={{ duration: 250 }}
                    >""", """                    <!-- NOTE: during drag, use CSS transform -->
                    <foreignObject
                        x={node.pos_x || 0}
                        y={node.pos_y || 0}
                        width={CARD_W}
                        height={CARD_MIN_H + 40}
                        style="overflow: visible; {isNodeDragging(node.id) ? `transform: translate(${dragOffsetX}px, ${dragOffsetY}px); will-change: transform;` : ''}"
                        in:fade={{ duration: 250 }}
                    >""")

# 10. Node wrapper changes - replace standard card with 2 pages and dots
c_card = """                        <!-- svelte-ignore a11y-no-static-element-interactions -->
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
                            <!-- Header row shared by both pages -->
                            <div class="node-header">
                                <!-- Done checkbox -->
                                <button class="done-ring" class:checked={node.status === 'done'} on:mousedown|stopPropagation on:click={(e) => toggleDone(e, node.id)}>
                                    {#if node.status === 'done'}
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    {/if}
                                </button>
                                <span class="node-title" class:strikethrough={node.status === 'done'}>
                                    {node.title || 'Untitled'}
                                </span>
                                <button class="session-square" class:queued={node.session_queued} on:mousedown|stopPropagation on:click={(e) => toggleSession(e, node.id)}>
                                    {#if node.session_queued}
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
                                    {/if}
                                </button>
                            </div>

                            <div class="card-pages-container" style="transform: translateX({(cardPages[node.id] || 0) * -100}%);">
                                <!-- Page 1 -->
                                <div class="card-page page-1">
                                    {#if node.description}
                                        <p class="node-desc">{node.description}</p>
                                    {:else}
                                        <p class="node-desc empty">no description</p>
                                    {/if}
                                </div>
                                <!-- Page 2 -->
                                <div class="card-page page-2">
                                    {#if kids.length > 0}
                                        <div class="child-list">
                                            {#each kids as child}
                                                <div class="child-row">
                                                    <button class="done-ring small" class:checked={child.status === 'done'} on:mousedown|stopPropagation on:click={(e) => toggleDone(e, child.id)}>
                                                        {#if child.status === 'done'}
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                        {/if}
                                                    </button>
                                                    <span class="child-title" class:strikethrough={child.status === 'done'}>{child.title || 'Untitled'}</span>
                                                    <button class="session-square small" class:queued={child.session_queued} on:mousedown|stopPropagation on:click={(e) => toggleSession(e, child.id)}>
                                                        {#if child.session_queued}
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="6" height="6" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
                                                        {/if}
                                                    </button>
                                                </div>
                                            {/each}
                                        </div>
                                    {:else}
                                        <p class="node-desc empty">no subtasks yet</p>
                                    {/if}
                                </div>
                            </div>

                            <div class="card-dots">
                                <button class="dot {(!cardPages[node.id] || cardPages[node.id] === 0) ? 'active' : ''}" on:mousedown|stopPropagation on:click|stopPropagation={() => changePage(node.id, 0)}></button>
                                <button class="dot {cardPages[node.id] === 1 ? 'active' : ''}" on:mousedown|stopPropagation on:click|stopPropagation={() => changePage(node.id, 1)}></button>
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
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                                </button>
                            {/if}
                        </div>"""

c = re.sub(r"                        <!-- svelte-ignore a11y-no-static-element-interactions -->\n                        <div\n                            class=\"node-card\"[\s\S]*?                                </div>\n                            \{/if\}\n                        </div>", c_card, c)

# 12. Context menu side panel replacement
c_popup = """<!-- ═══ EDIT POPUP ═══ -->
{#if editPopup.open}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <foreignObject x={editPopup.x} y={editPopup.y} width="240" height="280">
        <div class="edit-popup" on:mousedown|stopPropagation on:click|stopPropagation>
            <div class="panel-header">
                <h3>Edit Node</h3>
                <button class="panel-close" on:click={closeEditPopup}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
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
                    <label>Due Date <span class="opt_date">(YYYY-MM-DD)</span></label>
                    <input type="text" class:error={dateError} bind:value={editDueDate} placeholder="YYYY-MM-DD" />
                    {#if dateError}<span class="date-error">Use YYYY-MM-DD format</span>{/if}
                </div>
            </div>
            <div class="panel-actions">
                <button class="btn-save" on:click={saveEditPopup}>Save</button>
                <button class="btn-delete" on:click={deleteEditPopupNode}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    Delete
                </button>
            </div>
        </div>
    </foreignObject>
{/if}

<!-- ═══ NEW ROADMAP MODAL ═══ -->"""

c = re.sub(r"<!-- ═══ SIDE PANEL ═══ -->[\s\S]*?<!-- ═══ NEW ROADMAP MODAL ═══ -->", c_popup, c)

# type="date" replace in New modal
c = c.replace("""<input type="date" bind:value={formDueDate} />""", """<input type="text" class:error={modalDateError} bind:value={formDueDate} placeholder="YYYY-MM-DD" />
                    {#if modalDateError}<span class="date-error">Use YYYY-MM-DD format</span>{/if}""")


# Add CSS fixes
c_css = """    /* NEW DRAG AND DROP TEXT SELECTION DISABLE AND POINTER EVENTS */
    svg.is-dragging foreignObject {
        pointer-events: none;
    }
    svg.is-dragging * {
        cursor: grabbing !important;
    }

    .edit-popup {
        background: var(--bg-elevated);
        border: 1px solid var(--border-active);
        border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        animation: ctxScaleIn 0.15s ease;
    }
    .date-error {
        color: var(--red);
        font-size: 10px;
        margin-top: -12px;
    }
    input.error { border-color: var(--red); }
    .opt_date { font-size: 10px; opacity: 0.6; }

    /* CARD PAGES AND DOTS */
    .card-pages-container {
        display: flex;
        width: 200%;
        flex: 1;
        transition: transform 0.25s ease;
    }
    .card-page {
        width: 50%;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        padding: 0 10px 10px 10px;
    }
    .card-dots {
        position: absolute;
        bottom: 8px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        gap: 6px;
    }
    .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--border-active);
        border: none;
        cursor: pointer;
        padding: 0;
    }
    .dot.active {
        background: var(--accent);
    }
    .node-desc {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--text-secondary);
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        margin: 0;
    }
    .node-desc.empty {
        color: var(--text-tertiary);
    }
    
    .child-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 4px;
    }
    .child-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 28px;
        gap: 6px;
    }
    .child-title {
        flex: 1;
        font-size: 11px;
        font-family: var(--font-sans);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--text-primary);
    }
    .child-title.strikethrough {
        text-decoration: line-through;
        color: var(--text-secondary);
    }
    
    .done-ring.small {
        width: 14px;
        height: 14px;
    }
    .done-ring.small svg {
        width: 8px;
        height: 8px;
    }
    .session-square.small {
        width: 12px;
        height: 12px;
        border-radius: 3px;
    }
    .session-square.small svg {
        width: 8px;
        height: 8px;
    }

"""

c = c.replace("""    /* ═══ NODE HEADER ═══ */""", c_css + """    /* ═══ NODE HEADER ═══ */""")

c = re.sub(r"    \.done-ring \{\n        flex-shrink: 0;\n        width: 18px;\n        height: 18px;", """    .done-ring {\n        flex-shrink: 0;\n        width: 14px;\n        height: 14px;""", c)

c = re.sub(r"    \.session-square \{\n        flex-shrink: 0;\n        width: 18px;\n        height: 18px;\n        border-radius: 4px;", """    .session-square {\n        flex-shrink: 0;\n        width: 12px;\n        height: 12px;\n        border-radius: 3px;""", c)

c = re.sub(r"    \.done-ring svg \{\n        width: 10px;\n        height: 10px;\n    \}", """    .done-ring svg {\n        width: 8px;\n        height: 8px;\n    }""", c)


c = c.replace("""    .node-card {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 0;
        cursor: grab;
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        position: relative;
        overflow: visible;
        font-family: var(--font-sans);
    }""", """    .node-card {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 0;
        cursor: grab;
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        position: relative;
        overflow: hidden;
        font-family: var(--font-sans);
        display: flex;
        flex-direction: column;
        will-change: transform;
        backface-visibility: hidden;
    }""")


with open('/home/bwoy/buddy/src/routes/Tasks.svelte', 'w') as f:
    f.write(c)

