const dialogElement = document.querySelector("dialog");
const dialog = document.getElementById("add-contact-dialog");
const contactListContainer = document.getElementById("contacts-list-import");
const contactDetailsContainer = document.getElementById("contact-details-view");
const CONTACTS_URL = 'https://remotestorage-c0469-default-rtdb.europe-west1.firebasedatabase.app/contacts.json';
let loadedContacts = [];

async function init() {
    initMain();
    loadedContacts = [];
    await loadAndPrepareContacts();
    renderContacts();

}

async function loadAndPrepareContacts() {
    try {
        const isGuest = checkIsGuest();
        const response = await fetch(isGuest ? '../db.json' : CONTACTS_URL);
        if (!response.ok) return;
        const data = await response.json();
        const raw = isGuest ? data.contacts : data;
        const arr = Object.keys(raw || {}).map(key => ({ ...raw[key], id: key }));
        loadedContacts = [];
        addContactsToLoaded(arr.filter(c => c && c.name));
    } catch (error) { console.error("Fehler beim Laden:", error); }
}

function addContactsToLoaded(contactsFromDB) {
    contactsFromDB.forEach(c => {
        const cId = String(c.id);
        if (!loadedContacts.some(lc => String(lc.id) === cId)) {
            loadedContacts.push({
                id: cId, name: c.name, email: c.email,
                phone: c.phone || 'no phone number provided',
                color: c.color || getRandomColor(),
                avatar: c.avatar || getInitials(c.name)
            });
        }
    });
}

function groupContactsByLetter() {
    let groups = {};
    let sorted = [...loadedContacts].sort((a, b) => a.name.localeCompare(b.name));

    sorted.forEach(contact => {
        let firstLetter = contact.name.charAt(0).toUpperCase();
        if (!groups[firstLetter]) groups[firstLetter] = [];
        groups[firstLetter].push(contact);
    });
    return groups;
}

function renderLetterGroup([letter, contactsInGroup]) {
    let itemsHtml = contactsInGroup.map(renderContactlist).join('');
    return renderLetterGroupTemplate(letter, itemsHtml);
}

function renderContacts() {
    if (!contactListContainer) return;

    let groupedData = groupContactsByLetter();
    let html = Object.entries(groupedData).map(renderLetterGroup).join('');

    contactListContainer.innerHTML = html;
}

function openDialog() {
    dialog.showModal();
}

function closeDialog() {
    dialog.close();
}

function showContactDetails(contactId) {
    const currentActive = document.querySelector('.contact-item.active');
    if (currentActive) currentActive.classList.remove('active');
    
    const clickedElement = document.getElementById(contactId);
    if (clickedElement) clickedElement.classList.add('active');

    const contact = loadedContacts.find(c => String(c.id) === String(contactId));
    if (contact) contactDetailsContainer.innerHTML = renderContactDetails(contact);
}

function editContact(id) {
    if (!dialog) return;
    
    const contact = loadedContacts.find(c => String(c.id) === String(id));
    if (contact) {
        dialog.innerHTML = renderEditContactTemplate(contact);
        fillEditForm(contact);
        openDialog();
    }
}

function fillEditForm(contact) {
    const avatarBox = dialog.querySelector('.profile-placeholder');
    if (avatarBox) {
        avatarBox.innerHTML = `<div class="avatar big" style="background-color: ${contact.color};">${contact.avatar}</div>`;
    }
    dialog.querySelector('input[type="text"]').value = contact.name;
    dialog.querySelector('input[type="email"]').value = contact.email;
    dialog.querySelector('input[type="tel"]').value = contact.phone || '';
}

function openAddContactModal() {
    if (!dialog) return;

    dialog.innerHTML = renderAddContactTemplate();

    const avatarBox = dialog.querySelector('.profile-placeholder');
    if (avatarBox) {
        avatarBox.style.backgroundColor = '';
        avatarBox.innerHTML = '<i class="fa-solid fa-user"></i>';
    }
    openDialog();
}

function renderAddContactTemplate() {
    const buttons = renderDialogCreateContactButton();
    return renderDialogContact('Add contact', 'createNewContact(event)', buttons);
}

function renderEditContactTemplate(contact) {
    const buttons = renderDialogContactEditButton(contact);
    return renderDialogContact('Edit contact', `updateContact(event, '${contact.id}')`, buttons);
}

function createNewContact(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const newContact = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone') || 'no phone number provided'
    };
    saveContactToDB(newContact);
}

async function saveContactToDB(newContact) {
    const isGuest = checkIsGuest();
    newContact.id = loadedContacts.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0) + 1;
    newContact.avatar = getInitials(newContact.name);
    newContact.color = getRandomColor();

    if (isGuest) {
        saveGuestContact(newContact);
    } else {
        await saveUserContact(newContact);
    }
}

function saveGuestContact(newContact) {
    loadedContacts.push(newContact);
    dialog.close();
    renderContacts();
}

async function saveUserContact(newContact) {
    try {
        await fetch(`${CONTACTS_URL.replace('.json', '')}/${newContact.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newContact)
        });
        await loadAndPrepareContacts();
        dialog.close();
        renderContacts();
    } catch (e) { console.error("Fehler beim Cloud-Speichern:", e); }
}

async function updateContact(event, id) {
    event.preventDefault();
    const contact = loadedContacts.find(c => String(c.id) === String(id));
    if (!contact) return;
    const data = new FormData(event.target);
    const updated = {
        id: contact.id, color: contact.color,
        name: data.get('name').trim(), email: data.get('email').trim(),
        phone: data.get('phone').trim() || 'no phone number provided'
    };
    updated.avatar = getInitials(updated.name);
    if (checkIsGuest()) updateGuestContact(updated); else await updateUserContact(updated);
}

async function updateUserContact(updated) {
    try {
        await fetch(`${CONTACTS_URL.replace('.json', '')}/${updated.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });
        await loadAndPrepareContacts();
        finalizeUpdate(updated.id);
    } catch (e) { console.error('Update error:', e); }
}

function updateGuestContact(updated) {
    const idx = loadedContacts.findIndex(c => String(c.id) === String(updated.id));
    if (idx !== -1) loadedContacts[idx] = updated;
    finalizeUpdate(updated.id);
}

function finalizeUpdate(id) {
    dialog.close();
    renderContacts();
    showContactDetails(String(id));
}

async function deleteContact(id) {
    if (!id) return;
    try {
        if (!checkIsGuest()) {
            await fetch(`${CONTACTS_URL.replace('.json', '')}/${id}.json`, { method: 'DELETE' });
            await init();
        } else {
            loadedContacts = loadedContacts.filter(c => String(c.id) !== String(id));
            if (dialog?.open) dialog.close();
            renderContacts();
        }
        if (contactDetailsContainer) contactDetailsContainer.innerHTML = '';
    } catch (error) { console.error("Fehler beim Löschen:", error); }
}

function checkIsGuest() {
    try {
        const user = JSON.parse(sessionStorage.getItem('currentUser'));
        return user?.isGuest === true;
    } catch (e) {
        return true;
    }
}