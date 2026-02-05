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
    renderfortest
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
        });
    }
    i18n.applyToPage();
    if (typeof window.WHO2MEET_initEvents === 'function') {
        window.WHO2MEET_initEvents();
    }
});
