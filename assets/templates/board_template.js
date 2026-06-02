function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '…' : str;
}

function initialsFromName(name) {
    const parts = (name || '').trim().split(' ');
    return ((parts[0]?.charAt(0) || '') + (parts[1]?.charAt(0) || '')).toUpperCase() || '?';
}

function categoryColorClass(category) {
    if (!category) return '';
    const c = category.toLowerCase();
    if (c.includes('technical')) return 'category-technical';
    if (c.includes('user')) return 'category-user-story';
    return '';
}

function prioSvg(prio) {
    if (!prio) return '';
    const p = prio.toLowerCase();
    if (p === 'urgent') return `<svg width="20" height="15" viewBox="0 0 20 14.51" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 8.76 L10 0 L20 8.76 L17.5 8.76 L10 2.5 L2.5 8.76 Z" fill="#FF3D00"/><path d="M0 14.51 L10 5.75 L20 14.51 L17.5 14.51 L10 8.25 L2.5 14.51 Z" fill="#FF3D00"/></svg>`;
    if (p === 'medium') return `<svg width="20" height="8" viewBox="0 0 20 8" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="20" height="2.21" rx="1.1" fill="#FFA800"/><rect x="0" y="5.24" width="20" height="2.21" rx="1.1" fill="#FFA800"/></svg>`;
    if (p === 'low') return `<svg width="20" height="15" viewBox="0 0 20 14.51" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L10 8.76 L20 0 L17.5 0 L10 6.26 L2.5 0 Z" fill="#7AE229"/><path d="M0 5.75 L10 14.51 L20 5.75 L17.5 5.75 L10 12.01 L2.5 5.75 Z" fill="#7AE229"/></svg>`;
    return '';
}

