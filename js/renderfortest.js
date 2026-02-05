import { state } from './state.js';
import * as utils from './utils.js';
import * as firebase from './firebase.js';
import * as nav from './nav.js';
import * as render from './render.js';
import * as matching from './matching.js';
import { ROLE_TAGS, INTEREST_TAGS } from './config.js';

const TEST_EMOJIS = ['😀', '😊', '🤓', '😎', '🧑‍💻', '👩‍🔬', '👨‍🎨', '👩‍💼', '🙂', '😌', '🤔', '😏', '🥳', '😇', '🤗', '🧐', '😺', '🐶', '🦊', '🐼', '🦁', '🐯', '🐸', '🐵', '🦉', '🐧', '🦋', '🌟', '✨', '🔥'];

/**
 * 빠른 테스트: 세션 생성 + 30명 랜덤 학생 생성 후 대시보드로 이동
 */
export async function runQuickTest() {
    const code = utils.generateSessionCode();
    const newSession = {
        id: utils.generateId(),
        code,
        name: 'Quick Test Session (30 users)',
        instructorName: 'Test Instructor',
        instructorEmoji: '👩‍🏫',
        instructorPassword: 'test123',
        teamSize: 4,
        weightRole: 50,
        weightInterest: 50,
        status: 'open',
        students: {},
        teams: {},
        roleTags: [...ROLE_TAGS],
        interestTags: [...INTEREST_TAGS]
    };

    state.currentSession = newSession;
    const dummyStudents = matching.generateDummyStudents(30);

    dummyStudents.forEach((s, i) => {
        s.emoji = TEST_EMOJIS[i % TEST_EMOJIS.length];
        newSession.students[s.id] = s;
    });

    try {
        await firebase.createSessionInDB(newSession);
        state.isInstructor = true;
        firebase.listenToSession(code, (updatedSession) => {
            state.currentSession = updatedSession;
            if (state.currentScreen === 'instructor-dashboard') render.renderDashboard();
            else if (state.currentScreen === 'results') {
                const teams = Object.values(updatedSession.teams || {});
                const titleEl = document.getElementById('results-title');
                if (titleEl) titleEl.textContent = 'All Teams';
                const backBtn = document.getElementById('btn-back-dashboard');
                if (backBtn) backBtn.style.display = 'block';
                render.renderTeams(teams, true);
            }
        });
        render.renderDashboard();
        nav.showScreen('instructor-dashboard');
    } catch (err) {
        alert('Quick test error: ' + err.message);
    }
}
