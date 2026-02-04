// ============================================
// WHO-TO V2 - Firebase Edition
// ============================================

// ============================================
// FIREBASE CONFIG
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyAN_uJM7v23CSv8et3sGKUJI04kDpVUIAU",
    authDomain: "who-to-75f43.firebaseapp.com",
    databaseURL: "https://who-to-75f43-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "who-to-75f43",
    storageBucket: "who-to-75f43.firebasestorage.app",
    messagingSenderId: "532213077301",
    appId: "1:532213077301:web:c5a8301dc2105d478c287c",
    measurementId: "G-8M5X3DL7FS"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

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

// Resolve role/interest tags for a session (instructor-defined or defaults)
function getRoleTags(session) {
    if (session && session.roleTags && session.roleTags.length > 0) return session.roleTags;
    return ROLE_TAGS;
}
function getInterestTags(session) {
    if (session && session.interestTags && session.interestTags.length > 0) return session.interestTags;
    return INTEREST_TAGS;
}
function slugify(text) {
    return String(text).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'tag';
}

// Initialize create-session tag rows from defaults (call when showing create-session)
function initCreateSessionTags() {
    const roleList = document.getElementById('create-role-tags-list');
    const interestList = document.getElementById('create-interest-tags-list');
    if (!roleList || !interestList) return;
    roleList.innerHTML = '';
    interestList.innerHTML = '';
    ROLE_TAGS.forEach(t => appendCreateRoleTagRow(t.emoji, t.name));
    INTEREST_TAGS.forEach(t => appendCreateInterestTagRow(t.emoji, t.name));
}

function appendCreateRoleTagRow(emoji = '', name = '') {
    const list = document.getElementById('create-role-tags-list');
    const row = document.createElement('div');
    row.className = 'create-tag-row';
    row.innerHTML = `
        <input type="text" class="form-input create-tag-emoji" value="${emoji}" placeholder="💻" maxlength="4">
        <input type="text" class="form-input create-tag-name" value="${name}" placeholder="Role name">
        <button type="button" class="btn btn-ghost btn-small btn-remove-tag" data-list="role" aria-label="Remove">✕</button>
    `;
    list.appendChild(row);
}

function appendCreateInterestTagRow(emoji = '', name = '') {
    const list = document.getElementById('create-interest-tags-list');
    const row = document.createElement('div');
    row.className = 'create-tag-row';
    row.innerHTML = `
        <input type="text" class="form-input create-tag-emoji" value="${emoji}" placeholder="🏥" maxlength="4">
        <input type="text" class="form-input create-tag-name" value="${name}" placeholder="Interest name">
        <button type="button" class="btn btn-ghost btn-small btn-remove-tag" data-list="interest" aria-label="Remove">✕</button>
    `;
    list.appendChild(row);
}

