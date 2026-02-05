import { state } from './state.js';
import { getRoleTags, getInterestTags } from './tags.js';
import { t, tf } from './i18n.js';

export function renderRoleTags() {
    const session = state.currentSession;
    const tags = getRoleTags(session);
    const container = document.getElementById('role-tags');
    if (!container) return;
    container.innerHTML = tags.map(tag => {
        const idx = state.selectedRoles.indexOf(tag.id);
        const priorityLabel = idx >= 0 ? `<span class="tag-priority">${idx === 0 ? t('priority1st') : t('priority2nd')}</span>` : '';
        return `
        <div class="tag-item ${state.selectedRoles.includes(tag.id) ? 'selected' : ''}" data-tag-id="${tag.id}" data-tag-type="role">
            <span class="tag-emoji">${tag.emoji}</span>
            <span class="tag-name">${tag.name}</span>
            ${priorityLabel}
        </div>`;
    }).join('');
}

export function updateRolePrioritySummary() {
    const el = document.getElementById('role-priority-summary');
    if (!el) return;
    const session = state.currentSession;
    const roleTags = getRoleTags(session);
    if (state.selectedRoles.length === 0) { el.textContent = ''; return; }
    const labels = state.selectedRoles.map((id, i) => {
        const tag = roleTags.find(t => t.id === id);
        return tag ? `${i === 0 ? t('priority1st') : t('priority2nd')}: ${tag.emoji} ${tag.name}` : '';
    }).filter(Boolean);
    el.textContent = labels.length ? t('yourPriorities') + labels.join(' → ') : '';
}

export function renderInterestTags() {
    const session = state.currentSession;
    const tags = getInterestTags(session);
    const container = document.getElementById('interest-tags');
    if (!container) return;
    container.innerHTML = tags.map(tag => `
        <div class="tag-item ${state.selectedInterests.includes(tag.id) ? 'selected' : ''}" data-tag-id="${tag.id}" data-tag-type="interest">
            <span class="tag-emoji">${tag.emoji}</span>
            <span class="tag-name">${tag.name}</span>
        </div>`).join('');
}

export function renderProfileStep(step) {
    state.profileStep = step;
    document.querySelectorAll('.step-dot').forEach((dot, i) => {
        dot.classList.remove('active', 'completed');
        if (i + 1 === step) dot.classList.add('active');
        if (i + 1 < step) dot.classList.add('completed');
    });
    const titles = [t('stepYourRoles'), t('stepYourInterests'), t('stepMessageToTeam')];
    const titleEl = document.getElementById('profile-step-title');
    if (titleEl) titleEl.textContent = `Step ${step}/3 — ${titles[step - 1]}`;
    document.querySelectorAll('.profile-step').forEach((el, i) => el.classList.toggle('active', i + 1 === step));
    const backBtn = document.getElementById('btn-profile-back');
    if (backBtn) backBtn.textContent = step === 1 ? '← ' + t('back') : '← ' + t('previous');
    const nextBtn = document.getElementById('btn-profile-next');
    if (nextBtn) nextBtn.textContent = step === 3 ? t('submit') : t('next');
    if (step === 1) updateRolePrioritySummary();
}

export function getTeamSharedInterestIds(team) {
    const members = team.members || [];
    if (members.length === 0) return [];
    const allInterestSets = members.map(m => new Set((m.interestTagIds || []).filter(id => id !== 'others')));
    const firstSet = allInterestSets[0];
    return [...firstSet].filter(id => allInterestSets.every(s => s.has(id)));
}

