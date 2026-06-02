const ADDTASK_BASE_URL = 'https://remotestorage-c0469-default-rtdb.europe-west1.firebasedatabase.app';
const ADDTASK_CONTACTS_URL = `${ADDTASK_BASE_URL}/contacts.json`;

let modalSelectedPriority = 'medium';
let modalSelectedCategory = '';
let modalAssignedIds = [];
let modalSubtasks = [];
let modalContacts = [];
let modalDefaultStatus = 'todo';

async function openAddTaskModal(status = 'todo') {
    modalDefaultStatus = status || 'todo';
    const overlay = document.getElementById('add-task-overlay');
    overlay.classList.remove('d-none');
    
    if (modalContacts.length === 0) {
        modalContacts = await loadAssignContacts();
    }
    
    clearModalTaskForm();
    setMinModalDueDate();
    
    document.addEventListener('click', handleModalOutsideClick);
}

function closeAddTaskModal(event) {
    if (event && event.target.id !== 'add-task-overlay') return;
    
    const overlay = document.getElementById('add-task-overlay');
    overlay.classList.add('d-none');
    clearModalTaskForm();
    
    document.removeEventListener('click', handleModalOutsideClick);
}

function handleModalOutsideClick(event) {
    if (!event.target.closest('#modal-assign-select')) closeModalAssignDropdown();
    if (!event.target.closest('#modal-category-select')) closeModalCategoryDropdown();
}

function setMinModalDueDate() {
    const today = new Date().toISOString().split('T')[0];
    const input = document.getElementById('modal-task-due');
    if (input) input.setAttribute('min', today);
}

function setModalPriority(button) {
    document.querySelectorAll('#add-task-overlay .prio-btn').forEach(btn => 
        btn.classList.remove('prio-active')
    );
    button.classList.add('prio-active');
    modalSelectedPriority = button.dataset.prio;
}

function toggleModalCategoryDropdown() {
    closeModalAssignDropdown();
    document.getElementById('modal-category-options').classList.toggle('d-none');
}

function closeModalCategoryDropdown() {
    document.getElementById('modal-category-options').classList.add('d-none');
}

function selectModalCategory(value) {
    modalSelectedCategory = value;
    const label = document.getElementById('modal-category-selected');
    label.textContent = value;
    label.classList.remove('select-placeholder');
    closeModalCategoryDropdown();
    document.getElementById('modal-error-category').classList.add('d-none');
    updateModalCreateButton();
}

function toggleModalAssignDropdown() {
    const options = document.getElementById('modal-assign-options');
    closeModalCategoryDropdown();
    renderModalAssignOptions();
    options.classList.toggle('d-none');
}

function closeModalAssignDropdown() {
    document.getElementById('modal-assign-options').classList.add('d-none');
}

function renderModalAssignOptions() {
    const options = document.getElementById('modal-assign-options');
    options.innerHTML = modalContacts
        .map(contact => modalAssignOptionTemplate(contact, modalAssignedIds.includes(contact.id)))
        .join('');
}

function modalAssignOptionTemplate(contact, isSelected) {
    return `
        <div class="assign-option ${isSelected ? 'assign-option--active' : ''}" onclick="toggleModalPerson('${contact.id}')">
            <span class="assign-option-left">
                <span class="avatar-chip" style="background-color:${contact.color}">${contact.avatar}</span>
                <span class="assign-option-name">${escapeHtml(contact.name)}</span>
            </span>
            <span class="assign-checkbox">${isSelected ? '&#10003;' : ''}</span>
        </div>`;
}

function toggleModalPerson(id) {
    if (modalAssignedIds.includes(id)) {
        modalAssignedIds = modalAssignedIds.filter(assignedId => assignedId !== id);
    } else {
        modalAssignedIds.push(id);
    }
    renderModalAssignOptions();
    renderModalAssignedAvatars();
}

function renderModalAssignedAvatars() {
    const container = document.getElementById('modal-assigned-avatars');
    const selected = modalContacts.filter(contact => modalAssignedIds.includes(contact.id));
    container.innerHTML = selected.map(contact => 
        `<span class="avatar-chip" style="background-color:${contact.color}">${contact.avatar}</span>`
    ).join('');
}

function handleModalSubtaskKey(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addModalSubtask();
}

function updateModalSubtaskActions() {
    const hasText = document.getElementById('modal-task-subtask').value.trim().length > 0;
    const editActions = document.getElementById('modal-subtask-edit-actions');
    if (editActions) editActions.classList.toggle('d-none', !hasText);
}

function addModalSubtask() {
    const input = document.getElementById('modal-task-subtask');
    const title = input.value.trim();
    if (!title) return;
    modalSubtasks.push({ title, done: false });
    input.value = '';
    updateModalSubtaskActions();
    renderModalSubtasks();
}

function clearModalSubtaskInput() {
    document.getElementById('modal-task-subtask').value = '';
    updateModalSubtaskActions();
}

function deleteModalSubtask(index) {
    modalSubtasks.splice(index, 1);
    renderModalSubtasks();
}

function editModalSubtask(index) {
    const list = document.getElementById('modal-subtask-list');
    list.children[index].outerHTML = modalSubtaskEditTemplate(modalSubtasks[index], index);
    document.getElementById(`modal-subtask-edit-${index}`).focus();
}

function saveModalSubtaskEdit(index) {
    const value = document.getElementById(`modal-subtask-edit-${index}`).value.trim();
    if (!value) return deleteModalSubtask(index);
    modalSubtasks[index].title = value;
    renderModalSubtasks();
}

function renderModalSubtasks() {
    const list = document.getElementById('modal-subtask-list');
    list.innerHTML = modalSubtasks.map((subtask, index) => modalSubtaskItemTemplate(subtask, index)).join('');
}

