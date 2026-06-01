const BOARD_BASE_URL = 'https://remotestorage-c0469-default-rtdb.europe-west1.firebasedatabase.app';

/* ── Guest task helpers (sessionStorage) ── */
function getGuestTasks() {
    try { return JSON.parse(sessionStorage.getItem('guestTasks')) || []; } catch (e) { return []; }
}
function saveGuestTasks(tasks) {
    sessionStorage.setItem('guestTasks', JSON.stringify(tasks));
}

let allTasks = [];
let currentDraggedTaskId = null;
let editSelectedPrio = null;
let editAssignedIds = [];
let editSubtasks = [];
let boardContacts = [];

function init() {
    initMain();
}

async function initTasks() {
    allTasks = await loadBoardTasks();
    displayTasks(allTasks);
}

async function loadBoardTasks() {
    if (checkIsGuest()) return getGuestTasks();
    try {
        const response = await fetch(`${BOARD_BASE_URL}/tasks.json`);
        const data = await response.json();
        if (!data) return [];
        return Array.isArray(data) ? data.filter(Boolean) : Object.values(data).filter(Boolean);
    } catch (error) {
        console.error('Error loading tasks:', error);
        return [];
    }
}

function displayTasks(tasks) {
    ['todo', 'inProgress', 'awaitFeedback', 'done'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    tasks.forEach(task => renderTaskCard(task));
    showEmptyPlaceholders();
    addDragHighlightBoxes();
}

function renderTaskCard(task) {
    const col = document.getElementById(task.status);
    if (!col) return;
    col.insertAdjacentHTML('beforeend', taskCardTemplate(task));
}

function taskCardTemplate(task) {
    const done = (task.subtasks || []).filter(s => s.done).length;
    const total = (task.subtasks || []).length;
    const progress = total > 0 ? `
        <div class="card-progress">
            <div class="card-progressbar">
                <div class="card-progressbar-fill" style="width:${Math.round(100 / total * done)}%"></div>
            </div>
            <span class="card-progress-label">${done}/${total} Done</span>
        </div>` : '';
    const avatars = (task.assignedTo || []).slice(0, 5)
        .map(a => `<span class="card-avatar" style="background:${a.color || '#ccc'}">${a.initials || '?'}</span>`)
        .join('');
    return `
        <div class="task-card" data-task-id="${task.id}" draggable="true"
            ondragstart="startDragging(${task.id})"
            onclick="openTaskDetail(${task.id})">
            <span class="task-card-category ${categoryColorClass(task.category)}">${escapeHtml(task.category || '')}</span>
            <div class="task-card-title">${escapeHtml(task.title || '')}</div>
            ${task.description ? `<div class="task-card-desc">${escapeHtml(truncate(task.description, 60))}</div>` : ''}
            ${progress}
            <div class="task-card-footer">
                <div class="task-card-avatars">${avatars}</div>
                <div class="task-card-prio">${prioSvg(task.priority)}</div>
            </div>
        </div>`;
}

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '…' : str;
}

function prioSvg(prio) {
    if (!prio) return '';
    const p = prio.toLowerCase();
    if (p === 'urgent') return `<svg width="20" height="15" viewBox="0 0 20 14.51" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 8.76 L10 0 L20 8.76 L17.5 8.76 L10 2.5 L2.5 8.76 Z" fill="#FF3D00"/><path d="M0 14.51 L10 5.75 L20 14.51 L17.5 14.51 L10 8.25 L2.5 14.51 Z" fill="#FF3D00"/></svg>`;
    if (p === 'medium') return `<svg width="20" height="8" viewBox="0 0 20 8" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="20" height="2.21" rx="1.1" fill="#FFA800"/><rect x="0" y="5.24" width="20" height="2.21" rx="1.1" fill="#FFA800"/></svg>`;
    if (p === 'low') return `<svg width="20" height="15" viewBox="0 0 20 14.51" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L10 8.76 L20 0 L17.5 0 L10 6.26 L2.5 0 Z" fill="#7AE229"/><path d="M0 5.75 L10 14.51 L20 5.75 L17.5 5.75 L10 12.01 L2.5 5.75 Z" fill="#7AE229"/></svg>`;
    return '';
}

