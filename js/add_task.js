const ADDTASK_BASE_URL = 'https://remotestorage-c0469-default-rtdb.europe-west1.firebasedatabase.app';
const ADDTASK_TASKS_URL = `${ADDTASK_BASE_URL}/tasks.json`;
const ADDTASK_CONTACTS_URL = `${ADDTASK_BASE_URL}/contacts.json`;

let selectedPriority = 'medium';
let selectedCategory = '';
let assignedIds = [];
let subtasks = [];
let addTaskContacts = [];


document.addEventListener('DOMContentLoaded', initTaskPage);


/**
 * Initializes the Add Task page (avatar, min date, contacts, outside-click).
 * @returns {Promise<void>}
 */
async function initTaskPage() {
    setHeaderAvatar();
    setMinDueDate();
    document.addEventListener('click', handleOutsideClick);
    addTaskContacts = await loadAssignContacts();
}


/**
 * Sets the active priority and highlights the matching button.
 * @param {HTMLElement} button - The clicked priority button.
 * @returns {void}
 */
function setPriority(button) {
    document.querySelectorAll('.prio-btn').forEach(btn => btn.classList.remove('prio-active'));
    button.classList.add('prio-active');
    selectedPriority = button.dataset.prio;
}


/**
 * Opens or closes the category dropdown.
 * @returns {void}
 */
function toggleCategoryDropdown() {
    closeAssignDropdown();
    document.getElementById('category-options').classList.toggle('d-none');
}


/**
 * Selects a task category and shows it in the toggle.
 * @param {string} value - 'Technical Task' or 'User Story'.
 * @returns {void}
 */
function selectCategory(value) {
    selectedCategory = value;
    const label = document.getElementById('category-selected');
    label.textContent = value;
    label.classList.remove('select-placeholder');
    closeCategoryDropdown();
    hideError('error-category');
}


/**
 * Closes the category dropdown.
 * @returns {void}
 */
function closeCategoryDropdown() {
    document.getElementById('category-options').classList.add('d-none');
}


/**
 * Closes both dropdowns when a click happens outside of them.
 * @param {MouseEvent} event - The document click event.
 * @returns {void}
 */
function handleOutsideClick(event) {
    if (!event.target.closest('#assign-select')) closeAssignDropdown();
    if (!event.target.closest('#category-select')) closeCategoryDropdown();
}


/**
 * Handles key presses in the subtask field: Enter adds a subtask, never submits.
 * @param {KeyboardEvent} event - The keydown event.
 * @returns {void}
 */
function handleSubtaskKey(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addSubtask();
}


/**
 * Switches the subtask icons between the default "+" and the clear/confirm pair.
 * @returns {void}
 */
function updateSubtaskActions() {
    const hasText = document.getElementById('task-subtask').value.trim().length > 0;
    document.getElementById('subtask-add-default').classList.toggle('d-none', hasText);
    document.getElementById('subtask-edit-actions').classList.toggle('d-none', !hasText);
}


/**
 * Adds the current input value as a new subtask and clears the field.
 * @returns {void}
 */
function addSubtask() {
    const input = document.getElementById('task-subtask');
    const title = input.value.trim();
    if (!title) return;
    subtasks.push({ title, done: false });
    input.value = '';
    updateSubtaskActions();
    renderSubtasks();
}


/**
 * Clears the subtask input without adding a subtask.
 * @returns {void}
 */
function clearSubtaskInput() {
    document.getElementById('task-subtask').value = '';
    updateSubtaskActions();
}


/**
 * Removes a subtask by index and re-renders the list.
 * @param {number} index - Position in the subtask list.
 * @returns {void}
 */
function deleteSubtask(index) {
    subtasks.splice(index, 1);
    renderSubtasks();
}


/**
 * Switches a subtask into inline edit mode.
 * @param {number} index - Position in the subtask list.
 * @returns {void}
 */
function editSubtask(index) {
    const list = document.getElementById('subtask-list');
    list.children[index].outerHTML = subtaskEditTemplate(subtasks[index], index);
    document.getElementById(`subtask-edit-${index}`).focus();
}


/**
 * Saves the edited subtask title (or deletes it when left empty).
 * @param {number} index - Position in the subtask list.
 * @returns {void}
 */
function saveSubtaskEdit(index) {
    const value = document.getElementById(`subtask-edit-${index}`).value.trim();
    if (!value) return deleteSubtask(index);
    subtasks[index].title = value;
    renderSubtasks();
}


/**
 * Renders the full subtask list into the DOM.
 * @returns {void}
 */
function renderSubtasks() {
    const list = document.getElementById('subtask-list');
    list.innerHTML = subtasks.map((subtask, index) => subtaskItemTemplate(subtask, index)).join('');
}


/**
 * Collects all form values into a task object ready to be saved.
 * @returns {Object} The task to persist.
 */
