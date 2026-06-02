const BOARD_BASE_URL = 'https://remotestorage-c0469-default-rtdb.europe-west1.firebasedatabase.app';

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

async function deleteTask(id) {
    if (!confirm('Task wirklich löschen?')) return;
    allTasks = allTasks.filter(t => t.id != id);
    if (checkIsGuest()) {
        deleteTaskGuest();
    } else {
        await deleteTaskRemote(id);
    }
}

function deleteTaskGuest() {
    saveGuestTasks(allTasks);
    closeOverlay();
    displayTasks(allTasks);
}

async function deleteTaskRemote(id) {
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
    await saveSubtaskState(taskId, task.subtasks);
    refreshTaskCard(taskId);
    refreshSubtaskChecks(task);
}

async function saveSubtaskState(taskId, subtasks) {
    if (checkIsGuest()) {
        saveGuestTasks(allTasks);
    } else {
        await updateSubtasksRemote(taskId, subtasks);
    }
}

async function updateSubtasksRemote(taskId, subtasks) {
    try {
        await fetch(`${BOARD_BASE_URL}/tasks/${taskId}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subtasks })
        });
    } catch (e) {
        console.error('Error updating subtask:', e);
    }
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
    return checkIsGuest() ? await loadGuestContacts() : await loadRemoteContacts();
}

async function loadGuestContacts() {
    try {
        const res = await fetch('../db.json');
        const data = await res.json();
        const raw = Object.values(data.contacts || {});
        return mapContacts(raw, true);
    } catch (e) { return []; }
}

async function loadRemoteContacts() {
    try {
        const response = await fetch(`${BOARD_BASE_URL}/contacts.json`);
        const data = await response.json();
        if (!data) return [];
        const raw = Array.isArray(data) ? data.filter(Boolean) : Object.values(data).filter(Boolean);
        return mapContacts(raw, false);
    } catch (e) {
        console.error('Error loading contacts:', e);
        return [];
    }
}

function mapContacts(raw, isGuest) {
    return raw.filter(Boolean).map((c, i) => ({
        id: String(isGuest ? (c.id || i + 1) : c.id),
        name: c.name || '',
        color: c.color || '#888',
        initials: initialsFromName(c.name)
    })).sort((a, b) => a.name.localeCompare(b.name));
}

function toggleEditAssignDropdown() {
    document.getElementById('edit-assign-options').classList.toggle('d-none');
}

function renderEditAssignOptions() {
    const el = document.getElementById('edit-assign-options');
    if (!el) return;
    el.innerHTML = renderEditAssignOptionsHTML(boardContacts, editAssignedIds);
}

function selectEditPrio(button, prio) {
    document.querySelectorAll('.edit-prio-btn').forEach(b => b.classList.remove('edit-prio-btn--active'));
    button.classList.add('edit-prio-btn--active');
    editSelectedPrio = prio;
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
    el.innerHTML = renderEditAssignedAvatarsHTML(boardContacts, editAssignedIds);
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
    item.innerHTML = renderEditSubtaskInputHTML(index, editSubtasks[index].title);
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
    list.innerHTML = renderEditSubtasksHTML(editSubtasks);
}

async function saveEditedTask(id) {
    const task = allTasks.find(t => t.id == id);
    if (!task) return;
    const title = document.getElementById('edit-title').value.trim();
    if (!title) { alert('Title is required.'); return; }
    const updates = buildTaskUpdates(title, task);
    Object.assign(task, updates);
    await saveTaskUpdates(id, updates);
    resetEditState();
}

function buildTaskUpdates(title, task) {
    const assignedTo = boardContacts
        .filter(c => editAssignedIds.includes(String(c.id)))
        .map(c => ({ id: c.id, name: c.name, color: c.color, initials: c.initials }));
    return {
        title,
        description: document.getElementById('edit-desc').value.trim(),
        dueDate: document.getElementById('edit-due').value,
        priority: editSelectedPrio || task.priority,
        assignedTo,
        subtasks: editSubtasks
    };
}

async function saveTaskUpdates(id, updates) {
    if (checkIsGuest()) {
        saveGuestTasks(allTasks);
        closeOverlay();
        displayTasks(allTasks);
    } else {
        await updateTaskRemote(id, updates);
    }
}

async function updateTaskRemote(id, updates) {
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

function resetEditState() {
    editSelectedPrio = null;
    editAssignedIds = [];
    editSubtasks = [];
}