function categoryColorClass(category) {
    if (!category) return '';
    const c = category.toLowerCase();
    if (c.includes('technical')) return 'category-technical';
    if (c.includes('user')) return 'category-user-story';
    return '';
}

function showEmptyPlaceholders() {
    const texts = {
        todo: 'No tasks To do',
        inProgress: 'No tasks In progress',
        awaitFeedback: 'No tasks Awaiting feedback',
        done: 'No tasks Done'
    };
    Object.entries(texts).forEach(([id, text]) => {
        const el = document.getElementById(id);
        if (el && el.innerHTML.trim() === '') {
            el.innerHTML = `<div class="board-empty">${text}</div>`;
        }
    });
}

function addDragHighlightBoxes() {
    ['todo', 'inProgress', 'awaitFeedback', 'done'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.insertAdjacentHTML('beforeend', `<div id="drag-hl-${id}" class="drag-highlight-box"></div>`);
    });
}

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
    if (checkIsGuest()) {
        saveGuestTasks(allTasks);
    } else {
        try {
            await fetch(`${BOARD_BASE_URL}/tasks/${task.id}.json`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
        } catch (e) {
            console.error('Error updating task status:', e);
        }
    }
    displayTasks(allTasks);
    currentDraggedTaskId = null;
}

function filterTasks() {
    const term = (document.getElementById('board-search')?.value || '').toLowerCase();
    if (!term) { displayTasks(allTasks); return; }
    displayTasks(allTasks.filter(t =>
        (t.title || '').toLowerCase().includes(term) ||
        (t.description || '').toLowerCase().includes(term)
    ));
}

function openOverlay() {
    document.getElementById('board-overlay').classList.remove('d-none');
}

function closeOverlay() {
    document.getElementById('board-overlay').classList.add('d-none');
    document.getElementById('board-detail-box').innerHTML = '';
    document.getElementById('board-edit-box').innerHTML = '';
    document.getElementById('board-edit-box').classList.add('d-none');
    document.getElementById('board-detail-box').classList.remove('d-none');
}

function handleOverlayClick(event) {
    if (event.target.id === 'board-overlay') closeOverlay();
}

function openTaskDetail(id) {
    const task = allTasks.find(t => t.id == id);
    if (!task) return;
    document.getElementById('board-detail-box').innerHTML = taskDetailTemplate(task);
    document.getElementById('board-detail-box').classList.remove('d-none');
    document.getElementById('board-edit-box').classList.add('d-none');
    openOverlay();
}

function taskDetailTemplate(task) {
    const prioLabel = task.priority
        ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : '–';
    const assignees = (task.assignedTo || []).map(a => `
        <div class="detail-assignee">
            <span class="card-avatar" style="background:${a.color || '#ccc'}">${a.initials || '?'}</span>
            <span class="detail-assignee-name">${escapeHtml(a.name || '')}</span>
        </div>`).join('');
    const subtaskList = (task.subtasks || []).map((s, i) => `
        <li class="detail-subtask-item">
            <input type="checkbox" id="sub-check-${i}" ${s.done ? 'checked' : ''}
                onchange="toggleSubtask(${task.id}, ${i})">
            <label for="sub-check-${i}">${escapeHtml(s.title || '')}</label>
        </li>`).join('');
    return `
        <div class="detail-header">
            <span class="task-card-category ${categoryColorClass(task.category)}">${escapeHtml(task.category || '')}</span>
            <button class="detail-close-btn" onclick="closeOverlay()">&#x2715;</button>
        </div>
        <h2 class="detail-title">${escapeHtml(task.title || '')}</h2>
        ${task.description ? `<p class="detail-desc">${escapeHtml(task.description)}</p>` : ''}
        <div class="detail-row">
            <span class="detail-label">Due date:</span>
            <span>${task.dueDate || '–'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Priority:</span>
            <span class="detail-prio">${prioLabel} ${prioSvg(task.priority)}</span>
        </div>
        ${(task.assignedTo || []).length ? `
        <div class="detail-section">
            <span class="detail-label">Assigned To:</span>
            <div class="detail-assignees">${assignees}</div>
        </div>` : ''}
        ${(task.subtasks || []).length ? `
        <div class="detail-section">
            <span class="detail-label">Subtasks</span>
            <ul class="detail-subtask-list">${subtaskList}</ul>
        </div>` : ''}
        <div class="detail-actions">
            <button class="detail-btn" onclick="deleteTask(${task.id})">
                <img src="../assets/icons/delete.svg" alt="Delete"> Delete
            </button>
            <div class="detail-divider-v"></div>
            <button class="detail-btn" onclick="openEditModal(${task.id})">
                <img src="../assets/icons/edit.svg" alt="Edit"> Edit
            </button>
        </div>`;
}