function collectTask() {
    return {
        title: document.getElementById('task-title').value.trim(),
        description: document.getElementById('task-desc').value.trim(),
        dueDate: document.getElementById('task-due').value,
        category: selectedCategory,
        priority: selectedPriority,
        assignedTo: getAssignedContacts(),
        subtasks: subtasks,
        status: 'todo'
    };
}


/**
 * Validates the required fields and shows inline errors.
 * @param {Object} task - The collected task.
 * @returns {boolean} True when all required fields are filled.
 */
function validateTask(task) {
    toggleError('error-title', !task.title);
    toggleError('error-due', !task.dueDate);
    toggleError('error-category', !task.category);
    return Boolean(task.title && task.dueDate && task.category);
}


/**
 * Creates the task: validates, saves to Firebase and redirects to the board.
 * @returns {Promise<void>}
 */
async function createTask() {
    const task = collectTask();
    if (!validateTask(task)) return;
    const button = document.querySelector('.btn-create');
    button.disabled = true;
    try {
        await saveTask(task);
        showTaskNotification('Task added to board');
        setTimeout(() => { window.location.href = 'board.html'; }, 1400);
    } catch (error) {
        console.error('Error saving task:', error);
        showTaskNotification('Could not save task. Please try again.', true);
        button.disabled = false;
    }
}


/**
 * Persists a task under a fresh id in Firebase.
 * @param {Object} task - The task to save.
 * @returns {Promise<void>}
 */
async function saveTask(task) {
    const id = await getNextTaskId();
    task.id = id;
    await fetch(`${ADDTASK_BASE_URL}/tasks/${id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
    });
}


/**
 * Determines the next free numeric task id from Firebase.
 * @returns {Promise<number>} The next id.
 */
async function getNextTaskId() {
    try {
        const response = await fetch(ADDTASK_TASKS_URL);
        const data = await response.json();
        if (!data) return 1;
        const ids = Object.values(data).filter(Boolean).map(task => Number(task.id) || 0);
        return (ids.length ? Math.max(...ids) : 0) + 1;
    } catch (error) {
        return Date.now();
    }
}


/**
 * Resets the whole form to its initial state.
 * @returns {void}
 */
function clearTaskForm() {
    document.getElementById('task-form').reset();
    subtasks = [];
    assignedIds = [];
    selectedCategory = '';
    resetCategoryLabel();
    renderSubtasks();
    renderAssignedAvatars();
    updateSubtaskActions();
    setPriority(document.querySelector('.prio-medium'));
    ['error-title', 'error-due', 'error-category'].forEach(hideError);
}


/**
 * Restores the category toggle to its placeholder text.
 * @returns {void}
 */
function resetCategoryLabel() {
    const label = document.getElementById('category-selected');
    label.textContent = 'Select task category';
    label.classList.add('select-placeholder');
}


/**
 * Sets the minimum selectable due date to today.
 * @returns {void}
 */
function setMinDueDate() {
    const due = document.getElementById('task-due');
    if (due) due.min = new Date().toISOString().split('T')[0];
}


/**
 * Shows the logged-in user's initials in the header avatar.
 * @returns {void}
 */
function setHeaderAvatar() {
    const avatar = document.getElementById('user-avatar');
    if (!avatar) return;
    let user = null;
    try { user = JSON.parse(sessionStorage.getItem('currentUser')); } catch (error) { user = null; }
    avatar.textContent = user ? initialsFromName(user.name) : 'G';
}


/**
 * Builds up to two uppercase initials from a name.
 * @param {string} name - Full name.
 * @returns {string} Initials, falling back to 'G'.
 */
function initialsFromName(name) {
    const parts = (name || '').trim().split(' ');
    const first = parts[0]?.charAt(0).toUpperCase() || '';
    const second = parts[1]?.charAt(0).toUpperCase() || '';
    return (first + second) || 'G';
}


/**
 * Returns a random hex color (used as a fallback avatar color).
 * @returns {string} Hex color string.
 */
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) color += letters[Math.floor(Math.random() * 16)];
    return color;
}


/**
 * Shows or hides a field error element.
 * @param {string} id - Error element id.
 * @param {boolean} show - Whether to show the error.
 * @returns {void}
 */
function toggleError(id, show) {
    document.getElementById(id).classList.toggle('d-none', !show);
}


/**
 * Hides a field error element.
 * @param {string} id - Error element id.
 * @returns {void}
 */
function hideError(id) {
    document.getElementById(id).classList.add('d-none');
}


/**
 * Shows a temporary toast notification.
 * @param {string} message - Message to display.
 * @param {boolean} [isError=false] - Whether the toast is an error.
 * @returns {void}
 */
function showTaskNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.style.backgroundColor = isError ? 'var(--red, #ff3d00)' : 'var(--primaryColor, #2a3647)';
    notification.classList.remove('d-none');
    setTimeout(() => notification.classList.add('d-none'), 3000);
}


/**
 * Escapes HTML special characters to prevent markup injection.
 * @param {string} str - Raw string.
 * @returns {string} Escaped string.
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
