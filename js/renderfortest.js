import { state } from './state.js';
import * as utils from './utils.js';
import * as firebase from './firebase.js';
import * as nav from './nav.js';
import * as render from './render.js';
import * as matching from './matching.js';
import { ROLE_TAGS, INTEREST_TAGS } from './config.js';
import { t } from './i18n.js';

const TEST_EMOJIS = ['😀', '😊', '🤓', '😎', '🧑‍💻', '👩‍🔬', '👨‍🎨', '👩‍💼', '🙂', '😌', '🤔', '😏', '🥳', '😇', '🤗', '🧐', '😺', '🐶', '🦊', '🐼', '🦁', '🐯', '🐸', '🐵', '🦉', '🐧', '🦋', '🌟', '✨', '🔥'];

/**
 * 빠른 테스트: 현재 세션에 30명 랜덤 학생 추가 (세션 코드 유지)
 * 대시보드에 세션이 없으면 새 세션 생성 후 30명 추가
 */
export async function runQuickTest() {
    let session = state.currentSession;
    const hasSession = session && session.code;

    if (!hasSession) {
        const code = utils.generateSessionCode();
        session = {
            id: utils.generateId(),
            code,
            name: t('quickTestSessionName'),
            instructorName: 'Test Instructor',
            instructorEmoji: '👩‍🏫',
            instructorPassword: 'test123',
            teamSize: 4,
            selectedParams: ['role', 'interest'],
            weightRole: 50,
            weightInterest: 50,
            weightExtroversion: 0,
            status: 'open',
            students: {},
            teams: {},
            roleTags: [...ROLE_TAGS],
            interestTags: [...INTEREST_TAGS]
        };
        state.currentSession = session;
        await firebase.createSessionInDB(session);
    }

    const existingStudents = session.students || {};
    const mergedStudents = { ...existingStudents };
    const dummyStudents = matching.generateDummyStudents(30);
    dummyStudents.forEach((s, i) => {
        s.emoji = TEST_EMOJIS[i % TEST_EMOJIS.length];
        mergedStudents[s.id] = s;
    });

    try {
        await firebase.updateSessionInDB(session.code, { students: mergedStudents });
        state.currentSession = { ...session, students: mergedStudents };
        if (!hasSession) {
            state.isInstructor = true;
            firebase.listenToSession(session.code, (updatedSession) => {
                state.currentSession = updatedSession;
                if (state.currentScreen === 'instructor-dashboard') render.renderDashboard();
                else if (state.currentScreen === 'results') {
                    const teams = Object.values(updatedSession.teams || {});
                    const titleEl = document.getElementById('results-title');
                    if (titleEl) titleEl.textContent = t('allTeams');
                    const backBtn = document.getElementById('btn-back-dashboard');
                    if (backBtn) backBtn.style.display = 'block';
                    render.renderTeams(teams, true);
                }
            });
        }
        render.renderDashboard();
        nav.showScreen('instructor-dashboard');
    } catch (err) {
        alert('Quick test error: ' + err.message);
    }
}
