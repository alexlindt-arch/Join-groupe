let touchDragClone = null;
let touchDragOffsetX = 0;
let touchDragOffsetY = 0;

function startDragging(id) {
    currentDraggedTaskId = id;
}

function allowDrop(ev) {
    ev.preventDefault();
}

function highlight(id) {
    document.getElementById(`drag-hl-${id}`)?.classList.add('drag-active');
}

function removeHighlight(id) {
    document.getElementById(`drag-hl-${id}`)?.classList.remove('drag-active');
}

async function moveTo(status) {
    if (currentDraggedTaskId === null) return;
    const task = allTasks.find(t => t.id == currentDraggedTaskId);
    if (!task) return;
    task.status = status;
    await updateTaskStatus(task);
    displayTasks(allTasks);
    currentDraggedTaskId = null;
}

async function updateTaskStatus(task) {
    if (checkIsGuest()) {
        saveGuestTasks(allTasks);
    } else {
        await updateTaskStatusRemote(task.id, task.status);
    }
}

async function updateTaskStatusRemote(taskId, status) {
    try {
        await fetch(`${BOARD_BASE_URL}/tasks/${taskId}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
    } catch (e) {
        console.error('Error updating task status:', e);
    }
}

function touchDragStart(event, id) {
    currentDraggedTaskId = id;
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const touch = event.touches[0];
    touchDragOffsetX = touch.clientX - rect.left;
    touchDragOffsetY = touch.clientY - rect.top;
    createTouchClone(card, rect);
    card.style.opacity = '0.4';
}

function createTouchClone(card, rect) {
    touchDragClone = card.cloneNode(true);
    touchDragClone.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        opacity: 0.8;
        pointer-events: none;
        z-index: 9999;
        transform: rotate(3deg);
        box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    `;
    document.body.appendChild(touchDragClone);
}

function touchDragMove(event) {
    if (!touchDragClone) return;
    event.preventDefault();
    const touch = event.touches[0];
    touchDragClone.style.left = (touch.clientX - touchDragOffsetX) + 'px';
    touchDragClone.style.top  = (touch.clientY - touchDragOffsetY) + 'px';
    updateColumnHighlights(touch);
}

function updateColumnHighlights(touch) {
    ['todo', 'inProgress', 'awaitFeedback', 'done'].forEach(colId => {
        const col = document.getElementById(colId);
        if (!col) return;
        const r = col.getBoundingClientRect();
        if (touch.clientX >= r.left && touch.clientX <= r.right &&
            touch.clientY >= r.top  && touch.clientY <= r.bottom) {
            highlight(colId);
        } else {
            removeHighlight(colId);
        }
    });
}

function touchDragEnd(event) {
    if (!touchDragClone) return;
    const touch = event.changedTouches[0];
    cleanupTouchDrag(event.currentTarget);
    checkDropZone(touch);
}

function cleanupTouchDrag(card) {
    if (touchDragClone) {
        touchDragClone.remove();
        touchDragClone = null;
    }
    card.style.opacity = '';
}

function checkDropZone(touch) {
    ['todo', 'inProgress', 'awaitFeedback', 'done'].forEach(colId => {
        removeHighlight(colId);
        const col = document.getElementById(colId);
        if (!col) return;
        const r = col.getBoundingClientRect();
        if (touch.clientX >= r.left && touch.clientX <= r.right &&
            touch.clientY >= r.top  && touch.clientY <= r.bottom) {
            moveTo(colId);
        }
    });
}
