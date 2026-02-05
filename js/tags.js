import { ROLE_TAGS, INTEREST_TAGS } from './config.js';
import { state } from './state.js';
import { slugify } from './utils.js';

export function getRoleTags(session) {
    if (session && session.roleTags && session.roleTags.length > 0) return session.roleTags;
    return ROLE_TAGS;
}

export function getInterestTags(session) {
    if (session && session.interestTags && session.interestTags.length > 0) return session.interestTags;
    return INTEREST_TAGS;
}

export function initCreateSessionTags() {
    const roleList = document.getElementById('create-role-tags-list');
    const interestList = document.getElementById('create-interest-tags-list');
    if (!roleList || !interestList) return;
    roleList.innerHTML = '';
    interestList.innerHTML = '';
    ROLE_TAGS.forEach(t => appendCreateRoleTagRow(t.emoji, t.name));
    INTEREST_TAGS.forEach(t => appendCreateInterestTagRow(t.emoji, t.name));
}

export function appendCreateRoleTagRow(emoji = '', name = '') {
    const list = document.getElementById('create-role-tags-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'create-tag-row';
    row.innerHTML = `
        <input type="text" class="form-input create-tag-emoji" value="${emoji}" placeholder="💻" maxlength="4">
        <input type="text" class="form-input create-tag-name" value="${name}" placeholder="Role name">
        <button type="button" class="btn btn-ghost btn-small btn-remove-tag" data-list="role" aria-label="Remove">✕</button>
    `;
    list.appendChild(row);
}

export function appendCreateInterestTagRow(emoji = '', name = '') {
    const list = document.getElementById('create-interest-tags-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'create-tag-row';
    row.innerHTML = `
        <input type="text" class="form-input create-tag-emoji" value="${emoji}" placeholder="🏥" maxlength="4">
        <input type="text" class="form-input create-tag-name" value="${name}" placeholder="Interest name">
        <button type="button" class="btn btn-ghost btn-small btn-remove-tag" data-list="interest" aria-label="Remove">✕</button>
    `;
    list.appendChild(row);
}

export function getCreateRoleTags() {
    const list = document.getElementById('create-role-tags-list');
    if (!list) return [];
    const seen = {};
    return [...list.querySelectorAll('.create-tag-row')].map(row => {
        const emoji = (row.querySelector('.create-tag-emoji')?.value || '').trim() || '•';
        const name = (row.querySelector('.create-tag-name')?.value || '').trim();
        if (!name) return null;
        let id = slugify(name);
        if (seen[id]) { let n = 1; while (seen[id + '-' + n]) n++; id = id + '-' + n; }
        seen[id] = true;
        return { id, name, emoji };
    }).filter(Boolean);
}

export function getCreateInterestTags() {
    const list = document.getElementById('create-interest-tags-list');
    if (!list) return [];
    const seen = {};
    return [...list.querySelectorAll('.create-tag-row')].map(row => {
        const emoji = (row.querySelector('.create-tag-emoji')?.value || '').trim() || '•';
        const name = (row.querySelector('.create-tag-name')?.value || '').trim();
        if (!name) return null;
        let id = slugify(name);
        if (seen[id]) { let n = 1; while (seen[id + '-' + n]) n++; id = id + '-' + n; }
        seen[id] = true;
        return { id, name, emoji };
    }).filter(Boolean);
}
