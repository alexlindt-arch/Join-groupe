const dialogElement = document.querySelector("dialog");
const dialog = document.getElementById("add-contact-dialog");
const contactListContainer = document.getElementById("contacts-list-import");
const contactDetailsContainer = document.getElementById("contact-details-view");
const URL = '/db.json';
let loadedContacts = [];

async function init() {
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

        addContactsToLoaded(data.contacts);
    } catch (error) {
        console.error("Fehler beim Laden:", error);
    }
}

function addContactsToLoaded(contactsFromDB) {
    Object.keys(contactsFromDB).forEach(id => {
        const alreadyExists = loadedContacts.some(c => c.id === id);

        if (!alreadyExists) {
            loadedContacts.push({
                id: id,
                name: contactsFromDB[id].name,
                email: contactsFromDB[id].email,
                phone: contactsFromDB[id].phone || 'no phone number provided',
                color: getRandomColor(),
                avatar: getInitials(contactsFromDB[id].name)
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
        dialog.innerHTML = renderDialogContact('edit', contact);
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

    dialog.innerHTML = renderDialogContact('add');

    const avatarBox = dialog.querySelector('.profile-placeholder');
    if (avatarBox) {
        avatarBox.style.backgroundColor = '';
        avatarBox.innerHTML = '<i class="fa-solid fa-user"></i>';
    }
    openDialog();
}