
function initMain() {
    setHeaderAvatar();
}

function getInitials(name) {
    if (!name) return 'no Name';

    const nameParts = name.split(' ');
    const firstNameChar = nameParts[0].charAt(0).toUpperCase();
    const lastNameChar = nameParts[1].charAt(0).toUpperCase();
    return firstNameChar + lastNameChar;
}

/**
 * Returns a random hex color (used as a fallback avatar color).
 * @returns {string} Hex color string.
 */
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function setHeaderAvatar() {
    const avatar = document.getElementById('user-avatar');
    if (!avatar) return;
    let user = null;
    try { user = JSON.parse(sessionStorage.getItem('currentUser')); } catch (error) { user = null; }
    avatar.textContent = user ? getInitials(user.name) : 'G';
}