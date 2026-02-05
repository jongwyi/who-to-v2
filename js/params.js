import { MATCHING_PARAMS } from './config.js';
import { ROLE_TAGS, INTEREST_TAGS } from './config.js';
import { t } from './i18n.js';
import { slugify } from './utils.js';

let paramLocked = false;

export function isParamLocked() {
    return paramLocked;
}

export function getSelectedParams() {
    const selected = [];
    MATCHING_PARAMS.forEach(p => {
        const toggle = document.getElementById(`param-toggle-${p.id}`);
        if (toggle && toggle.checked) selected.push(p.id);
    });
    return selected;
}

export function getParamWeights() {
    const selected = getSelectedParams();
    const weights = {};
    selected.forEach(id => {
        const el = document.getElementById(`weight-${id}`);
        if (el) weights[id] = parseInt(el.value, 10) || 0;
    });
    return weights;
}

export function validateParamSelection() {
    const selected = getSelectedParams();
    return selected.length >= 2;
}

export function initCreateParams() {
    paramLocked = false;
    const container = document.getElementById('param-tiles-scroll');
    if (!container) return;
    container.innerHTML = MATCHING_PARAMS.map(p => {
        const formHtml = p.hasForm
            ? (p.id === 'role'
                ? `<div class="param-form" id="param-form-${p.id}"><div id="create-role-tags-list" class="create-tags-list"></div><button type="button" class="btn btn-ghost btn-small btn-add-tag" data-param="role">+ Add role</button></div>`
                : p.id === 'interest'
                ? `<div class="param-form" id="param-form-${p.id}"><div id="create-interest-tags-list" class="create-tags-list"></div><button type="button" class="btn btn-ghost btn-small btn-add-tag" data-param="interest">+ Add interest</button></div>`
                : p.id === 'extroversion'
                ? `<div class="param-form param-form-extroversion" id="param-form-${p.id}">
                    <div class="extroversion-tags">
                        <span class="extroversion-tag extroversion-tag-intro">${t('introvertTag')}</span>
                        <span class="extroversion-tag extroversion-tag-extra">${t('extrovertTag')}</span>
                    </div>
                    <p class="hint-text extroversion-scale-hint">${t('extroversionScaleHint')}</p>
                   </div>`
                : '')
            : '';
        return `
        <div class="param-tile" data-param="${p.id}">
            <div class="param-tile-header">
                <span class="param-tile-label">${t(p.labelKey)}</span>
                <label class="param-toggle-wrap">
                    <input type="checkbox" id="param-toggle-${p.id}" class="param-toggle" ${p.defaultOn ? 'checked' : ''}>
                    <span class="param-toggle-slider"></span>
                </label>
            </div>
            <div class="param-tile-form" id="param-form-wrap-${p.id}" style="display: ${p.defaultOn ? 'block' : 'none'}">
                ${formHtml}
            </div>
        </div>`;
    }).join('');

    MATCHING_PARAMS.forEach(p => {
        const toggle = document.getElementById(`param-toggle-${p.id}`);
        const wrap = document.getElementById(`param-form-wrap-${p.id}`);
        if (toggle && wrap) {
            toggle.addEventListener('change', () => {
                if (paramLocked) { toggle.checked = !toggle.checked; return; }
                wrap.style.display = toggle.checked ? 'block' : 'none';
            });
        }
    });
}

export function populateDefaultTags() {
    const roleList = document.getElementById('create-role-tags-list');
    const interestList = document.getElementById('create-interest-tags-list');
    if (roleList) {
        roleList.innerHTML = '';
        ROLE_TAGS.forEach(tag => appendRoleRow(tag.emoji, tag.name));
    }
    if (interestList) {
        interestList.innerHTML = '';
        INTEREST_TAGS.forEach(tag => appendInterestRow(tag.emoji, tag.name));
    }
}

