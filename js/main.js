import { firebaseConfig } from './config.js';
import { state } from './state.js';
import * as utils from './utils.js';
import * as firebase from './firebase.js';
import * as tags from './tags.js';
import * as nav from './nav.js';
import * as matching from './matching.js';
import * as render from './render.js';
import * as i18n from './i18n.js';
import * as renderfortest from './renderfortest.js';
import * as tutorial from './tutorial.js';
import * as landingRole from './landing-role.js';
import * as copyserial from './copyserial.js';
import * as emojiPicker from './emoji-picker.js';

firebase.initFirebase(firebaseConfig);

window.WHO2MEET = {
    state,
    utils,
    firebase,
    tags,
    nav,
    matching,
    render,
    i18n,
    renderfortest,
    tutorial,
    landingRole,
    copyserial,
    emojiPicker
};

document.addEventListener('DOMContentLoaded', () => {
    const langBtn = document.getElementById('btn-lang-toggle');
    if (langBtn) {
        langBtn.textContent = i18n.getLang() === 'en' ? '한' : 'EN';
        langBtn.addEventListener('click', () => {
            const next = i18n.getLang() === 'en' ? 'ko' : 'en';
            i18n.setLang(next);
            langBtn.textContent = next === 'en' ? '한' : 'EN';
            i18n.applyToPage();
            tutorial.refreshIfVisible();
            if (state.currentScreen === 'instructor-dashboard') render.renderDashboard();
            else if (state.currentScreen === 'results') {
                const teams = state.currentSession?.teams ? Object.values(state.currentSession.teams) : [];
                const myTeam = state.currentStudent && teams.find(t => t.memberIds?.includes(state.currentStudent.id));
                const showAll = !myTeam;
                const titleEl = document.getElementById('results-title');
                if (titleEl) titleEl.textContent = showAll ? i18n.t('allTeams') : i18n.t('yourTeam');
                render.renderTeams(showAll ? teams : [myTeam], showAll);
            } else if (state.currentScreen === 'profile-input') render.renderProfileStep(state.profileStep || 1);
        });
    }
    i18n.applyToPage();
    if (typeof window.WHO2MEET_initEvents === 'function') {
        window.WHO2MEET_initEvents();
    }
    landingRole.initLandingRole();
    tutorial.initTutorial();
    copyserial.initCopySerial();
    emojiPicker.initEmojiPicker();
});
