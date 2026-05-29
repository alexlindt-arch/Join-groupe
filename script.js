document.addEventListener('DOMContentLoaded', function () {
    initHeaderAvatar();
    document.addEventListener('click', function (e) {
        if (!e.target.closest('#user-avatar-wrapper')) {
            document.getElementById('avatar-menu')?.classList.add('d-none');
        }
    });
});

function initHeaderAvatar() {
    const avatar = document.getElementById('user-avatar');
    if (!avatar) return;
    let user = null;
    try { user = JSON.parse(sessionStorage.getItem('currentUser')); } catch (e) {}
    avatar.textContent = user ? avatarInitials(user.name) : 'G';
}

function avatarInitials(name) {
    const parts = (name || '').trim().split(' ');
    return ((parts[0]?.charAt(0) || '') + (parts[1]?.charAt(0) || '')).toUpperCase() || 'G';
}

function toggleAvatarMenu() {
    document.getElementById('avatar-menu')?.classList.toggle('d-none');
}

function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = '../index.html';
}