async function deleteTask(id) {
    if (!confirm('Task wirklich löschen?')) return;
    allTasks = allTasks.filter(t => t.id != id);
    if (checkIsGuest()) {
        saveGuestTasks(allTasks);
        closeOverlay();
        displayTasks(allTasks);
        return;
    }
    try {
        await fetch(`${BOARD_BASE_URL}/tasks/${id}.json`, { method: 'DELETE' });
        closeOverlay();
        displayTasks(allTasks);
    } catch (e) {
        console.error('Error deleting task:', e);
    }
}

async function toggleSubtask(taskId, subtaskIndex) {
    const task = allTasks.find(t => t.id == taskId);
    if (!task || !task.subtasks) return;
    task.subtasks[subtaskIndex].done = !task.subtasks[subtaskIndex].done;
    if (checkIsGuest()) {
        saveGuestTasks(allTasks);
    } else {
        try {
            await fetch(`${BOARD_BASE_URL}/tasks/${taskId}.json`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subtasks: task.subtasks })
            });
        } catch (e) {
            console.error('Error updating subtask:', e);
        }
    }
    refreshTaskCard(taskId);
    refreshSubtaskChecks(task);
}

function refreshTaskCard(taskId) {
    const task = allTasks.find(t => t.id == taskId);
    if (!task) return;
    const card = document.querySelector(`.task-card[data-task-id="${taskId}"]`);
    if (!card) return;
    card.outerHTML = taskCardTemplate(task);
}

function refreshSubtaskChecks(task) {
    (task.subtasks || []).forEach((s, i) => {
        const cb = document.getElementById(`sub-check-${i}`);
        if (cb) cb.checked = s.done;
    });
}

async function openEditModal(id) {
    const task = allTasks.find(t => t.id == id);
    if (!task) return;
    editSelectedPrio = task.priority || 'medium';
    editSubtasks = (task.subtasks || []).map(s => ({ ...s }));
    editAssignedIds = (task.assignedTo || []).map(a => String(a.id));
    if (!boardContacts.length) boardContacts = await loadBoardContacts();
    document.getElementById('board-detail-box').classList.add('d-none');
    document.getElementById('board-edit-box').innerHTML = editTaskTemplate(task);
    document.getElementById('board-edit-box').classList.remove('d-none');
    renderEditAssignOptions();
    renderEditAssignedAvatars();
    renderEditSubtasks();
}

async function loadBoardContacts() {
    if (checkIsGuest()) {
        try {
            const res = await fetch('../db.json');
            const data = await res.json();
            const raw = Object.values(data.contacts || {});
            return raw.filter(Boolean).map((c, i) => ({
                id: String(c.id || i + 1),
                name: c.name || '',
                color: c.color || '#888',
                initials: initialsFromName(c.name)
            })).sort((a, b) => a.name.localeCompare(b.name));
        } catch (e) { return []; }
    }
    try {
        const response = await fetch(`${BOARD_BASE_URL}/contacts.json`);
        const data = await response.json();
        if (!data) return [];
        const raw = Array.isArray(data) ? data.filter(Boolean) : Object.values(data).filter(Boolean);
        return raw.map(c => ({
            id: String(c.id),
            name: c.name || '',
            color: c.color || '#888',
            initials: initialsFromName(c.name)
        })).sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
        console.error('Error loading contacts:', e);
        return [];
    }
}

