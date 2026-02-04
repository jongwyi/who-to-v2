// ============================================
// WHO-TO V2 - Main Application Logic
// ============================================

// ============================================
// TAG DEFINITIONS
// ============================================

const ROLE_TAGS = [
    { id: 'engineer', name: 'Engineer', emoji: '💻' },
    { id: 'researcher', name: 'Researcher', emoji: '🔬' },
    { id: 'data-analyst', name: 'Data Analyst', emoji: '📊' },
    { id: 'designer', name: 'Designer', emoji: '🎨' },
    { id: 'speech-giver', name: 'Speech Giver', emoji: '🎤' }
];

const INTEREST_TAGS = [
    { id: 'health-care', name: 'Health Care', emoji: '🏥' },
    { id: 'edu-tech', name: 'Edu Tech', emoji: '📚' },
    { id: 'fin-tech', name: 'Fin Tech', emoji: '💰' },
    { id: 'social-impact', name: 'Social Impact', emoji: '🌍' },
    { id: 'others', name: 'Others', emoji: '✏️' }
];

// ============================================
// APPLICATION STATE
// ============================================

const state = {
    currentScreen: 'landing',
    profileStep: 1,

    // Session data
    sessions: {},  // id -> session
    sessionsByCode: {},  // code -> id

    // Current user state
    currentSession: null,
    currentStudent: null,
    isInstructor: false,

    // Form state
    selectedRoles: [],
    selectedInterests: [],
    customInterest: '',
    messageToTeam: ''
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9);
}

function generateSessionCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ============================================
// SCREEN NAVIGATION
// ============================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    state.currentScreen = screenId;
}

// ============================================
// MATCHING ALGORITHM
// ============================================

function jaccardSimilarity(setA, setB) {
    if (setA.size === 0 && setB.size === 0) return 0.5;
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
}

function jaccardDistance(setA, setB) {
    return 1 - jaccardSimilarity(setA, setB);
}

function calculatePairwiseScore(studentA, studentB, weights) {
    const rolesA = new Set(studentA.roleTagIds);
    const rolesB = new Set(studentB.roleTagIds);
    const roleDiversity = jaccardDistance(rolesA, rolesB);

    const interestsA = new Set(studentA.interestTagIds);
    const interestsB = new Set(studentB.interestTagIds);
    const interestSimilarity = jaccardSimilarity(interestsA, interestsB);

    return weights.role * roleDiversity + weights.interest * interestSimilarity;
}

function buildCompatibilityMatrix(students, weights) {
    const n = students.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const score = calculatePairwiseScore(students[i], students[j], weights);
            matrix[i][j] = score;
            matrix[j][i] = score;
        }
    }

    return matrix;
}

function calculateTeamCohesion(teamIndices, matrix) {
    if (teamIndices.length < 2) return 0;
    let total = 0;
    let pairs = 0;

    for (let i = 0; i < teamIndices.length; i++) {
        for (let j = i + 1; j < teamIndices.length; j++) {
            total += matrix[teamIndices[i]][teamIndices[j]];
            pairs++;
        }
    }

    return pairs > 0 ? total / pairs : 0;
}

function greedyTeamFormation(students, teamSize, matrix) {
    const n = students.length;
    const numTeams = Math.ceil(n / teamSize);
    const assigned = Array(n).fill(false);
    const teams = [];

    for (let t = 0; t < numTeams; t++) {
        const team = [];

        // Find best seed
        let bestSeed = -1;
        let bestAvg = -1;

        for (let i = 0; i < n; i++) {
            if (!assigned[i]) {
                const avgCompat = matrix[i].reduce((a, b) => a + b, 0) / n;
                if (avgCompat > bestAvg) {
                    bestAvg = avgCompat;
                    bestSeed = i;
                }
            }
        }

        if (bestSeed >= 0) {
            team.push(bestSeed);
            assigned[bestSeed] = true;
        }

        // Greedily add members
        while (team.length < teamSize) {
            let bestCandidate = -1;
            let bestScore = -1;

            for (let candidate = 0; candidate < n; candidate++) {
                if (assigned[candidate]) continue;

                const avgWithTeam = team.reduce(
                    (sum, member) => sum + matrix[candidate][member], 0
                ) / team.length;

                if (avgWithTeam > bestScore) {
                    bestScore = avgWithTeam;
                    bestCandidate = candidate;
                }
            }

            if (bestCandidate >= 0) {
                team.push(bestCandidate);
                assigned[bestCandidate] = true;
            } else {
                break;
            }
        }

        if (team.length > 0) {
            teams.push(team);
        }
    }

    return teams;
}