function taskCardTemplate(task) {
    const progress = buildProgressBar(task.subtasks || []);
    const avatars = buildAvatars(task.assignedTo || []);
    return `
        <div class="task-card" data-task-id="${task.id}" draggable="true"
            ondragstart="startDragging(${task.id})"
            ontouchstart="touchDragStart(event, ${task.id})"
            ontouchmove="touchDragMove(event)"
            ontouchend="touchDragEnd(event)"
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

function buildProgressBar(subtasks) {
    const done = subtasks.filter(s => s.done).length;
    const total = subtasks.length;
    return total > 0 ? `
        <div class="card-progress">
            <div class="card-progressbar">
                <div class="card-progressbar-fill" style="width:${Math.round(100 / total * done)}%"></div>
            </div>
            <span class="card-progress-label">${done}/${total} Done</span>
        </div>` : '';
}

function buildAvatars(assignedTo) {
    return assignedTo.slice(0, 5)
        .map(a => `<span class="card-avatar" style="background:${a.color || '#ccc'}">${a.initials || '?'}</span>`)
        .join('');
}

function taskDetailTemplate(task) {
    const prioLabel = task.priority
        ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : '–';
    const assignees = buildDetailAssignees(task.assignedTo || []);
    const subtaskList = buildDetailSubtasks(task.subtasks || [], task.id);
    return buildDetailHTML(task, prioLabel, assignees, subtaskList);
}

function buildDetailAssignees(assignedTo) {
    return assignedTo.map(a => `
        <div class="detail-assignee">
            <span class="card-avatar" style="background:${a.color || '#ccc'}">${a.initials || '?'}</span>
            <span class="detail-assignee-name">${escapeHtml(a.name || '')}</span>
        </div>`).join('');
}

function buildDetailSubtasks(subtasks, taskId) {
    return subtasks.map((s, i) => `
        <li class="detail-subtask-item">
            <input type="checkbox" id="sub-check-${i}" ${s.done ? 'checked' : ''}
                onchange="toggleSubtask(${taskId}, ${i})">
            <label for="sub-check-${i}">${escapeHtml(s.title || '')}</label>
        </li>`).join('');
}

function buildDetailHTML(task, prioLabel, assignees, subtaskList) {
    return buildDetailHeader(task) + buildDetailInfo(task, prioLabel) + 
           buildDetailSections(task, assignees, subtaskList) + buildDetailActions(task.id);
}

function buildDetailHeader(task) {
    return `
        <div class="detail-header">
            <span class="task-card-category ${categoryColorClass(task.category)}">${escapeHtml(task.category || '')}</span>
            <button class="detail-close-btn" onclick="closeOverlay()">&#x2715;</button>
        </div>
        <h2 class="detail-title">${escapeHtml(task.title || '')}</h2>
        ${task.description ? `<p class="detail-desc">${escapeHtml(task.description)}</p>` : ''}`;
}

function buildDetailInfo(task, prioLabel) {
    return `
        <div class="detail-row">
            <span class="detail-label">Due date:</span>
            <span>${task.dueDate || '–'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Priority:</span>
            <span class="detail-prio">${prioLabel} ${prioSvg(task.priority)}</span>
        </div>`;
}

function buildDetailSections(task, assignees, subtaskList) {
    const assignSection = (task.assignedTo || []).length ? `
        <div class="detail-section">
            <span class="detail-label">Assigned To:</span>
            <div class="detail-assignees">${assignees}</div>
        </div>` : '';
    const subtaskSection = (task.subtasks || []).length ? `
        <div class="detail-section">
            <span class="detail-label">Subtasks</span>
            <ul class="detail-subtask-list">${subtaskList}</ul>
        </div>` : '';
    return assignSection + subtaskSection;
}

function buildDetailActions(taskId) {
    return `
        <div class="detail-actions">
            <button class="detail-btn" onclick="deleteTask(${taskId})">
                <img src="../assets/icons/delete.svg" alt="Delete"> Delete
            </button>
            <div class="detail-divider-v"></div>
            <button class="detail-btn" onclick="openEditModal(${taskId})">
                <img src="../assets/icons/edit.svg" alt="Edit"> Edit
            </button>
        </div>`;
}

function editTaskTemplate(task) {
    const prioButtons = buildPrioButtons(task.priority);
    return buildEditHeader() + buildEditFields(task, prioButtons) + buildEditSaveButton(task.id);
}

function buildPrioButtons(currentPrio) {
    return ['urgent', 'medium', 'low'].map(p => `
        <button type="button" class="edit-prio-btn edit-prio-${p} ${currentPrio === p ? 'edit-prio-btn--active' : ''}"
            data-prio="${p}" onclick="selectEditPrio(this, '${p}')">
            ${p.charAt(0).toUpperCase() + p.slice(1)} ${prioSvg(p)}
        </button>`).join('');
}

function buildEditHeader() {
    return `
        <div class="detail-header">
            <span class="detail-title">Edit Task</span>
            <button class="detail-close-btn" onclick="closeOverlay()">&#x2715;</button>
        </div>`;
}

function buildEditFields(task, prioButtons) {
    return buildEditBasicFields(task) + buildEditPrioField(prioButtons) + 
           buildEditAssignField() + buildEditSubtaskField();
}

function buildEditBasicFields(task) {
    return `
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
        </div>`;
}

function buildEditPrioField(prioButtons) {
    return `
        <div class="edit-form-group">
            <label class="edit-label">Priority</label>
            <div class="edit-prio-group">${prioButtons}</div>
        </div>`;
}

function buildEditAssignField() {
    return `
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
        </div>`;
}

function buildEditSubtaskField() {
    return `
        <div class="edit-form-group">
            <label class="edit-label">Subtasks</label>
            <div class="edit-subtask-input-row">
                <input id="edit-subtask-input" class="edit-input" type="text"
                    placeholder="Add new subtask"
                    onkeydown="if(event.key==='Enter'){event.preventDefault();addEditSubtask();}">
                <button type="button" class="edit-subtask-add-btn" onclick="addEditSubtask()">&#43;</button>
            </div>
            <ul class="edit-subtask-list" id="edit-subtask-list"></ul>
        </div>`;
}

function buildEditSaveButton(taskId) {
    return `
        <div class="edit-save-row">
            <button class="btn-add-task" onclick="saveEditedTask(${taskId})">
                OK
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M1 6L6 11L15 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
        </div>`;
}

function renderEditAssignOptionsHTML(boardContacts, editAssignedIds) {
    return boardContacts.map(c => {
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

function renderEditAssignedAvatarsHTML(boardContacts, editAssignedIds) {
    const selected = boardContacts.filter(c => editAssignedIds.includes(String(c.id)));
    return selected.map(c =>
        `<span class="card-avatar" style="background:${c.color}" title="${escapeHtml(c.name)}">${c.initials}</span>`
    ).join('');
}

function renderEditSubtasksHTML(editSubtasks) {
    return editSubtasks.map((s, i) => `
        <li class="edit-subtask-item" id="edit-sub-item-${i}">
            <span class="subtask-text">&#8226; ${escapeHtml(s.title)}</span>
            <div class="edit-subtask-item-actions">
                <button type="button" class="subtask-icon-btn" onclick="startEditSubtask(${i})">&#9998;</button>
                <span class="subtask-action-divider"></span>
                <button type="button" class="subtask-icon-btn" onclick="deleteEditSubtask(${i})">&#128465;</button>
            </div>
        </li>`).join('');
}

function renderEditSubtaskInputHTML(index, title) {
    return `
        <input id="edit-sub-input-${index}" class="edit-input edit-subtask-inline-input"
            value="${escapeHtml(title)}"
            onkeydown="if(event.key==='Enter'){saveEditSubtask(${index});}">
        <div class="edit-subtask-item-actions">
            <button type="button" class="subtask-icon-btn" onclick="saveEditSubtask(${index})">&#10003;</button>
            <button type="button" class="subtask-icon-btn" onclick="deleteEditSubtask(${index})">&#128465;</button>
        </div>`;
}
