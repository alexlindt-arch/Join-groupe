const dialogElement = document.querySelector("dialog");
const dialog = document.getElementById("add-contact-dialog");
const contactListContainer = document.getElementById("contacts-list-import");
const contactDetailsContainer = document.getElementById("contact-details-view");
const URL = 'https://remotestorage-c0469-default-rtdb.europe-west1.firebasedatabase.app/contacts.json';
let loadedContacts = [];

async function init() {
    loadedContacts = []; 
    await loadAndPrepareContacts();
    renderContacts();
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

async function loadAndPrepareContacts() {
    try {
        const response = await fetch(URL);
        const data = await response.json();
        if (!data) return;

        const contactsArray = Array.isArray(data) ? data : Object.values(data);

        const cleanContacts = contactsArray.filter(c => c !== null && c !== undefined);

        loadedContacts = [];

        addContactsToLoaded(cleanContacts);
    } catch (error) { console.error("Fehler beim Laden:", error); }
}

function addContactsToLoaded(contactsFromDB) {
    contactsFromDB.forEach(contact => {
        const contactId = String(contact.id);
        const alreadyExists = loadedContacts.some(c => String(c.id) === contactId);

        if (!alreadyExists) {
            loadedContacts.push({
                id: contactId,
                name: contact.name,
                email: contact.email,
                phone: contact.phone || 'no phone number provided',
                color: contact.color || getRandomColor(), 
                avatar: contact.avatar || getInitials(contact.name)
            });
        }
    });
}

function getInitials(name) {
    if (!name) return 'no Name';

    const nameParts = name.split(' ');

    const firstNameChar = nameParts[0].charAt(0).toUpperCase();
    const lastNameChar = nameParts[1].charAt(0).toUpperCase();

    return firstNameChar + lastNameChar;
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


    const contact = loadedContacts.find(c => c.id === contactId);
    contactDetailsContainer.innerHTML = renderContactDetails(contact);
}

function editContact(id) {
    if (!dialog) return;

    const contact = loadedContacts.find(c => c.id === id);
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
    console.log(event)
    const newContact = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone') || 'no phone number provided'
    };
    saveContactToDB(newContact);
}

async function saveContactToDB(newContact) {
    const maxId = loadedContacts.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0);
    const nextIndex = maxId + 1;

    newContact.id = nextIndex;
    newContact.avatar = getInitials(newContact.name); 
    newContact.color = getRandomColor();

    try {
        await fetch(`${URL.replace('.json', '')}/${nextIndex}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newContact)
        });
        dialog.close();
        await loadAndPrepareContacts(); 
        renderContacts();
    } catch (e) { console.error(e); }
}

async function updateContact(event, id) {
    event.preventDefault();
    const form = event.target;
    const name = form.querySelector('input[type="text"]').value.trim();
    const email = form.querySelector('input[type="email"]').value.trim();
    const phone = form.querySelector('input[type="tel"]').value.trim();

    const contact = loadedContacts.find(c => c.id === id);
    if (!contact) return;

    const updatedContact = {
        id: contact.id,
        name,
        email,
        phone: phone || 'no phone number provided',
        color: contact.color,
        avatar: getInitials(name)
    };

    try {
        await fetch(`${URL.replace('.json', '')}/${id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedContact)
        });
        dialog.close();
        await init();
        showContactDetails(String(id));
    } catch (e) {
        console.error('Update error:', e);
    }
}

async function deleteContact(id) {
    if (!id) return;
    try {
        await fetch(`${URL.replace('.json', '')}/${id}.json`, {
            method: 'DELETE'
        });

        // Schließt das Modal NUR, wenn es im Browser auch wirklich gerade offen ist
        if (dialog && dialog.open) dialog.close();
        if (contactDetailsContainer) contactDetailsContainer.innerHTML = '';
        
        await init(); 
    } catch (error) { console.error("Fehler beim Löschen:", error); }
}