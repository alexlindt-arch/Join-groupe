document.addEventListener('DOMContentLoaded', function () {
    initMain();
    document.addEventListener('click', function (e) {
        if (!e.target.closest('#user-avatar-wrapper')) {
            document.getElementById('avatar-menu')?.classList.add('d-none');
        }
    });
});

function initMain() {

    setHeaderAvatar();
    loadNavigation();
}

function getInitials(name) {
    if (!name) return 'G';
    const nameParts = name.trim().split(' ');
    const firstNameChar = nameParts[0]?.charAt(0).toUpperCase() || '';
    const lastNameChar = nameParts[1]?.charAt(0).toUpperCase() || '';

    return (firstNameChar + lastNameChar) || 'G';
}

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
    try { user = JSON.parse(sessionStorage.getItem('currentUser')); } catch (e) {}
    avatar.textContent = user ? getInitials(user.name) : 'G';
}

function toggleAvatarMenu() {
    document.getElementById('avatar-menu')?.classList.toggle('d-none');
}

function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = '../index.html';
}

function setActiveNavLink() {
    const page = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-link, .nav-bottom-link').forEach(link => {
        if (link.getAttribute('href')?.endsWith(page)) link.classList.add('nav-item--active');
    });
    // Entferne aktiv von allen mobilen Links
    document.querySelectorAll('.mobil-nav-link').forEach(link => link.classList.remove('aktiv'));
    // Setze aktiv nur für Privacy Policy oder Legal Notice
    if (page === 'privacy_policy.html') {
        document.querySelectorAll('.mobil-nav-link[href$="privacy_policy.html"]').forEach(link => link.classList.add('aktiv'));
    } else if (page === 'legal_notice.html') {
        document.querySelectorAll('.mobil-nav-link[href$="legal_notice.html"]').forEach(link => link.classList.add('aktiv'));
    }
}

function updateNavigationForUser(user) {
    if (!user) {
        const navGroup = document.querySelector('.navigation-links-group');
        if (navGroup) navGroup.innerHTML = `<a href="../index.html" class="nav-link" id="nav_login"><img src="../assets/icons/login.svg" alt="" class="nav-icon"><span>Log In</span></a>`;
        const mobilNav = document.querySelector('.mobil-navigation');
        if (mobilNav) {
            const page = window.location.pathname.split('/').pop();
            const isPrivacy = page === 'privacy_policy.html';
            const isLegal = page === 'legal_notice.html';
            mobilNav.innerHTML = `
                <a href="../index.html" class="mobil-nav-link">
                    <img src="../assets/icons/login.svg" alt="" class="mobil-nav-icon">
                    <span>Log In</span>
                </a>
                <a href="privacy_policy.html" class="mobil-nav-link${isPrivacy ? ' aktiv' : ''}">Privacy Policy</a>
                <a href="legal_notice.html" class="mobil-nav-link${isLegal ? ' aktiv' : ''}">Legal Notice</a>
            `;
        }
    }
}

function updateHeaderForUser(user) {
    if (!user) {
        const helpIcon = document.querySelector('.help-icon-link');
        if (helpIcon) helpIcon.style.display = 'none';
        const avatarWrapper = document.getElementById('user-avatar-wrapper');
        if (avatarWrapper) avatarWrapper.style.display = 'none';
    }
}

async function loadNavigation() {
    const includeElements = document.querySelectorAll('[data-import]');
    for (let element of includeElements) {
        const filePath = element.getAttribute("data-import");
        try {
            const answer = await fetch(filePath);
            if (answer.ok) {
                element.innerHTML = await answer.text();
                setHeaderAvatar();
            } else {
                element.innerHTML = '<p>Navigation could not be loaded</p>';
            }
        } catch (error) {
            console.error("Error loading navigation:", error);
        }
    }
    let user = null;
    try { user = JSON.parse(sessionStorage.getItem('currentUser')); } catch (e) {}
    updateNavigationForUser(user);
    updateHeaderForUser(user);
    setActiveNavLink();
}

const protectedPages = ['summary.html', 'add_task.html', 'board.html', 'contacts.html', 'help.html'];
const currentPage = window.location.pathname.split('/').pop();
if (protectedPages.includes(currentPage)) {
    const user = sessionStorage.getItem('currentUser');
    if (!user) {
        window.location.href = '../index.html';
    }
}