function appendRoleRow(emoji = '', name = '') {
    const list = document.getElementById('create-role-tags-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'create-tag-row';
    row.innerHTML = `
        <input type="text" class="form-input create-tag-emoji" value="${emoji}" placeholder="💻" maxlength="4">
        <input type="text" class="form-input create-tag-name" value="${name}" placeholder="Role name">
        <button type="button" class="btn btn-ghost btn-small btn-remove-tag" data-list="role" aria-label="Remove">✕</button>`;
    list.appendChild(row);
}

function appendInterestRow(emoji = '', name = '') {
    const list = document.getElementById('create-interest-tags-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'create-tag-row';
    row.innerHTML = `
        <input type="text" class="form-input create-tag-emoji" value="${emoji}" placeholder="🏥" maxlength="4">
        <input type="text" class="form-input create-tag-name" value="${name}" placeholder="Interest name">
        <button type="button" class="btn btn-ghost btn-small btn-remove-tag" data-list="interest" aria-label="Remove">✕</button>`;
    list.appendChild(row);
}

export function appendCreateRoleTagRow(emoji = '', name = '') {
    appendRoleRow(emoji, name);
}

export function appendCreateInterestTagRow(emoji = '', name = '') {
    appendInterestRow(emoji, name);
}

export function getCreateRoleTags() {
    const list = document.getElementById('create-role-tags-list');
    if (!list) return [];
    return getTagsFromList(list);
}

export function getCreateInterestTags() {
    const list = document.getElementById('create-interest-tags-list');
    if (!list) return [];
    return getTagsFromList(list);
}

function getTagsFromList(list) {
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

export function lockParamsAndShowWeights() {
    const selected = getSelectedParams();
    if (selected.length < 2) return false;
    paramLocked = true;
    MATCHING_PARAMS.forEach(p => {
        const toggle = document.getElementById(`param-toggle-${p.id}`);
        if (toggle) toggle.disabled = true;
    });
    renderWeightSliders(selected);
    return true;
}

function renderWeightSliders(selected) {
    const container = document.getElementById('weight-sliders-container');
    if (!container) return;
    const n = selected.length;
    const defaultVal = Math.floor(100 / n);
    let remainder = 100 - defaultVal * n;
    const values = selected.map((_, i) => defaultVal + (i < remainder ? 1 : 0));
    container.innerHTML = selected.map((id, i) => {
        const param = MATCHING_PARAMS.find(p => p.id === id);
        const label = param ? t(param.labelKey) : id;
        const icon = id === 'role' ? '💼' : id === 'interest' ? '🎯' : '🌡';
        return `
        <div class="weight-slider" data-param="${id}">
            <div class="weight-header">
                <span>${icon} <span>${label}</span></span>
                <span id="weight-${id}-value">${values[i]}%</span>
            </div>
            <input type="range" id="weight-${id}" min="0" max="100" value="${values[i]}">
        </div>`;
    }).join('');
    container.style.display = 'block';
    setupWeightSync(selected);
}

function setupWeightSync(selected) {
    const inputs = selected.map(id => document.getElementById(`weight-${id}`)).filter(Boolean);
    const displays = selected.map(id => document.getElementById(`weight-${id}-value`)).filter(Boolean);
    function sync(draggedIdx) {
        const n = inputs.length;
        if (n === 0) return;
        if (n === 1) {
            inputs[0].value = 100;
            if (displays[0]) displays[0].textContent = '100%';
            return;
        }
        const vals = inputs.map((inp, i) => parseInt(inp.value, 10) || 0);
        if (draggedIdx >= 0) {
            const draggedVal = Math.max(0, Math.min(100, vals[draggedIdx]));
            inputs[draggedIdx].value = draggedVal;
            const othersSum = 100 - draggedVal;
            const otherIndices = vals.map((_, i) => i).filter(i => i !== draggedIdx);
            const currentOthersSum = otherIndices.reduce((s, i) => s + (parseInt(inputs[i].value, 10) || 0), 0);
            if (currentOthersSum > 0) {
                let allocated = 0;
                otherIndices.forEach((i, j) => {
                    const isLast = j === otherIndices.length - 1;
                    const v = isLast ? othersSum - allocated : Math.round(othersSum * (parseInt(inputs[i].value, 10) || 0) / currentOthersSum);
                    const clamped = Math.max(0, Math.min(100, v));
                    inputs[i].value = clamped;
                    allocated += clamped;
                });
            } else {
                const per = Math.floor(othersSum / otherIndices.length);
                const rem = othersSum - per * otherIndices.length;
                otherIndices.forEach((i, j) => { inputs[i].value = per + (j < rem ? 1 : 0); });
            }
        } else {
            const total = vals.reduce((a, b) => a + b, 0);
            if (total !== 100 && total > 0) {
                vals.forEach((v, i) => { inputs[i].value = Math.round(100 * v / total); });
                const diff = 100 - inputs.reduce((s, inp) => s + (parseInt(inp.value, 10) || 0), 0);
                if (diff !== 0 && inputs[0]) inputs[0].value = (parseInt(inputs[0].value, 10) || 0) + diff;
            }
        }
        const finalVals = inputs.map(inp => parseInt(inp.value, 10) || 0);
        displays.forEach((d, i) => { if (d) d.textContent = (finalVals[i] || 0) + '%'; });
    }
    inputs.forEach((inp, idx) => inp.addEventListener('input', () => sync(idx)));
    sync(-1);
}

export function getWeightsForSession(selected) {
    const weights = {};
    let sum = 0;
    selected.forEach(id => {
        const el = document.getElementById(`weight-${id}`);
        weights[id] = el ? parseInt(el.value, 10) || 0 : 0;
        sum += weights[id];
    });
    if (sum > 0) {
        selected.forEach(id => { weights[id] = Math.round(weights[id] * 100 / sum); });
        const adj = 100 - selected.reduce((a, id) => a + weights[id], 0);
        if (adj !== 0 && selected[0]) weights[selected[0]] += adj;
    }
    return weights;
}
