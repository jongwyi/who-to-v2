import { state } from './state.js';

function showLandingRoleModal() {
    const modal = document.getElementById('landing-role-modal');
    if (modal) {
        modal.classList.add('tutorial-overlay-visible');
        modal.setAttribute('aria-hidden', 'false');
    }
}

function hideLandingRoleModal() {
    const modal = document.getElementById('landing-role-modal');
    if (modal) {
        modal.classList.remove('tutorial-overlay-visible');
        modal.setAttribute('aria-hidden', 'true');
    }
}

function showLandingView() {
    const wrap = document.getElementById('landing-content-wrap');
    const studentView = document.getElementById('landing-student');
    const instructorView = document.getElementById('landing-instructor');
    if (wrap) wrap.style.display = 'block';
    if (state.landingRole === 'participant') {
        if (studentView) studentView.style.display = 'block';
        if (instructorView) instructorView.style.display = 'none';
    } else if (state.landingRole === 'instructor') {
        if (studentView) studentView.style.display = 'none';
        if (instructorView) instructorView.style.display = 'block';
    }
}

export function selectLandingRole(role) {
    state.landingRole = role;
    hideLandingRoleModal();
    showLandingView();
}

export function getLandingRole() {
    return state.landingRole;
}

export function initLandingRole() {
    const modal = document.getElementById('landing-role-modal');
    const cards = document.querySelectorAll('[data-landing-role]');
    const btnChangeRole = document.getElementById('btn-change-role');

    cards.forEach((card) => {
        card.addEventListener('click', () => {
            const role = card.getAttribute('data-landing-role');
            if (role) selectLandingRole(role);
        });
    });

    if (btnChangeRole) {
        btnChangeRole.addEventListener('click', (e) => {
            e.preventDefault();
            showLandingRoleModal();
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
            }
        });
    }

    if (!state.landingRole) {
        showLandingRoleModal();
    } else {
        hideLandingRoleModal();
        showLandingView();
    }
}
