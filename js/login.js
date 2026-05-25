const FIREBASE_BASE = 'https://remotestorage-c0469-default-rtdb.europe-west1.firebasedatabase.app';
const USERS_URL = `${FIREBASE_BASE}/users.json`;

function switchForm(currentForm, targetForm) {
    document.getElementById(currentForm).classList.add('d-none');
    document.getElementById(targetForm).classList.remove('d-none');
    updateSignupButton(targetForm);
}

function updateSignupButton(activeForm) {
    const signupBtn = document.getElementById('signup_btn');
    if (!signupBtn) return;
    if (activeForm === 'login_section') {
        signupBtn.classList.remove('d-none');
    } else {
        signupBtn.classList.add('d-none');
    }
}

function showNotification(message, isError = false) {
    const notif = document.getElementById('notification');
    if (!notif) return;
    notif.textContent = message;
    notif.style.backgroundColor = isError ? 'var(--red)' : 'var(--primaryColor)';
    notif.classList.remove('d-none');
    setTimeout(() => notif.classList.add('d-none'), 3000);
}

async function loadUsers() {
    try {
        const response = await fetch(USERS_URL);
        const data = await response.json();
        if (!data) return [];
        return Array.isArray(data) ? data.filter(Boolean) : Object.values(data).filter(Boolean);
    } catch (e) {
        console.error('Fehler beim Laden der User:', e);
        return [];
    }
}

async function saveUserToFirebase(id, user) {
    await fetch(`${FIREBASE_BASE}/users/${id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });
}

async function saveContactToFirebase(id, contact) {
    await fetch(`${FIREBASE_BASE}/contacts/${id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact)
    });
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) color += letters[Math.floor(Math.random() * 16)];
    return color;
}

function getInitials(name) {
    const parts = name.trim().split(' ');
    const first = parts[0]?.charAt(0).toUpperCase() || '';
    const second = parts[1]?.charAt(0).toUpperCase() || '';
    return first + second;
}

async function login() {
    const email = document.getElementById('login_email').value.trim();
    const password = document.getElementById('login_passwort').value;

    const users = await loadUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        showNotification('Invalid email address or password.', true);
        return;
    }

    sessionStorage.setItem('currentUser', JSON.stringify({ id: user.id, name: user.name, email: user.email }));
    window.location.href = './html/summary.html';
}

function validateRegistrationForm() {
    const name = document.getElementById('reg_name').value.trim();
    const email = document.getElementById('reg_email').value.trim();
    const pw = document.getElementById('reg_passwort').value;
    const pwConfirm = document.getElementById('reg_password_confirm').value;
    const privacy = document.getElementById('reg_datenschutz').checked;
    const submitBtn = document.getElementById('reg_submit_btn');
    const hint = document.getElementById('pw_match_hint');

    if (hint) {
        if (pwConfirm.length > 0 && pw !== pwConfirm) {
            hint.textContent = 'Passwords don\'t match';
            hint.style.display = 'block';
        } else {
            hint.style.display = 'none';
        }
    }

    const isValid = name.length > 0 && email.length > 0 && pw.length > 0 && pw === pwConfirm && privacy;
    submitBtn.disabled = !isValid;
}

async function register() {
    const name = document.getElementById('reg_name').value.trim();
    const email = document.getElementById('reg_email').value.trim();
    const password = document.getElementById('reg_passwort').value;

    const users = await loadUsers();
    if (users.some(u => u.email === email)) {
        showNotification('This email address is already registered.', true);
        return;
    }

    const maxId = users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0);
    const newId = maxId + 1;

    const newUser = { id: newId, name, email, password };
    const newContact = {
        id: newId,
        name,
        email,
        phone: 'no phone number provided',
        color: getRandomColor(),
        avatar: getInitials(name)
    };

    try {
        await saveUserToFirebase(newId, newUser);
        await saveContactToFirebase(newId, newContact);
        showNotification('Registration successful!');
        setTimeout(() => switchForm('registration_section', 'login_section'), 2000);
    } catch (e) {
        console.error('Registration error:', e);
        showNotification('Registration failed.', true);
    }
}
