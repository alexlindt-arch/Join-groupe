/**
 * Loads and normalizes all contacts used in the assignment dropdown.
 * @returns {Promise<Object[]>} Normalized contacts (empty if unreachable).
 */
async function loadAssignContacts() {
    try {
        const url = (typeof checkIsGuest === 'function' && checkIsGuest())
            ? '../db.json'
            : ADDTASK_CONTACTS_URL;
        const response = await fetch(url);
        const raw = await response.json();
        const data = (typeof checkIsGuest === 'function' && checkIsGuest()) ? raw.contacts : raw;
        if (!data) return [];
        return normalizeContacts(Array.isArray(data) ? data : Object.values(data));
    } catch (error) {
        console.error('Error loading contacts:', error);
        return [];
    }
}


/**
 * Maps raw contact entries into a consistent shape with id, name, color, avatar.
 * @param {Object[]} raw - Raw contacts from Firebase.
 * @returns {Object[]} Normalized, name-sorted contacts.
 */
function normalizeContacts(raw) {
    return raw
        .filter(Boolean)
        .map(contact => ({
            id: String(contact.id),
            name: contact.name,
            color: contact.color || getRandomColor(),
            avatar: contact.avatar || initialsFromName(contact.name)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}


/**
 * Opens or closes the "Assigned to" dropdown and renders its options.
 * @returns {void}
 */
function toggleAssignDropdown() {
    const options = document.getElementById('assign-options');
    closeCategoryDropdown();
    renderAssignOptions();
    options.classList.toggle('d-none');
}


/**
 * Renders all contact options into the assignment dropdown.
 * @returns {void}
 */
function renderAssignOptions() {
    const options = document.getElementById('assign-options');
    options.innerHTML = addTaskContacts
        .map(contact => assignOptionTemplate(contact, assignedIds.includes(contact.id)))
        .join('');
}


/**
 * Toggles a contact's assignment state and refreshes options and avatars.
 * @param {string} id - Contact id.
 * @returns {void}
 */
function togglePerson(id) {
    if (assignedIds.includes(id)) {
        assignedIds = assignedIds.filter(assignedId => assignedId !== id);
    } else {
        assignedIds.push(id);
    }
    renderAssignOptions();
    renderAssignedAvatars();
}


/**
 * Renders avatar chips for all currently assigned contacts.
 * @returns {void}
 */
function renderAssignedAvatars() {
    const container = document.getElementById('assigned-avatars');
    const selected = addTaskContacts.filter(contact => assignedIds.includes(contact.id));
    container.innerHTML = selected.map(avatarChipTemplate).join('');
}


/**
 * Closes the assignment dropdown.
 * @returns {void}
 */
function closeAssignDropdown() {
    document.getElementById('assign-options').classList.add('d-none');
}


/**
 * Returns the assigned contacts as compact objects for the board.
 * @returns {Object[]} Assigned contacts with id, name, color, initials.
 */
function getAssignedContacts() {
    return addTaskContacts
        .filter(contact => assignedIds.includes(contact.id))
        .map(contact => ({ id: contact.id, name: contact.name, color: contact.color, initials: contact.avatar }));
}