function initialsFromName(name) {
    const parts = (name || '').trim().split(' ');
    return ((parts[0]?.charAt(0) || '') + (parts[1]?.charAt(0) || '')).toUpperCase() || '?';
}

function editTaskTemplate(task) {
    const prios = ['urgent', 'medium', 'low'];
    const prioButtons = prios.map(p => `
        <button type="button" class="edit-prio-btn edit-prio-${p} ${task.priority === p ? 'edit-prio-btn--active' : ''}"
            data-prio="${p}" onclick="selectEditPrio(this, '${p}')">
            ${p.charAt(0).toUpperCase() + p.slice(1)} ${prioSvg(p)}
        </button>`).join('');
    return `
        <div class="detail-header">
            <span class="detail-title">Edit Task</span>
            <button class="detail-close-btn" onclick="closeOverlay()">&#x2715;</button>
        </div>
        <div class="edit-form-group">
            <label class="edit-label">Title <span class="required">*</span></label>
            <input id="edit-title" class="edit-input" type="text" value="${escapeHtml(task.title || '')}">
        </div>
        <div class="edit-form-group">
            <label class="edit-label">Description</label>
            <textarea id="edit-desc" class="edit-input edit-textarea">${escapeHtml(task.description || '')}</textarea>
        </div>
        <div class="edit-form-group">
            <label class="edit-label">Due Date</label>
            <input id="edit-due" class="edit-input" type="date" value="${task.dueDate || ''}">
        </div>
        <div class="edit-form-group">
            <label class="edit-label">Priority</label>
            <div class="edit-prio-group">${prioButtons}</div>
        </div>
        <div class="edit-form-group">
            <label class="edit-label">Assigned To</label>
            <div class="edit-assign-wrapper">
                <div class="edit-input edit-assign-toggle" onclick="toggleEditAssignDropdown()">
                    <span>Select contacts</span>
                    <span class="select-caret">&#9662;</span>
                </div>
                <div class="edit-assign-options d-none" id="edit-assign-options"></div>
            </div>
            <div class="edit-assigned-avatars" id="edit-assigned-avatars"></div>
        </div>
        <div class="edit-form-group">
            <label class="edit-label">Subtasks</label>
            <div class="edit-subtask-input-row">
                <input id="edit-subtask-input" class="edit-input" type="text"
                    placeholder="Add new subtask"
                    onkeydown="if(event.key==='Enter'){event.preventDefault();addEditSubtask();}">
                <button type="button" class="edit-subtask-add-btn" onclick="addEditSubtask()">&#43;</button>
            </div>
            <ul class="edit-subtask-list" id="edit-subtask-list"></ul>
        </div>
        <div class="edit-save-row">
            <button class="btn-add-task" onclick="saveEditedTask(${task.id})">
                OK
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M1 6L6 11L15 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
        </div>`;
}

function selectEditPrio(button, prio) {
    document.querySelectorAll('.edit-prio-btn').forEach(b => b.classList.remove('edit-prio-btn--active'));
    button.classList.add('edit-prio-btn--active');
    editSelectedPrio = prio;
}

function toggleEditAssignDropdown() {
    document.getElementById('edit-assign-options').classList.toggle('d-none');
}

function renderEditAssignOptions() {
    const el = document.getElementById('edit-assign-options');
    if (!el) return;
    el.innerHTML = boardContacts.map(c => {
        const selected = editAssignedIds.includes(String(c.id));
        return `<div class="assign-option ${selected ? 'assign-option--active' : ''}"
                    onclick="toggleEditPerson('${c.id}')">
                    <span class="assign-option-left">
                        <span class="card-avatar" style="background:${c.color}">${c.initials}</span>
                        <span class="assign-option-name">${escapeHtml(c.name)}</span>
                    </span>
                    <span class="assign-checkbox">${selected ? '&#10003;' : ''}</span>
                </div>`;
    }).join('');
}