function runMatching(session) {
    const students = session.students;
    if (students.length === 0) return [];

    const total = session.weightRole + session.weightInterest;
    const weights = {
        role: session.weightRole / total,
        interest: session.weightInterest / total
    };

    const matrix = buildCompatibilityMatrix(students, weights);
    const teamIndices = greedyTeamFormation(students, session.teamSize, matrix);

    const teams = teamIndices.map((indices, i) => {
        const teamId = generateId();
        const teamName = `Team ${String.fromCharCode(65 + i)}`;
        const cohesionScore = calculateTeamCohesion(indices, matrix);
        const members = indices.map(idx => students[idx]);

        members.forEach(member => {
            member.teamId = teamId;
        });

        return {
            id: teamId,
            name: teamName,
            cohesionScore,
            memberIds: members.map(m => m.id),
            members
        };
    });

    teams.sort((a, b) => b.cohesionScore - a.cohesionScore);

    return teams;
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderRoleTags() {
    const container = document.getElementById('role-tags');
    container.innerHTML = ROLE_TAGS.map(tag => `
        <div class="tag-item ${state.selectedRoles.includes(tag.id) ? 'selected' : ''}" 
             data-tag-id="${tag.id}" data-tag-type="role">
            <span class="tag-emoji">${tag.emoji}</span>
            <span class="tag-name">${tag.name}</span>
        </div>
    `).join('');
}

function renderInterestTags() {
    const container = document.getElementById('interest-tags');
    container.innerHTML = INTEREST_TAGS.map(tag => `
        <div class="tag-item ${state.selectedInterests.includes(tag.id) ? 'selected' : ''}" 
             data-tag-id="${tag.id}" data-tag-type="interest">
            <span class="tag-emoji">${tag.emoji}</span>
            <span class="tag-name">${tag.name}</span>
        </div>
    `).join('');
}

function renderProfileStep(step) {
    state.profileStep = step;

    // Update step dots
    document.querySelectorAll('.step-dot').forEach((dot, i) => {
        dot.classList.remove('active', 'completed');
        if (i + 1 === step) dot.classList.add('active');
        if (i + 1 < step) dot.classList.add('completed');
    });

    // Update title
    const titles = ['Your Roles', 'Your Interests', 'Message to Team'];
    document.getElementById('profile-step-title').textContent = `Step ${step}/3 — ${titles[step - 1]}`;

    // Show correct step
    document.querySelectorAll('.profile-step').forEach((el, i) => {
        el.classList.toggle('active', i + 1 === step);
    });

    // Update back button
    document.getElementById('btn-profile-back').textContent = step === 1 ? '← Back' : '← Previous';

    // Update next button
    const nextBtn = document.getElementById('btn-profile-next');
    nextBtn.textContent = step === 3 ? 'Submit ✓' : 'Next →';

    validateProfileStep();
}

function renderTeams(teams, showAll = false) {
    const container = document.getElementById('teams-container');

    container.innerHTML = teams.map(team => `
        <div class="team-card">
            <div class="team-header">
                <h3 class="team-name">🎯 ${team.name}</h3>
                <span class="team-score">Cohesion: ${(team.cohesionScore * 100).toFixed(0)}%</span>
            </div>
            ${team.members.map(member => `
                <div class="member-card">
                    <div class="member-name">
                        👤 ${member.name}
                        ${state.currentStudent && member.id === state.currentStudent.id ? '<span style="color: var(--accent-primary);"> (You)</span>' : ''}
                    </div>
                    <div class="member-tags">
                        ${member.roleTagIds.map(id => {
        const tag = ROLE_TAGS.find(t => t.id === id);
        return tag ? `<span class="member-tag">${tag.emoji} ${tag.name}</span>` : '';
    }).join('')}
                        ${member.interestTagIds.filter(id => id !== 'others').map(id => {
        const tag = INTEREST_TAGS.find(t => t.id === id);
        return tag ? `<span class="member-tag">${tag.emoji} ${tag.name}</span>` : '';
    }).join('')}
                        ${member.customInterest ? `<span class="member-tag">✏️ ${member.customInterest}</span>` : ''}
                    </div>
                    ${member.messageToTeam ? `<p class="member-message">"${member.messageToTeam}"</p>` : ''}
                </div>
            `).join('')}
        </div>
    `).join('');
}

function renderDashboard() {
    const session = state.currentSession;
    if (!session) return;

    document.getElementById('dashboard-code').textContent = session.code;
    document.getElementById('dashboard-session-name').textContent = session.name;
    document.getElementById('dashboard-details').textContent =
        `Team Size: ${session.teamSize} • Weights: ${session.weightRole}% Role / ${session.weightInterest}% Interest`;
    document.getElementById('dashboard-status').textContent =
        session.status === 'published' ? '✅ Teams Published' : '⏳ Open for Registration';
    document.getElementById('dashboard-student-count').textContent =
        `Students joined: ${session.students.length}`;

    const runBtn = document.getElementById('btn-run-matching');
    if (session.status === 'published') {
        runBtn.textContent = 'View Results →';
    } else {
        runBtn.textContent = '🎲 Run Matching';
    }
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

function validateProfileStep() {
    const nextBtn = document.getElementById('btn-profile-next');
    let valid = false;

    if (state.profileStep === 1) {
        valid = state.selectedRoles.length > 0;
    } else if (state.profileStep === 2) {
        valid = state.selectedInterests.length > 0;
        // If "others" selected, need custom input
        if (state.selectedInterests.includes('others')) {
            const customInput = document.getElementById('custom-interest').value.trim();
            valid = valid && customInput.length > 0;
        }
    } else if (state.profileStep === 3) {
        valid = true; // Message is optional
    }

    nextBtn.disabled = !valid;
}

// ============================================
// EVENT HANDLERS
// ============================================

function initEventListeners() {
    // Landing: Join code input
    const joinCodeInput = document.getElementById('join-code');
    joinCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
        document.getElementById('btn-go-join').disabled = e.target.value.length !== 6;
    });

    // Landing: Go to join
    document.getElementById('btn-go-join').addEventListener('click', () => {
        const code = joinCodeInput.value;
        document.getElementById('display-join-code').textContent = code;
        showScreen('join-session');
    });

    // Landing: Go to create
    document.getElementById('btn-go-create').addEventListener('click', () => {
        showScreen('create-session');
    });

    // Back buttons
    document.querySelectorAll('[data-go]').forEach(btn => {
        btn.addEventListener('click', () => {
            showScreen(btn.dataset.go);
        });
    });

    // Join session form validation
    const studentNameInput = document.getElementById('student-name');
    const studentPasswordInput = document.getElementById('student-password');

    function validateJoinForm() {
        const name = studentNameInput.value.trim();
        const password = studentPasswordInput.value.trim();
        document.getElementById('btn-join-session').disabled = !name || !password;
    }

    studentNameInput.addEventListener('input', validateJoinForm);
    studentPasswordInput.addEventListener('input', validateJoinForm);

    // Join session
    document.getElementById('btn-join-session').addEventListener('click', () => {
        const code = document.getElementById('display-join-code').textContent;
        const name = studentNameInput.value.trim();
        const password = studentPasswordInput.value.trim();

        const sessionId = state.sessionsByCode[code];
        if (!sessionId) {
            document.getElementById('join-error').textContent = 'Session not found. Check the code.';
            return;
        }

        const session = state.sessions[sessionId];

        // Check if student exists
        let student = session.students.find(s => s.name.toLowerCase() === name.toLowerCase());

        if (student) {
            if (student.password !== password) {
                document.getElementById('join-error').textContent = 'Wrong password.';
                return;
            }
            // Returning student
            state.currentStudent = student;
            state.currentSession = session;

            if (student.roleTagIds.length > 0) {
                // Already submitted
                if (session.status === 'published') {
                    const myTeam = session.teams.find(t => t.memberIds.includes(student.id));
                    document.getElementById('results-title').textContent = '🎉 Your Team';
                    renderTeams(myTeam ? [myTeam] : []);
                    showScreen('results');
                } else {
                    showScreen('waiting');
                }
            } else {
                renderRoleTags();
                renderInterestTags();
                renderProfileStep(1);
                showScreen('profile-input');
            }
        } else {
            // New student
            student = {
                id: generateId(),
                name: name,
                password: password,
                roleTagIds: [],
                interestTagIds: [],
                customInterest: '',
                messageToTeam: '',
                teamId: null
            };
            session.students.push(student);
            state.currentStudent = student;
            state.currentSession = session;

            renderRoleTags();
            renderInterestTags();
            renderProfileStep(1);
            showScreen('profile-input');
        }
    });

    // Create session form validation
    const sessionNameInput = document.getElementById('session-name');
    const instructorNameInput = document.getElementById('instructor-name');
    const instructorPasswordInput = document.getElementById('instructor-password');

    function validateCreateForm() {
        const sessionName = sessionNameInput.value.trim();
        const name = instructorNameInput.value.trim();
        const password = instructorPasswordInput.value.trim();
        document.getElementById('btn-create-session').disabled = !sessionName || !name || !password;
    }

    sessionNameInput.addEventListener('input', validateCreateForm);
    instructorNameInput.addEventListener('input', validateCreateForm);
    instructorPasswordInput.addEventListener('input', validateCreateForm);

    // Weight slider
    const weightRoleSlider = document.getElementById('weight-role');
    weightRoleSlider.addEventListener('input', (e) => {
        const roleWeight = parseInt(e.target.value);
        const interestWeight = 100 - roleWeight;
        document.getElementById('weight-role-value').textContent = `${roleWeight}%`;
        document.getElementById('weight-interest-value').textContent = `${interestWeight}%`;
    });

    // Create session
    document.getElementById('btn-create-session').addEventListener('click', () => {
        const sessionName = sessionNameInput.value.trim();
        const code = generateSessionCode();
        const roleWeight = parseInt(weightRoleSlider.value);
        const teamSize = parseInt(document.getElementById('team-size').value);

        const session = {
            id: generateId(),
            code: code,
            name: sessionName,
            teamSize: teamSize,
            weightRole: roleWeight,
            weightInterest: 100 - roleWeight,
            status: 'open',
            students: [],
            teams: []
        };

        state.sessions[session.id] = session;
        state.sessionsByCode[code] = session.id;
        state.currentSession = session;
        state.isInstructor = true;

        renderDashboard();
        showScreen('instructor-dashboard');
    });

    // Tag selection
    document.getElementById('role-tags').addEventListener('click', (e) => {
        const tagItem = e.target.closest('.tag-item');
        if (!tagItem) return;

        const tagId = tagItem.dataset.tagId;
        const index = state.selectedRoles.indexOf(tagId);

        if (index === -1) {
            state.selectedRoles.push(tagId);
        } else {
            state.selectedRoles.splice(index, 1);
        }

        tagItem.classList.toggle('selected');
        validateProfileStep();
    });

    document.getElementById('interest-tags').addEventListener('click', (e) => {
        const tagItem = e.target.closest('.tag-item');
        if (!tagItem) return;

        const tagId = tagItem.dataset.tagId;
        const index = state.selectedInterests.indexOf(tagId);

        if (index === -1) {
            state.selectedInterests.push(tagId);
        } else {
            state.selectedInterests.splice(index, 1);
        }

        tagItem.classList.toggle('selected');

        // Show/hide custom input
        const customGroup = document.getElementById('custom-interest-group');
        customGroup.style.display = state.selectedInterests.includes('others') ? 'block' : 'none';

        validateProfileStep();
    });

    // Custom interest input
    document.getElementById('custom-interest').addEventListener('input', validateProfileStep);

    // Profile navigation
    document.getElementById('btn-profile-back').addEventListener('click', () => {
        if (state.profileStep === 1) {
            showScreen('landing');
        } else {
            renderProfileStep(state.profileStep - 1);
        }
    });

    document.getElementById('btn-profile-next').addEventListener('click', () => {
        if (state.profileStep < 3) {
            renderProfileStep(state.profileStep + 1);
        } else {
            // Submit profile
            const student = state.currentStudent;
            student.roleTagIds = [...state.selectedRoles];
            student.interestTagIds = [...state.selectedInterests];
            student.customInterest = document.getElementById('custom-interest').value.trim();
            student.messageToTeam = document.getElementById('message-to-team').value.trim();

            // Reset form state
            state.selectedRoles = [];
            state.selectedInterests = [];

            if (state.currentSession.status === 'published') {
                const myTeam = state.currentSession.teams.find(t => t.memberIds.includes(student.id));
                document.getElementById('results-title').textContent = '🎉 Your Team';
                renderTeams(myTeam ? [myTeam] : []);
                showScreen('results');
            } else {
                showScreen('waiting');
            }
        }
    });

    // Waiting: Check status
    document.getElementById('btn-check-status').addEventListener('click', () => {
        const session = state.currentSession;
        if (session && session.status === 'published') {
            const myTeam = session.teams.find(t => t.memberIds.includes(state.currentStudent.id));
            document.getElementById('results-title').textContent = '🎉 Your Team';
            renderTeams(myTeam ? [myTeam] : []);
            showScreen('results');
        }
    });

    // Dashboard: Refresh
    document.getElementById('btn-refresh').addEventListener('click', renderDashboard);

    // Dashboard: Run matching
    document.getElementById('btn-run-matching').addEventListener('click', () => {
        const session = state.currentSession;

        if (session.status === 'published') {
            document.getElementById('results-title').textContent = 'All Teams';
            document.getElementById('btn-back-dashboard').style.display = 'block';
            renderTeams(session.teams, true);
            showScreen('results');
        } else {
            // Run matching
            const teams = runMatching(session);
            session.teams = teams;
            session.status = 'published';

            renderDashboard();

            document.getElementById('results-title').textContent = 'All Teams';
            document.getElementById('btn-back-dashboard').style.display = 'block';
            renderTeams(teams, true);
            showScreen('results');
        }
    });

    // Results: Back to dashboard
    document.getElementById('btn-back-dashboard').addEventListener('click', () => {
        showScreen('instructor-dashboard');
    });
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    console.log('Who-To V2 initialized! 🎉');
});