function modalSubtaskItemTemplate(subtask, index) {
    return `
        <li class="subtask-item" ondblclick="editModalSubtask(${index})">
            <span class="subtask-text">&bull; ${escapeHtml(subtask.title)}</span>
            <span class="subtask-item-actions">
                <button type="button" class="subtask-icon-btn" title="Edit" onclick="editModalSubtask(${index})">&#9998;</button>
                <span class="subtask-action-divider"></span>
                <button type="button" class="subtask-icon-btn" title="Delete" onclick="deleteModalSubtask(${index})">&#128465;</button>
            </span>
        </li>`;
}

function modalSubtaskEditTemplate(subtask, index) {
    return `
        <li class="subtask-item subtask-item--editing">
            <input class="subtask-edit-input" id="modal-subtask-edit-${index}" value="${escapeHtml(subtask.title)}"
                onkeydown="if(event.key==='Enter'){event.preventDefault();saveModalSubtaskEdit(${index});}">
            <span class="subtask-item-actions">
                <button type="button" class="subtask-icon-btn" title="Delete" onclick="deleteModalSubtask(${index})">&#128465;</button>
                <span class="subtask-action-divider"></span>
                <button type="button" class="subtask-icon-btn" title="Save" onclick="saveModalSubtaskEdit(${index})">&#10003;</button>
            </span>
        </li>`;
}

function updateModalCreateButton() {
    const title = document.getElementById('modal-task-title').value.trim();
    const due = document.getElementById('modal-task-due').value;
    const btn = document.getElementById('modal-btn-create');
    btn.disabled = !(title && due && modalSelectedCategory);
}

function clearModalTaskForm() {
    document.getElementById('modal-task-title').value = '';
    document.getElementById('modal-task-desc').value = '';
    document.getElementById('modal-task-due').value = '';
    
    modalSelectedPriority = 'medium';
    document.querySelectorAll('#add-task-overlay .prio-btn').forEach(btn => {
        btn.classList.remove('prio-active');
        if (btn.dataset.prio === 'medium') btn.classList.add('prio-active');
    });
    
    modalSelectedCategory = '';
    const categoryLabel = document.getElementById('modal-category-selected');
    categoryLabel.textContent = 'Select task category';
    categoryLabel.classList.add('select-placeholder');
    
    modalAssignedIds = [];
    modalSubtasks = [];
    renderModalAssignedAvatars();
    renderModalSubtasks();
    
    document.getElementById('modal-task-subtask').value = '';
    updateModalSubtaskActions();
    
    document.querySelectorAll('#add-task-overlay .field-error').forEach(el => 
        el.classList.add('d-none')
    );
    
    updateModalCreateButton();
}

async function createTaskFromModal(event) {
    event.preventDefault();
    
    const task = collectModalTask();
    if (!validateModalTask(task)) return;
    
    const button = document.getElementById('modal-btn-create');
    button.disabled = true;
    
    try {
        await saveModalTask(task);
        showTaskNotification('Task added to board');
        closeAddTaskModal();
        
        // Reload tasks to show the new one
        await initTasks();
    } catch (error) {
        console.error('Error saving task:', error);
        showTaskNotification('Could not save task. Please try again.', true);
        button.disabled = false;
    }
}

function collectModalTask() {
    const assignedTo = modalContacts
        .filter(c => modalAssignedIds.includes(c.id))
        .map(c => ({ id: c.id, name: c.name, color: c.color, initials: c.avatar }));
    
    return {
        title: document.getElementById('modal-task-title').value.trim(),
        description: document.getElementById('modal-task-desc').value.trim(),
        dueDate: document.getElementById('modal-task-due').value,
        priority: modalSelectedPriority,
        category: modalSelectedCategory,
        assignedTo,
        subtasks: modalSubtasks,
        status: modalDefaultStatus
    };
}

function validateModalTask(task) {
    let valid = true;
    
    const titleError = document.getElementById('modal-error-title');
    if (!task.title) {
        titleError.classList.remove('d-none');
        valid = false;
    } else {
        titleError.classList.add('d-none');
    }
    
    const dueError = document.getElementById('modal-error-due');
    if (!task.dueDate) {
        dueError.classList.remove('d-none');
        valid = false;
    } else {
        dueError.classList.add('d-none');
    }
    
    const categoryError = document.getElementById('modal-error-category');
    if (!task.category) {
        categoryError.classList.remove('d-none');
        valid = false;
    } else {
        categoryError.classList.add('d-none');
    }
    
    return valid;
}

async function saveModalTask(task) {
    if (checkIsGuest()) {
        const guestTasks = getGuestTasks();
        task.id = guestTasks.length ? Math.max(...guestTasks.map(t => Number(t.id) || 0)) + 1 : 1;
        guestTasks.push(task);
        saveGuestTasks(guestTasks);
        return;
    }
    
    const id = await getNextModalTaskId();
    task.id = id;
    await fetch(`${ADDTASK_BASE_URL}/tasks/${id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
    });
}

async function getNextModalTaskId() {
    try {
        const response = await fetch(`${ADDTASK_BASE_URL}/tasks.json`);
        const data = await response.json();
        if (!data) return 1;
        const tasks = Array.isArray(data) ? data.filter(Boolean) : Object.values(data).filter(Boolean);
        if (tasks.length === 0) return 1;
        const maxId = Math.max(...tasks.map(t => Number(t.id) || 0));
        return maxId + 1;
    } catch (error) {
        console.error('Error getting next task ID:', error);
        return 1;
    }
}

function showTaskNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = 'notification';
    if (isError) notification.classList.add('notification--error');
    notification.classList.remove('d-none');
    
    setTimeout(() => {
        notification.classList.add('d-none');
    }, 2000);
}