function toggleEditPerson(id) {
    const sid = String(id);
    if (editAssignedIds.includes(sid)) {
        editAssignedIds = editAssignedIds.filter(x => x !== sid);
    } else {
        editAssignedIds.push(sid);
    }
    renderEditAssignOptions();
    renderEditAssignedAvatars();
}

function renderEditAssignedAvatars() {
    const el = document.getElementById('edit-assigned-avatars');
    if (!el) return;
    const selected = boardContacts.filter(c => editAssignedIds.includes(String(c.id)));
    el.innerHTML = selected.map(c =>
        `<span class="card-avatar" style="background:${c.color}" title="${escapeHtml(c.name)}">${c.initials}</span>`
    ).join('');
}

function addEditSubtask() {
    const input = document.getElementById('edit-subtask-input');
    const title = input.value.trim();
    if (!title) return;
    editSubtasks.push({ title, done: false });
    input.value = '';
    renderEditSubtasks();
}

function deleteEditSubtask(index) {
    editSubtasks.splice(index, 1);
    renderEditSubtasks();
}

function startEditSubtask(index) {
    const item = document.getElementById(`edit-sub-item-${index}`);
    item.innerHTML = `
        <input id="edit-sub-input-${index}" class="edit-input edit-subtask-inline-input"
            value="${escapeHtml(editSubtasks[index].title)}"
            onkeydown="if(event.key==='Enter'){saveEditSubtask(${index});}">
        <div class="edit-subtask-item-actions">
            <button type="button" class="subtask-icon-btn" onclick="saveEditSubtask(${index})">&#10003;</button>
            <button type="button" class="subtask-icon-btn" onclick="deleteEditSubtask(${index})">&#128465;</button>
        </div>`;
    document.getElementById(`edit-sub-input-${index}`)?.focus();
}

function saveEditSubtask(index) {
    const val = document.getElementById(`edit-sub-input-${index}`)?.value.trim();
    if (!val) { deleteEditSubtask(index); return; }
    editSubtasks[index].title = val;
    renderEditSubtasks();
}

function renderEditSubtasks() {
    const list = document.getElementById('edit-subtask-list');
    if (!list) return;
    list.innerHTML = editSubtasks.map((s, i) => `
        <li class="edit-subtask-item" id="edit-sub-item-${i}">
            <span class="subtask-text">&#8226; ${escapeHtml(s.title)}</span>
            <div class="edit-subtask-item-actions">
                <button type="button" class="subtask-icon-btn" onclick="startEditSubtask(${i})">&#9998;</button>
                <span class="subtask-action-divider"></span>
                <button type="button" class="subtask-icon-btn" onclick="deleteEditSubtask(${i})">&#128465;</button>
            </div>
        </li>`).join('');
}

async function saveEditedTask(id) {
    const task = allTasks.find(t => t.id == id);
    if (!task) return;
    const title = document.getElementById('edit-title').value.trim();
    if (!title) { alert('Title is required.'); return; }
    const assignedTo = boardContacts
        .filter(c => editAssignedIds.includes(String(c.id)))
        .map(c => ({ id: c.id, name: c.name, color: c.color, initials: c.initials }));
    const updates = {
        title,
        description: document.getElementById('edit-desc').value.trim(),
        dueDate: document.getElementById('edit-due').value,
        priority: editSelectedPrio || task.priority,
        assignedTo,
        subtasks: editSubtasks
    };
    Object.assign(task, updates);
    if (checkIsGuest()) {
        saveGuestTasks(allTasks);
        closeOverlay();
        displayTasks(allTasks);
    } else {
        try {
            await fetch(`${BOARD_BASE_URL}/tasks/${id}.json`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            closeOverlay();
            displayTasks(allTasks);
        } catch (e) {
            console.error('Error saving task:', e);
        }
    }
    editSelectedPrio = null;
    editAssignedIds = [];
    editSubtasks = [];
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