function getCreateRoleTags() {
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

function getCreateInterestTags() {
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

// ============================================
// APPLICATION STATE
// ============================================

const state = {
    currentScreen: 'landing',
    profileStep: 1,

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
    return 'id-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
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
// FIREBASE DATABASE FUNCTIONS
// ============================================

// Create a new session in Firebase
async function createSessionInDB(session) {
    await db.ref('sessions/' + session.code).set(session);
    return session;
}

// Get session by code from Firebase
async function getSessionByCode(code) {
    const snapshot = await db.ref('sessions/' + code.toUpperCase()).once('value');
    return snapshot.val();
}

// Update session in Firebase
async function updateSessionInDB(code, updates) {
    await db.ref('sessions/' + code).update(updates);
}

// Add or update student in session
async function saveStudentInDB(code, student) {
    await db.ref('sessions/' + code + '/students/' + student.id).set(student);
}

// Get student from session
async function getStudentFromDB(code, studentId) {
    const snapshot = await db.ref('sessions/' + code + '/students/' + studentId).once('value');
    return snapshot.val();
}

// Save teams to session
async function saveTeamsInDB(code, teams) {
    await db.ref('sessions/' + code + '/teams').set(teams);
    await db.ref('sessions/' + code + '/status').set('published');
}

// Assign a late-joining student to one existing team (when teams already published)
async function assignLateJoinerToTeam(code, session, student) {
    const teams = session.teams ? Object.values(session.teams) : [];
    if (teams.length === 0) return null;
    // Pick team with fewest members (balance size)
    const sorted = [...teams].sort((a, b) => (a.memberIds?.length || 0) - (b.memberIds?.length || 0));
    const team = sorted[0];
    const memberIds = [...(team.memberIds || []), student.id];
    const members = [...(team.members || []), student];
    const newMemberIds = [...(team.newMemberIds || []), student.id];
    const updatedTeam = {
        ...team,
        memberIds,
        members,
        newMemberIds
    };
    await db.ref('sessions/' + code + '/teams/' + team.id).set(updatedTeam);
    student.teamId = team.id;
    await saveStudentInDB(code, student);
    return updatedTeam;
}

// Listen for session changes (real-time updates)
function listenToSession(code, callback) {
    db.ref('sessions/' + code).on('value', (snapshot) => {
        const session = snapshot.val();
        if (session) {
            callback(session);
        }
    });
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
    const rolesA = new Set(studentA.roleTagIds || []);
    const rolesB = new Set(studentB.roleTagIds || []);
    const roleDiversity = jaccardDistance(rolesA, rolesB);

    const interestsA = new Set(studentA.interestTagIds || []);
    const interestsB = new Set(studentB.interestTagIds || []);
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
    // Convert students object to array
    const studentsObj = session.students || {};
    const students = Object.values(studentsObj).filter(s => s.roleTagIds && s.roleTagIds.length > 0);

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
    const session = state.currentSession;
    const tags = getRoleTags(session);
    const container = document.getElementById('role-tags');
    container.innerHTML = tags.map(tag => {
        const idx = state.selectedRoles.indexOf(tag.id);
        const priorityLabel = idx >= 0 ? `<span class="tag-priority">${idx === 0 ? '1st' : '2nd'}</span>` : '';
        return `
        <div class="tag-item ${state.selectedRoles.includes(tag.id) ? 'selected' : ''}" 
             data-tag-id="${tag.id}" data-tag-type="role">
            <span class="tag-emoji">${tag.emoji}</span>
            <span class="tag-name">${tag.name}</span>
            ${priorityLabel}
        </div>
    `}).join('');
}

function updateRolePrioritySummary() {
    const el = document.getElementById('role-priority-summary');
    if (!el) return;
    const session = state.currentSession;
    const roleTags = getRoleTags(session);
    if (state.selectedRoles.length === 0) {
        el.textContent = '';
        return;
    }
    const labels = state.selectedRoles.map((id, i) => {
        const tag = roleTags.find(t => t.id === id);
        return tag ? `${i === 0 ? '1st' : '2nd'}: ${tag.emoji} ${tag.name}` : '';
    }).filter(Boolean);
    el.textContent = labels.length ? 'Your priorities: ' + labels.join(' → ') : '';
}

function renderInterestTags() {
    const session = state.currentSession;
    const tags = getInterestTags(session);
    const container = document.getElementById('interest-tags');
    container.innerHTML = tags.map(tag => `
        <div class="tag-item ${state.selectedInterests.includes(tag.id) ? 'selected' : ''}" 
             data-tag-id="${tag.id}" data-tag-type="interest">
            <span class="tag-emoji">${tag.emoji}</span>
            <span class="tag-name">${tag.name}</span>
        </div>
    `).join('');
}

function renderProfileStep(step) {
    state.profileStep = step;

    document.querySelectorAll('.step-dot').forEach((dot, i) => {
        dot.classList.remove('active', 'completed');
        if (i + 1 === step) dot.classList.add('active');
        if (i + 1 < step) dot.classList.add('completed');
    });

    const titles = ['Your Roles', 'Your Interests', 'Message to Team'];
    document.getElementById('profile-step-title').textContent = `Step ${step}/3 — ${titles[step - 1]}`;

    document.querySelectorAll('.profile-step').forEach((el, i) => {
        el.classList.toggle('active', i + 1 === step);
    });

    document.getElementById('btn-profile-back').textContent = step === 1 ? '← Back' : '← Previous';

    const nextBtn = document.getElementById('btn-profile-next');
    nextBtn.textContent = step === 3 ? 'Submit ✓' : 'Next →';

    if (step === 1) updateRolePrioritySummary();
    validateProfileStep();
}

function getTeamSharedInterestIds(team) {
    const members = team.members || [];
    if (members.length === 0) return [];
    const allInterestSets = members.map(m => new Set((m.interestTagIds || []).filter(id => id !== 'others')));
    const firstSet = allInterestSets[0];
    return [...firstSet].filter(id => allInterestSets.every(s => s.has(id)));
}

function renderTeams(teams, showAll = false) {
    const container = document.getElementById('teams-container');
    const session = state.currentSession;
    const roleTags = getRoleTags(session);
    const interestTags = getInterestTags(session);
    const findRole = (id) => roleTags.find(t => t.id === id);
    const findInterest = (id) => interestTags.find(t => t.id === id);

    if (!teams || teams.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No teams yet.</p>';
        return;
    }

    container.innerHTML = teams.map(team => {
        const sharedInterestIds = getTeamSharedInterestIds(team);
        return `
        <div class="team-card">
            <div class="team-header">
                <h3 class="team-name">🎯 ${team.name}</h3>
                <span class="team-score">Cohesion: ${(team.cohesionScore * 100).toFixed(0)}%</span>
            </div>
            ${sharedInterestIds.length > 0 ? `
            <div class="team-shared-interests">
                <span class="team-shared-label">All fond of:</span>
                <div class="team-shared-tags">
                    ${sharedInterestIds.map(id => {
                        const tag = findInterest(id);
                        return tag ? `<span class="team-shared-tag">${tag.emoji} ${tag.name}</span>` : '';
                    }).join('')}
                </div>
            </div>
            ` : ''}
            ${(team.members || []).map(member => {
                const isNew = (team.newMemberIds && team.newMemberIds.includes(member.id));
                return `
                <div class="member-card ${isNew ? 'member-card-new' : ''}">
                    <div class="member-name">
                        ${member.emoji || '👤'} ${member.name}
                        ${isNew ? '<span class="member-new-badge">new</span>' : ''}
                        ${state.currentStudent && member.id === state.currentStudent.id ? '<span style="color: var(--accent-primary);"> (You)</span>' : ''}
                    </div>
                    <div class="member-roles">
                        ${(member.roleTagIds || []).map(id => {
                            const tag = findRole(id);
                            return tag ? `<span class="member-tag">${tag.emoji} ${tag.name}</span>` : '';
                        }).join('')}
                    </div>
                    <div class="member-interests">
                        ${(member.interestTagIds || []).filter(id => id !== 'others').map(id => {
                            const tag = findInterest(id);
                            return tag ? `<span class="member-tag">${tag.emoji} ${tag.name}</span>` : '';
                        }).join('')}
                        ${member.customInterest ? `<span class="member-tag">✏️ ${member.customInterest}</span>` : ''}
                    </div>
                    ${member.messageToTeam ? `<p class="member-message">"${member.messageToTeam}"</p>` : ''}
                </div>
            `;
            }).join('')}
        </div>
    `;
    }).join('');
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

    const studentCount = session.students ? Object.keys(session.students).length : 0;
    document.getElementById('dashboard-student-count').textContent = `Students joined: ${studentCount}`;

    const runBtn = document.getElementById('btn-run-matching');
    if (session.status === 'published') {
        runBtn.textContent = 'View Results →';
    } else {
        runBtn.textContent = '🎲 Run Matching';
    }
}

// ============================================
// DUMMY DATA GENERATOR
// ============================================

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Skyler', 'Dakota',
    'Charlie', 'Sam', 'Jamie', 'Drew', 'Reese', 'Finley', 'Sage', 'River', 'Phoenix', 'Rowan',
    'Blair', 'Emery', 'Hayden', 'Kendall', 'Logan', 'Peyton', 'Parker', 'Sawyer', 'Sydney', 'Tyler'];

const MESSAGES = [
    "Excited to work together!", "Let's build something great!", "Ready to collaborate!",
    "Looking forward to learning!", "Can't wait to start!", "Let's do this!",
    "Happy to be here!", "Ready to contribute!", "Let's make an impact!",
    "Eager to help the team!", "Open to new ideas!", "Let's innovate together!"
];

function generateDummyStudents(count) {
    const students = [];

    for (let i = 0; i < count; i++) {
        const name = FIRST_NAMES[i % FIRST_NAMES.length] + (Math.floor(i / FIRST_NAMES.length) || '');

        const roleTags = getRoleTags(state.currentSession);
        const interestTags = getInterestTags(state.currentSession);
        const availableRoles = [...roleTags.map(t => t.id)];
        const availableInterests = interestTags.filter(t => t.id !== 'others').map(t => t.id);

        // Exactly 2 roles (priority order)
        const roleTagIds = [];
        for (let r = 0; r < 2 && availableRoles.length > 0; r++) {
            const idx = Math.floor(Math.random() * availableRoles.length);
            roleTagIds.push(availableRoles.splice(idx, 1)[0]);
        }

        // Random interests (1-3)
        const numInterests = Math.min(3, Math.floor(Math.random() * 3) + 1, availableInterests.length);
        const interestTagIds = [];
        for (let r = 0; r < numInterests && availableInterests.length > 0; r++) {
            const idx = Math.floor(Math.random() * availableInterests.length);
            interestTagIds.push(availableInterests.splice(idx, 1)[0]);
        }

        students.push({
            id: generateId(),
            name: name,
            password: 'dummy',
            roleTagIds: roleTagIds,
            interestTagIds: interestTagIds,
            customInterest: '',
            messageToTeam: MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
            teamId: null
        });
    }

    return students;
}

// ============================================
// ALTERNATIVE MATCHING ALGORITHMS
// ============================================

// Current algorithm selection
let selectedAlgorithm = 'greedy';

const ALGORITHM_DESCRIPTIONS = {
    'greedy': 'Greedy: Picks best matches iteratively - good cohesion but may not be globally optimal',
    'random': 'Random: Shuffles students randomly - baseline for comparison',
    'balanced': 'Balanced: Ensures role diversity within each team first, then optimizes for interests'
};

// Random Team Formation - just shuffles and splits
function randomTeamFormation(students, teamSize, matrix) {
    const n = students.length;
    const numTeams = Math.ceil(n / teamSize);
    const shuffled = [...Array(n).keys()].sort(() => Math.random() - 0.5);
    const teams = [];

    for (let t = 0; t < numTeams; t++) {
        const team = shuffled.slice(t * teamSize, (t + 1) * teamSize);
        if (team.length > 0) {
            teams.push(team);
        }
    }

    return teams;
}

// Balanced Team Formation - ensures role diversity first
function balancedTeamFormation(students, teamSize, matrix) {
    const n = students.length;
    const numTeams = Math.ceil(n / teamSize);

    // Group students by their primary role (derive from students' roleTagIds)
    const roleGroups = {};
    students.forEach((student, idx) => {
        const primaryRole = (student.roleTagIds && student.roleTagIds[0]) || 'unknown';
        if (!roleGroups[primaryRole]) roleGroups[primaryRole] = [];
        roleGroups[primaryRole].push(idx);
    });

    // Initialize teams
    const teams = Array(numTeams).fill(null).map(() => []);
    const assigned = Array(n).fill(false);

    // Round-robin: distribute one from each role to each team
    let teamIdx = 0;
    for (const role of Object.keys(roleGroups)) {
        for (const studentIdx of roleGroups[role]) {
            if (!assigned[studentIdx] && teams[teamIdx].length < teamSize) {
                teams[teamIdx].push(studentIdx);
                assigned[studentIdx] = true;
                teamIdx = (teamIdx + 1) % numTeams;
            }
        }
    }

    // Fill remaining slots with best compatibility matches
    for (let t = 0; t < numTeams; t++) {
        while (teams[t].length < teamSize) {
            let bestCandidate = -1;
            let bestScore = -1;

            for (let candidate = 0; candidate < n; candidate++) {
                if (assigned[candidate]) continue;

                if (teams[t].length === 0) {
                    bestCandidate = candidate;
                    break;
                }

                const avgWithTeam = teams[t].reduce(
                    (sum, member) => sum + matrix[candidate][member], 0
                ) / teams[t].length;

                if (avgWithTeam > bestScore) {
                    bestScore = avgWithTeam;
                    bestCandidate = candidate;
                }
            }

            if (bestCandidate >= 0) {
                teams[t].push(bestCandidate);
                assigned[bestCandidate] = true;
            } else {
                break;
            }
        }
    }

    return teams.filter(t => t.length > 0);
}

// Run matching with specified algorithm
function runMatchingWithAlgorithm(session, algorithmName) {
    const studentsObj = session.students || {};
    const students = Object.values(studentsObj).filter(s => s.roleTagIds && s.roleTagIds.length > 0);

    if (students.length === 0) return { teams: [], avgCohesion: 0, minCohesion: 0, maxCohesion: 0 };

    const total = session.weightRole + session.weightInterest;
    const weights = {
        role: session.weightRole / total,
        interest: session.weightInterest / total
    };

    const matrix = buildCompatibilityMatrix(students, weights);

    let teamIndices;
    switch (algorithmName) {
        case 'random':
            teamIndices = randomTeamFormation(students, session.teamSize, matrix);
            break;
        case 'balanced':
            teamIndices = balancedTeamFormation(students, session.teamSize, matrix);
            break;
        case 'greedy':
        default:
            teamIndices = greedyTeamFormation(students, session.teamSize, matrix);
            break;
    }

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

    // Calculate stats
    const cohesionScores = teams.map(t => t.cohesionScore);
    const avgCohesion = cohesionScores.reduce((a, b) => a + b, 0) / cohesionScores.length;
    const minCohesion = Math.min(...cohesionScores);
    const maxCohesion = Math.max(...cohesionScores);

    teams.sort((a, b) => b.cohesionScore - a.cohesionScore);

    return { teams, avgCohesion, minCohesion, maxCohesion };
}

// Compare all algorithms
function compareAlgorithms(session) {
    const results = {};

    ['greedy', 'random', 'balanced'].forEach(algo => {
        const result = runMatchingWithAlgorithm(session, algo);
        results[algo] = {
            avgCohesion: result.avgCohesion,
            minCohesion: result.minCohesion,
            maxCohesion: result.maxCohesion,
            teams: result.teams
        };
    });

    return results;
}

// Render comparison table
function renderComparisonTable(results) {
    const container = document.getElementById('comparison-table');

    container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.9rem;">
            <thead>
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <th style="text-align: left; padding: 0.5rem;">Algorithm</th>
                    <th style="text-align: center; padding: 0.5rem;">Avg Score</th>
                    <th style="text-align: center; padding: 0.5rem;">Min</th>
                    <th style="text-align: center; padding: 0.5rem;">Max</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(results).map(([algo, data]) => `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.5rem; font-weight: ${algo === selectedAlgorithm ? 'bold' : 'normal'};">
                            ${algo === selectedAlgorithm ? '✓ ' : ''}${algo.charAt(0).toUpperCase() + algo.slice(1)}
                        </td>
                        <td style="text-align: center; padding: 0.5rem;">${(data.avgCohesion * 100).toFixed(1)}%</td>
                        <td style="text-align: center; padding: 0.5rem;">${(data.minCohesion * 100).toFixed(1)}%</td>
                        <td style="text-align: center; padding: 0.5rem;">${(data.maxCohesion * 100).toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('experiment-results').style.display = 'block';
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

function validateProfileStep() {
    const nextBtn = document.getElementById('btn-profile-next');
    let valid = false;

    if (state.profileStep === 1) {
        valid = state.selectedRoles.length === 2;
    } else if (state.profileStep === 2) {
        valid = state.selectedInterests.length > 0;
        if (state.selectedInterests.includes('others')) {
            const customInput = document.getElementById('custom-interest').value.trim();
            valid = valid && customInput.length > 0;
        }
    } else if (state.profileStep === 3) {
        valid = true;
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
        initCreateSessionTags();
        showScreen('create-session');
    });

    // Back buttons
    document.querySelectorAll('[data-go]').forEach(btn => {
        btn.addEventListener('click', () => {
            showScreen(btn.dataset.go);
        });
    });

    // ============================================
    // INSTRUCTOR RE-LOGIN
    // ============================================

    // Go to instructor re-login
    document.getElementById('btn-instructor-relogin').addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('instructor-relogin');
    });

    // Re-login form inputs
    const reloginCodeInput = document.getElementById('relogin-code');
    const reloginNameInput = document.getElementById('relogin-name');
    const reloginPasswordInput = document.getElementById('relogin-password');

    function validateReloginForm() {
        const code = reloginCodeInput.value.trim();
        const name = reloginNameInput.value.trim();
        const password = reloginPasswordInput.value.trim();
        document.getElementById('btn-instructor-login').disabled = code.length !== 6 || !name || !password;
    }

    reloginCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
        validateReloginForm();
    });
    reloginNameInput.addEventListener('input', validateReloginForm);
    reloginPasswordInput.addEventListener('input', validateReloginForm);

    // Instructor login button
    document.getElementById('btn-instructor-login').addEventListener('click', async () => {
        const code = reloginCodeInput.value.trim().toUpperCase();
        const name = reloginNameInput.value.trim();
        const password = reloginPasswordInput.value.trim();

        try {
            const session = await getSessionByCode(code);

            if (!session) {
                document.getElementById('relogin-error').textContent = 'Session not found. Check the code.';
                return;
            }

            // Check credentials
            if (session.instructorName !== name || session.instructorPassword !== password) {
                document.getElementById('relogin-error').textContent = 'Invalid name or password.';
                return;
            }

            // Success! Enter as instructor
            state.currentSession = session;
            state.isInstructor = true;

            // Listen for real-time updates (incl. late joiners → refresh results if on results screen)
            listenToSession(code, (updatedSession) => {
                state.currentSession = updatedSession;
                if (state.currentScreen === 'instructor-dashboard') {
                    renderDashboard();
                } else if (state.currentScreen === 'results') {
                    const teams = Object.values(updatedSession.teams || {});
                    document.getElementById('results-title').textContent = 'All Teams';
                    if (document.getElementById('btn-back-dashboard')) document.getElementById('btn-back-dashboard').style.display = 'block';
                    renderTeams(teams, true);
                }
            });

            // Clear form
            reloginCodeInput.value = '';
            reloginNameInput.value = '';
            reloginPasswordInput.value = '';
            document.getElementById('relogin-error').textContent = '';

            renderDashboard();
            showScreen('instructor-dashboard');
        } catch (err) {
            document.getElementById('relogin-error').textContent = 'Error: ' + err.message;
        }
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
    document.getElementById('btn-join-session').addEventListener('click', async () => {
        const code = document.getElementById('display-join-code').textContent;
        const name = studentNameInput.value.trim();
        const password = studentPasswordInput.value.trim();

        try {
            const session = await getSessionByCode(code);

            if (!session) {
                document.getElementById('join-error').textContent = 'Session not found. Check the code.';
                return;
            }

            state.currentSession = session;

            // Check if student exists
            const students = session.students || {};
            let student = Object.values(students).find(s => s.name.toLowerCase() === name.toLowerCase());

            if (student) {
                if (student.password !== password) {
                    document.getElementById('join-error').textContent = 'Wrong password.';
                    return;
                }
                const emojiInput = (document.getElementById('student-emoji')?.value || '').trim().slice(0, 4);
                if (emojiInput) {
                    student.emoji = emojiInput;
                    await saveStudentInDB(code, student);
                }
                state.currentStudent = student;

                if (student.roleTagIds && student.roleTagIds.length > 0) {
                    if (session.status === 'published') {
                        const teams = session.teams ? Object.values(session.teams) : [];
                        const myTeam = teams.find(t => t.memberIds && t.memberIds.includes(student.id));
                        document.getElementById('results-title').textContent = '🎉 Your Team';
                        renderTeams(myTeam ? [myTeam] : []);
                        showScreen('results');
                    } else {
                        // Start listening for updates
                        listenToSession(code, (updatedSession) => {
                            state.currentSession = updatedSession;
                            if (updatedSession.status === 'published') {
                                const teams = updatedSession.teams ? Object.values(updatedSession.teams) : [];
                                const myTeam = teams.find(t => t.memberIds && t.memberIds.includes(state.currentStudent.id));
                                document.getElementById('results-title').textContent = '🎉 Your Team';
                                renderTeams(myTeam ? [myTeam] : []);
                                showScreen('results');
                            }
                        });
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
                const emojiInput = (document.getElementById('student-emoji')?.value || '').trim().slice(0, 4);
                student = {
                    id: generateId(),
                    name: name,
                    emoji: emojiInput || '',
                    password: password,
                    roleTagIds: [],
                    interestTagIds: [],
                    customInterest: '',
                    messageToTeam: '',
                    teamId: null
                };

                await saveStudentInDB(code, student);
                state.currentStudent = student;

                renderRoleTags();
                renderInterestTags();
                renderProfileStep(1);
                showScreen('profile-input');
            }
        } catch (err) {
            document.getElementById('join-error').textContent = 'Error: ' + err.message;
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
        const roleTags = getCreateRoleTags();
        const interestTags = getCreateInterestTags();
        const hasTags = roleTags.length > 0 && interestTags.length > 0;
        document.getElementById('btn-create-session').disabled = !sessionName || !name || !password || !hasTags;
    }

    sessionNameInput.addEventListener('input', validateCreateForm);
    instructorNameInput.addEventListener('input', validateCreateForm);
    instructorPasswordInput.addEventListener('input', validateCreateForm);

    // Create-session: Add role / Add interest
    document.getElementById('btn-add-role-tag').addEventListener('click', () => {
        appendCreateRoleTagRow('', '');
        validateCreateForm();
    });
    document.getElementById('btn-add-interest-tag').addEventListener('click', () => {
        appendCreateInterestTagRow('', '');
        validateCreateForm();
    });
    document.getElementById('create-role-tags-list').addEventListener('input', validateCreateForm);
    document.getElementById('create-interest-tags-list').addEventListener('input', validateCreateForm);
    document.getElementById('create-role-tags-list').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-tag')) {
            e.target.closest('.create-tag-row')?.remove();
            validateCreateForm();
        }
    });
    document.getElementById('create-interest-tags-list').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-tag')) {
            e.target.closest('.create-tag-row')?.remove();
            validateCreateForm();
        }
    });

    // Weight slider
    const weightRoleSlider = document.getElementById('weight-role');
    weightRoleSlider.addEventListener('input', (e) => {
        const roleWeight = parseInt(e.target.value);
        const interestWeight = 100 - roleWeight;
        document.getElementById('weight-role-value').textContent = `${roleWeight}%`;
        document.getElementById('weight-interest-value').textContent = `${interestWeight}%`;
    });

    // Create session
    document.getElementById('btn-create-session').addEventListener('click', async () => {
        const sessionName = sessionNameInput.value.trim();
        const instructorName = instructorNameInput.value.trim();
        const instructorEmoji = (document.getElementById('instructor-emoji')?.value || '').trim().slice(0, 4);
        const instructorPassword = instructorPasswordInput.value.trim();
        const code = generateSessionCode();
        const roleWeight = parseInt(weightRoleSlider.value);
        const teamSize = parseInt(document.getElementById('team-size').value);
        const roleTags = getCreateRoleTags();
        const interestTags = getCreateInterestTags();

        if (roleTags.length === 0 || interestTags.length === 0) {
            document.getElementById('create-error').textContent = 'Add at least one role tag and one interest tag.';
            return;
        }

        const session = {
            id: generateId(),
            code: code,
            name: sessionName,
            instructorName: instructorName,
            instructorEmoji: instructorEmoji || '',
            instructorPassword: instructorPassword,
            teamSize: teamSize,
            weightRole: roleWeight,
            weightInterest: 100 - roleWeight,
            status: 'open',
            students: {},
            teams: {},
            roleTags: roleTags,
            interestTags: interestTags
        };

        document.getElementById('create-error').textContent = '';
        try {
            await createSessionInDB(session);
            state.currentSession = session;
            state.isInstructor = true;

            // Listen for real-time updates (incl. late joiners → refresh results if on results screen)
            listenToSession(code, (updatedSession) => {
                state.currentSession = updatedSession;
                if (state.currentScreen === 'instructor-dashboard') {
                    renderDashboard();
                } else if (state.currentScreen === 'results') {
                    const teams = Object.values(updatedSession.teams || {});
                    document.getElementById('results-title').textContent = 'All Teams';
                    if (document.getElementById('btn-back-dashboard')) document.getElementById('btn-back-dashboard').style.display = 'block';
                    renderTeams(teams, true);
                }
            });

            renderDashboard();
            showScreen('instructor-dashboard');
        } catch (err) {
            document.getElementById('create-error').textContent = 'Error: ' + err.message;
        }
    });

    // Tag selection (roles: exactly 2, order = priority)
    document.getElementById('role-tags').addEventListener('click', (e) => {
        const tagItem = e.target.closest('.tag-item');
        if (!tagItem) return;

        const tagId = tagItem.dataset.tagId;
        const index = state.selectedRoles.indexOf(tagId);

        if (index === -1) {
            if (state.selectedRoles.length >= 2) {
                // Replace second priority with this one
                state.selectedRoles[1] = tagId;
            } else {
                state.selectedRoles.push(tagId);
            }
        } else {
            state.selectedRoles.splice(index, 1);
        }

        renderRoleTags();
        updateRolePrioritySummary();
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

    document.getElementById('btn-profile-next').addEventListener('click', async () => {
        if (state.profileStep < 3) {
            renderProfileStep(state.profileStep + 1);
        } else {
            // Submit profile
            const student = state.currentStudent;
            student.roleTagIds = [...state.selectedRoles];
            student.interestTagIds = [...state.selectedInterests];
            student.customInterest = document.getElementById('custom-interest').value.trim();
            student.messageToTeam = document.getElementById('message-to-team').value.trim();

            try {
                await saveStudentInDB(state.currentSession.code, student);

                // Reset form state
                state.selectedRoles = [];
                state.selectedInterests = [];

                const session = state.currentSession;
                if (session.status === 'published') {
                    // Teams already published: assign this student to one existing team and show result
                    const myTeam = await assignLateJoinerToTeam(session.code, session, student);
                    if (myTeam) {
                        state.currentStudent = student;
                        // Refetch session from Firebase so UI shows the saved state (instructor + this student see same data)
                        const updatedSession = await getSessionByCode(session.code);
                        state.currentSession = updatedSession;
                        const teams = Object.values(updatedSession.teams || {});
                        const myTeamFromSession = teams.find(t => t.memberIds && t.memberIds.includes(student.id));
                        document.getElementById('results-title').textContent = '🎉 Your Team';
                        renderTeams(myTeamFromSession ? [myTeamFromSession] : [myTeam]);
                        showScreen('results');
                        // Keep results in sync when session updates (e.g. instructor viewing)
                        listenToSession(session.code, (nextSession) => {
                            state.currentSession = nextSession;
                            if (state.currentScreen === 'results' && state.currentStudent) {
                                const nextTeams = Object.values(nextSession.teams || {});
                                const nextMyTeam = nextTeams.find(t => t.memberIds && t.memberIds.includes(state.currentStudent.id));
                                if (nextMyTeam) {
                                    document.getElementById('results-title').textContent = '🎉 Your Team';
                                    renderTeams([nextMyTeam]);
                                }
                            }
                        });
                    } else {
                        showScreen('waiting');
                    }
                } else {
                    // Start listening for updates
                    listenToSession(state.currentSession.code, (updatedSession) => {
                        state.currentSession = updatedSession;
                        if (updatedSession.status === 'published') {
                            const teams = updatedSession.teams ? Object.values(updatedSession.teams) : [];
                            const myTeam = teams.find(t => t.memberIds && t.memberIds.includes(student.id));
                            document.getElementById('results-title').textContent = '🎉 Your Team';
                            renderTeams(myTeam ? [myTeam] : []);
                            showScreen('results');
                        }
                    });
                    showScreen('waiting');
                }
            } catch (err) {
                alert('Error saving profile: ' + err.message);
            }
        }
    });

    // Waiting: Check status
    document.getElementById('btn-check-status').addEventListener('click', async () => {
        try {
            const session = await getSessionByCode(state.currentSession.code);
            state.currentSession = session;

            if (session && session.status === 'published') {
                const teams = session.teams ? Object.values(session.teams) : [];
                const myTeam = teams.find(t => t.memberIds && t.memberIds.includes(state.currentStudent.id));
                document.getElementById('results-title').textContent = '🎉 Your Team';
                renderTeams(myTeam ? [myTeam] : []);
                showScreen('results');
            }
        } catch (err) {
            console.error('Error checking status:', err);
        }
    });

    // Dashboard: Refresh
    document.getElementById('btn-refresh').addEventListener('click', async () => {
        try {
            const session = await getSessionByCode(state.currentSession.code);
            state.currentSession = session;
            renderDashboard();
        } catch (err) {
            console.error('Error refreshing:', err);
        }
    });

    // Dashboard: Run matching
    document.getElementById('btn-run-matching').addEventListener('click', async () => {
        const session = state.currentSession;

        if (session.status === 'published') {
            const teams = session.teams ? Object.values(session.teams) : [];
            document.getElementById('results-title').textContent = 'All Teams';
            document.getElementById('btn-back-dashboard').style.display = 'block';
            renderTeams(teams, true);
            showScreen('results');
        } else {
            try {
                // Get latest session data
                const latestSession = await getSessionByCode(session.code);
                state.currentSession = latestSession;

                // Run matching
                const teams = runMatching(latestSession);

                if (teams.length === 0) {
                    alert('No students have submitted their profiles yet!');
                    return;
                }

                // Save teams to Firebase
                const teamsObj = {};
                teams.forEach(team => {
                    teamsObj[team.id] = team;
                });

                await saveTeamsInDB(session.code, teamsObj);

                // Update local state
                state.currentSession.teams = teamsObj;
                state.currentSession.status = 'published';

                renderDashboard();

                document.getElementById('results-title').textContent = 'All Teams';
                document.getElementById('btn-back-dashboard').style.display = 'block';
                renderTeams(teams, true);
                showScreen('results');
            } catch (err) {
                alert('Error running matching: ' + err.message);
            }
        }
    });

    // Results: Back to dashboard
    document.getElementById('btn-back-dashboard').addEventListener('click', () => {
        showScreen('instructor-dashboard');
    });

    // ============================================
    // EXPERIMENT MODE EVENT HANDLERS
    // ============================================

    // Generate dummy students
    document.getElementById('btn-generate-dummy').addEventListener('click', async () => {
        const count = parseInt(document.getElementById('dummy-count').value) || 30;
        const session = state.currentSession;

        if (!session) {
            alert('No session active!');
            return;
        }

        try {
            const dummyStudents = generateDummyStudents(count);

            // Save to Firebase
            for (const student of dummyStudents) {
                await saveStudentInDB(session.code, student);
            }

            // Refresh dashboard
            const updatedSession = await getSessionByCode(session.code);
            state.currentSession = updatedSession;
            renderDashboard();

            alert(`✅ Generated ${count} dummy students!`);

            // Auto-run comparison
            const results = compareAlgorithms(updatedSession);
            renderComparisonTable(results);
        } catch (err) {
            alert('Error generating dummy data: ' + err.message);
        }
    });

    // Clear all students
    document.getElementById('btn-clear-students').addEventListener('click', async () => {
        const session = state.currentSession;

        if (!session) return;

        if (!confirm('Clear all students from this session?')) return;

        try {
            await db.ref('sessions/' + session.code + '/students').remove();
            await db.ref('sessions/' + session.code + '/teams').remove();
            await db.ref('sessions/' + session.code + '/status').set('open');

            const updatedSession = await getSessionByCode(session.code);
            state.currentSession = updatedSession;
            renderDashboard();

            document.getElementById('experiment-results').style.display = 'none';

            alert('✅ Cleared all students!');
        } catch (err) {
            alert('Error: ' + err.message);
        }
    });

    // Algorithm selector
    document.querySelectorAll('.algorithm-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            // Update selection
            document.querySelectorAll('.algorithm-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            selectedAlgorithm = btn.dataset.algorithm;
            document.getElementById('algorithm-description').textContent =
                ALGORITHM_DESCRIPTIONS[selectedAlgorithm];

            // Run comparison if we have students
            const session = state.currentSession;
            if (session && session.students && Object.keys(session.students).length > 0) {
                const results = compareAlgorithms(session);
                renderComparisonTable(results);
            }
        });
    });
}


// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    console.log('Who-To V2 (Firebase Edition) initialized! 🔥');
});
