import { state } from './state.js';

export function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    const el = document.getElementById(screenId);
    if (el) el.classList.add('active');
    state.currentScreen = screenId;
}
