import { state } from './state.js';
import { getRoleTags, getInterestTags } from './tags.js';
import { t, tf } from './i18n.js';
/** Returns ordered step types for profile (role, interest, extroversion if enabled, then message) */
export function getVisibleProfileSteps(session) {
    const params = session?.selectedParams || ['role', 'interest'];
    const steps = [...params];
    if (!steps.includes('message')) steps.push('message');
    return steps;
}

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

const STEP_TITLE_KEYS = { role: 'stepYourRoles', interest: 'stepYourInterests', extroversion: 'stepExtroversion', message: 'stepMessageToTeam' };

export function renderProfileStep(step) {
    const session = state.currentSession;
    const visibleSteps = getVisibleProfileSteps(session);
    state.profileStep = step;

    const dotsContainer = document.getElementById('profile-steps-dots');
    if (dotsContainer) {
        dotsContainer.innerHTML = visibleSteps.map((_, i) =>
            `<span class="step-dot ${i + 1 === step ? 'active' : ''} ${i + 1 < step ? 'completed' : ''}" data-step="${i + 1}"></span>`
        ).join('');
    }

    const stepType = visibleSteps[step - 1];
    const titleEl = document.getElementById('profile-step-title');
    if (titleEl) titleEl.textContent = tf('stepCounter', step, visibleSteps.length) + ' — ' + t(STEP_TITLE_KEYS[stepType] || stepType);

    document.querySelectorAll('.profile-step').forEach(el => {
        const type = el.dataset.stepType;
        el.classList.toggle('active', type === stepType);
    });

    const backBtn = document.getElementById('btn-profile-back');
    if (backBtn) backBtn.textContent = step === 1 ? '← ' + t('back') : '← ' + t('previous');
    const nextBtn = document.getElementById('btn-profile-next');
    if (nextBtn) nextBtn.textContent = step === visibleSteps.length ? t('submit') : t('next');

    if (stepType === 'role') updateRolePrioritySummary();
    if (stepType === 'extroversion') {
        const slider = document.getElementById('extroversion-slider');
        const valueEl = document.getElementById('extroversion-value');
        if (slider) { slider.value = state.extroversionScore; }
        if (valueEl) valueEl.textContent = state.extroversionScore;
    }
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
    const params = session?.selectedParams || ['role', 'interest'];
    const roleTags = getRoleTags(session);
    const interestTags = getInterestTags(session);
    const findRole = (id) => roleTags.find(t => t.id === id);
    const findInterest = (id) => interestTags.find(t => t.id === id);
    if (!teams || teams.length === 0) {
        container.innerHTML = `<p class="text-secondary">${t('noTeamsYet')}</p>`;
        return;
    }
    container.innerHTML = teams.map(team => {
        const showInterest = params.includes('interest');
        const sharedInterestIds = showInterest ? getTeamSharedInterestIds(team) : [];
        return `
        <div class="team-card">
            <div class="team-header">
                <h3 class="team-name">🎯 ${team.name}</h3>
                <span class="team-score">${t('cohesion')}: ${(team.cohesionScore * 100).toFixed(0)}%</span>
            </div>
            ${showInterest && sharedInterestIds.length > 0 ? `
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
                let roleLine = '';
                if (params.includes('role')) {
                    const first = member.roleTagIds && member.roleTagIds.length >= 1 ? findRole(member.roleTagIds[0]) : null;
                    const second = member.roleTagIds && member.roleTagIds.length >= 2 ? findRole(member.roleTagIds[1]) : null;
                    roleLine = (first || second) ? `${t('priority1st')} ${first ? first.emoji + ' ' + first.name : '—'} · ${t('priority2nd')} ${second ? second.emoji + ' ' + second.name : '—'}` : '';
                }
                let interestBlock = '';
                if (params.includes('interest')) {
                    const interestNames = (member.interestTagIds || []).filter(id => id !== 'others').map(id => findInterest(id)).filter(Boolean).map(x => x.emoji + ' ' + x.name);
                    if (member.customInterest) interestNames.push('✏️ ' + member.customInterest);
                    if (interestNames.length) interestBlock = `<div class="member-interest-realm">${t('interestLabel')} ${interestNames.join(', ')}</div>`;
                }
                let extroBlock = '';
                if (params.includes('extroversion') && typeof member.extroversionScore === 'number') {
                    const score = member.extroversionScore;
                    const isExtro = score >= 6;
                    const label = isExtro ? t('extrovertedLabel') : t('introvertedLabel');
                    const tagClass = isExtro ? 'member-extro-tag member-extro-tag-blue' : 'member-extro-tag member-extro-tag-white';
                    extroBlock = `<div class="member-extroversion"><span class="${tagClass}">${label}: ${score}${t('pointsSuffix')}</span></div>`;
                }
                return `<div class="member-card ${isNew ? 'member-card-new' : ''}">
                    <div class="member-name">${member.emoji || '👤'} ${member.name}${isNew ? `<span class="member-new-badge">${t('new')}</span>` : ''}${state.currentStudent && member.id === state.currentStudent.id ? `<span class="member-you">${t('you')}</span>` : ''}</div>
                    ${roleLine ? `<div class="member-role-line">${roleLine}</div>` : ''}
                    ${interestBlock}
                    ${extroBlock}
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
    if (detailsEl) {
        const params = session.selectedParams || ['role', 'interest'];
        const w = (k) => session['weight' + k.charAt(0).toUpperCase() + k.slice(1)] ?? 0;
        const labels = { role: 'Role', interest: 'Interest', extroversion: 'Extroversion' };
        const weightStr = params.map(p => `${w(p)}% ${labels[p] || p}`).join(' / ');
        detailsEl.textContent = `${t('teamSize')}: ${session.teamSize} • Weights: ${weightStr}`;
    }
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
    const visibleSteps = getVisibleProfileSteps(state.currentSession);
    const stepType = visibleSteps[state.profileStep - 1];
    let valid = false;
    if (stepType === 'role') valid = state.selectedRoles.length === 2;
    else if (stepType === 'interest') {
        valid = state.selectedInterests.length > 0;
        if (state.selectedInterests.includes('others')) {
            const customInput = document.getElementById('custom-interest');
            valid = valid && customInput && customInput.value.trim().length > 0;
        }
    } else if (stepType === 'extroversion' || stepType === 'message') valid = true;
    nextBtn.disabled = !valid;
}
