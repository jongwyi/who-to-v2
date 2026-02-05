/**
 * emoji-picker.js — 이모지 입력란(.js-emoji-input, .create-tag-emoji) 클릭 시 피커 표시
 * emoji-picker-element 사용 (CDN 동적 로드)
 */

const PICKER_CDN = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@1/+esm';
const EMOJI_SELECTOR = '.js-emoji-input, .create-tag-emoji';
const MAX_EMOJI_LENGTH = 4;

let pickerInstance = null;
let pickerRoot = null;
let currentTarget = null;
let loadPromise = null;

function getRoot() {
    if (!pickerRoot) {
        pickerRoot = document.getElementById('emoji-picker-root');
        if (!pickerRoot) {
            pickerRoot = document.createElement('div');
            pickerRoot.id = 'emoji-picker-root';
            pickerRoot.className = 'emoji-picker-root';
            pickerRoot.setAttribute('aria-hidden', 'true');
            document.body.appendChild(pickerRoot);
        }
    }
    return pickerRoot;
}

function loadPickerLibrary() {
    if (!loadPromise) loadPromise = import(/* webpackIgnore: true */ PICKER_CDN);
    return loadPromise;
}

function createPicker() {
    if (pickerInstance) return pickerInstance;
    const root = getRoot();
    const picker = document.createElement('emoji-picker');
    picker.classList.add('emoji-picker-inline');
    picker.addEventListener('emoji-click', (e) => {
        const d = e.detail || {};
        const unicode = d.unicode ?? d.emoji ?? (typeof d === 'string' ? d : '');
        const emoji = String(unicode).slice(0, MAX_EMOJI_LENGTH);
        if (currentTarget && emoji) {
            currentTarget.value = emoji;
            currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
        }
        hide();
    });
    root.appendChild(picker);
    pickerInstance = picker;
    return picker;
}

function positionPicker(anchor) {
    const root = getRoot();
    const rect = anchor.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    root.style.position = 'absolute';
    root.style.top = `${rect.bottom + scrollY + 4}px`;
    root.style.left = `${rect.left + scrollX}px`;
    root.style.right = 'auto';
    root.style.bottom = 'auto';
    // 화면 밖으로 나가면 위로 열기
    const pickerEl = root.querySelector('emoji-picker');
    if (pickerEl) {
        const pickerHeight = 320;
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < pickerHeight && rect.top > pickerHeight) {
            root.style.top = `${rect.top + scrollY - pickerHeight - 8}px`;
        }
    }
}

function show(anchorEl) {
    currentTarget = anchorEl;
    const root = getRoot();
    loadPickerLibrary().then(() => {
        createPicker();
        positionPicker(anchorEl);
        root.classList.add('emoji-picker-root-visible');
        root.setAttribute('aria-hidden', 'false');
    });
}

function hide() {
    currentTarget = null;
    const root = getRoot();
    root.classList.remove('emoji-picker-root-visible');
    root.setAttribute('aria-hidden', 'true');
}

function isPickerClick(target) {
    const root = getRoot();
    return root.contains(target) || target.closest && target.closest('#emoji-picker-root');
}

function handleClick(e) {
    const el = e.target.closest && e.target.closest(EMOJI_SELECTOR);
    if (el) {
        e.preventDefault();
        el.focus();
        show(el);
        return;
    }
    if (!isPickerClick(e.target)) hide();
}

function handleFocus(e) {
    if (e.target.matches && e.target.matches(EMOJI_SELECTOR)) show(e.target);
}

export function initEmojiPicker() {
    getRoot();
    document.addEventListener('click', handleClick, true);
    document.addEventListener('focusin', (e) => {
        if (e.target.matches && e.target.matches(EMOJI_SELECTOR)) show(e.target);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hide();
    });
}
