function renderContactlist(contact) {
    return `<div class="contact-item" id="${contact.id}" onclick="showContactDetails('${contact.id}')">
        <div class="avatar" style="background-color: ${contact.color};">${contact.avatar}</div>
        <div class="contact-info">
            <span class="name">${contact.name}</span>
            <span class="email">${contact.email}</span>
        </div>
    </div>`;
}

function renderLetterGroupTemplate(letter, itemsHtml) {
    return `
        <div class="letter-group">
            <h2 class="letter-group-title">${letter}</h2>
            ${itemsHtml}
        </div>
    `;
}

function renderContactDetails(contact) {
    return `<div class="profile-header">
                        <div class="profile-avatar" style="background-color: ${contact.color};">${contact.avatar}</div>
                        <div class="profile-meta">
                            <h2 class="profile-name">${contact.name}</h2>
                            <div class="profile-actions" id="profile">
                                <button type="button" class="profile-btn" onclick="editContact('${contact.id}')">
                                <img src="../assets/icons/edit_contacts.svg"alt="edit"> Edit
                                </button>
                                <button type="button" class="profile-btn" onclick="deleteContact('${contact.id}')">
                                <img src="../assets/icons/delete.svg"alt="delete"> Delete
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="profile-body">
                        <h3 class="section-title">Contact Information</h3>

                        <div class="info-group">
                            <label class="info-label">E-mail</label>
                            <span class="info-value email-link">${contact.email}</span>
                        </div>

                        <div class="info-group">
                            <label class="info-label">Phone</label>
                            <span class="info-value">${contact.phone}</span>
                        </div>
                    </div>`;
}

function renderDialogContact(option = 'edit', contact = {}) {
    const isEdit = option === 'edit';
    const titleText = isEdit ? 'Edit contact' : 'Add contact';
    const actionButton = isEdit ? renderDialogContactEditButton(contact) : renderDialogCreateContactButton();

    return `<div class="modal-content" onclick="event.stopPropagation()">
            <div class="modal-left">
                <div class="modal-logo"><img src="../assets/img/logo_white.svg" alt="join icon"></div>
                <h2>${titleText}</h2>
                <p class="modal-tagline">Tasks are better with a team!</p>
            </div>

            <form method="dialog" class="modal-right">
                <button type="button" class="close-dialog" onclick="closeDialog()">×</button>

                <div class="profile-placeholder">
                    <i class="fa-solid fa-user"></i>
                </div>

                <div class="input-group">
                    <input type="text" placeholder="Name" required>
                    <i class="fa-solid fa-user"></i>
                </div>

                <div class="input-group">
                    <input type="email" placeholder="Email" required>
                    <i class="fa-solid fa-envelope"></i>
                </div>

                <div class="input-group">
                    <input type="tel" placeholder="Phone">
                    <i class="fa-solid fa-phone"></i>
                </div>

                <div class="modal-footer">
                    ${actionButton}
                </div>
            </form>
        </div> `;
}


function renderDialogContactEditButton(contact) {
    return `<button type="button" class="btn-cancel" onclick="deleteContact('${contact.id}')"> Delete <i
                class="fa-solid fa-xmark"></i></button>
            <button type="submit" class="btn-submit"> Save <i class="fa-solid fa-check"></i></button>`;
}

function renderDialogCreateContactButton() {
    return `<button type="button" class="btn-cancel" onclick="closeDialog()"> Cancel <i
                class="fa-solid fa-xmark"></i></button>
            <button type="submit" class="btn-submit"> Create contact <i class="fa-solid fa-check"></i></button>`;
}