export function renderTeams(teams, showAll = false) {
    const container = document.getElementById('teams-container');
    if (!container) return;
    const session = state.currentSession;
    const roleTags = getRoleTags(session);
    const interestTags = getInterestTags(session);
    const findRole = (id) => roleTags.find(t => t.id === id);
    const findInterest = (id) => interestTags.find(t => t.id === id);
    if (!teams || teams.length === 0) {
        container.innerHTML = `<p class="text-secondary">${t('noTeamsYet')}</p>`;
        return;
    }
    container.innerHTML = teams.map(team => {
        const sharedInterestIds = getTeamSharedInterestIds(team);
        return `
        <div class="team-card">
            <div class="team-header">
                <h3 class="team-name">🎯 ${team.name}</h3>
                <span class="team-score">${t('cohesion')}: ${(team.cohesionScore * 100).toFixed(0)}%</span>
            </div>
            ${sharedInterestIds.length > 0 ? `
            <div class="team-shared-interests">
                <span class="team-shared-label">${t('allFondOf')}</span>
                <div class="team-shared-tags">
                    ${sharedInterestIds.map(id => {
                        const tag = findInterest(id);
                        return tag ? `<span class="team-shared-tag">${tag.emoji} ${tag.name}</span>` : '';
                    }).join('')}
                </div>
            </div>` : ''}
            ${(team.members || []).map(member => {
                const isNew = (team.newMemberIds && team.newMemberIds.includes(member.id));
                const first = member.roleTagIds && member.roleTagIds.length >= 1 ? findRole(member.roleTagIds[0]) : null;
                const second = member.roleTagIds && member.roleTagIds.length >= 2 ? findRole(member.roleTagIds[1]) : null;
                const roleLine = (first || second) ? `${t('priority1st')} ${first ? first.emoji + ' ' + first.name : '—'} · ${t('priority2nd')} ${second ? second.emoji + ' ' + second.name : '—'}` : '';
                const interestNames = (member.interestTagIds || []).filter(id => id !== 'others').map(id => findInterest(id)).filter(Boolean).map(t => t.emoji + ' ' + t.name);
                if (member.customInterest) interestNames.push('✏️ ' + member.customInterest);
                return `<div class="member-card ${isNew ? 'member-card-new' : ''}">
                    <div class="member-name">${member.emoji || '👤'} ${member.name}${isNew ? `<span class="member-new-badge">${t('new')}</span>` : ''}${state.currentStudent && member.id === state.currentStudent.id ? `<span class="member-you">${t('you')}</span>` : ''}</div>
                    ${roleLine ? `<div class="member-role-line">${roleLine}</div>` : ''}
                    ${interestNames.length ? `<div class="member-interest-realm">${t('interestLabel')} ${interestNames.join(', ')}</div>` : ''}
                    ${member.messageToTeam ? `<p class="member-message">"${member.messageToTeam}"</p>` : ''}
                </div>`;
            }).join('')}
        </div>`;
    }).join('');
}

export function renderDashboard() {
    const session = state.currentSession;
    if (!session) return;
    const codeEl = document.getElementById('dashboard-code');
    if (codeEl) codeEl.textContent = session.code;
    const nameEl = document.getElementById('dashboard-session-name');
    if (nameEl) nameEl.textContent = session.name;
    const detailsEl = document.getElementById('dashboard-details');
    if (detailsEl) detailsEl.textContent = `${t('teamSize')}: ${session.teamSize} • ${tf('dashboardWeights', session.weightRole, session.weightInterest)}`;
    const statusEl = document.getElementById('dashboard-status');
    if (statusEl) statusEl.textContent = session.status === 'published' ? t('teamsPublished') : t('openForRegistration');
    const countEl = document.getElementById('dashboard-student-count');
    if (countEl) countEl.textContent = tf('studentsJoinedCount', session.students ? Object.keys(session.students).length : 0);
    const runBtn = document.getElementById('btn-run-matching');
    if (runBtn) runBtn.textContent = session.status === 'published' ? t('viewResults') : '🎲 ' + t('runMatching');
}

export function validateProfileStep() {
    const nextBtn = document.getElementById('btn-profile-next');
    if (!nextBtn) return;
    let valid = false;
    if (state.profileStep === 1) valid = state.selectedRoles.length === 2;
    else if (state.profileStep === 2) {
        valid = state.selectedInterests.length > 0;
        if (state.selectedInterests.includes('others')) {
            const customInput = document.getElementById('custom-interest');
            valid = valid && customInput && customInput.value.trim().length > 0;
        }
    } else if (state.profileStep === 3) valid = true;
    nextBtn.disabled = !valid;
}
