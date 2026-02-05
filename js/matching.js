import { generateId } from './utils.js';
import { getRoleTags, getInterestTags } from './tags.js';
import { state } from './state.js';

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
    let total = 0, pairs = 0;
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
        let bestSeed = -1, bestAvg = -1;
        for (let i = 0; i < n; i++) {
            if (!assigned[i]) {
                const avgCompat = matrix[i].reduce((a, b) => a + b, 0) / n;
                if (avgCompat > bestAvg) { bestAvg = avgCompat; bestSeed = i; }
            }
        }
        if (bestSeed >= 0) { team.push(bestSeed); assigned[bestSeed] = true; }
        while (team.length < teamSize) {
            let bestCandidate = -1, bestScore = -1;
            for (let candidate = 0; candidate < n; candidate++) {
                if (assigned[candidate]) continue;
                const avgWithTeam = team.reduce((sum, member) => sum + matrix[candidate][member], 0) / team.length;
                if (avgWithTeam > bestScore) { bestScore = avgWithTeam; bestCandidate = candidate; }
            }
            if (bestCandidate >= 0) { team.push(bestCandidate); assigned[bestCandidate] = true; }
            else break;
        }
        if (team.length > 0) teams.push(team);
    }
    return teams;
}

export function runMatching(session) {
    const studentsObj = session.students || {};
    const students = Object.values(studentsObj).filter(s => s.roleTagIds && s.roleTagIds.length > 0);
    if (students.length === 0) return [];
    const total = session.weightRole + session.weightInterest;
    const weights = { role: session.weightRole / total, interest: session.weightInterest / total };
    const matrix = buildCompatibilityMatrix(students, weights);
    const teamIndices = greedyTeamFormation(students, session.teamSize, matrix);
    const teams = teamIndices.map((indices, i) => {
        const teamId = generateId();
        const teamName = `Team ${String.fromCharCode(65 + i)}`;
        const cohesionScore = calculateTeamCohesion(indices, matrix);
        const members = indices.map(idx => students[idx]);
        members.forEach(m => { m.teamId = teamId; });
        return { id: teamId, name: teamName, cohesionScore, memberIds: members.map(m => m.id), members };
    });
    teams.sort((a, b) => b.cohesionScore - a.cohesionScore);
    return teams;
}

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Skyler', 'Dakota'];
const MESSAGES = ["Excited to work together!", "Let's build something great!", "Ready to collaborate!", "Can't wait to start!", "Let's make an impact!"];

export function generateDummyStudents(count) {
    const students = [];
    const session = state.currentSession;
    const roleTags = getRoleTags(session);
    const interestTags = getInterestTags(session);
    for (let i = 0; i < count; i++) {
        const name = FIRST_NAMES[i % FIRST_NAMES.length] + (Math.floor(i / FIRST_NAMES.length) || '');
        const availableRoles = [...roleTags.map(t => t.id)];
        const availableInterests = interestTags.filter(t => t.id !== 'others').map(t => t.id);
        const roleTagIds = [];
        for (let r = 0; r < 2 && availableRoles.length > 0; r++) {
            const idx = Math.floor(Math.random() * availableRoles.length);
            roleTagIds.push(availableRoles.splice(idx, 1)[0]);
        }
        const numInterests = Math.min(3, Math.floor(Math.random() * 3) + 1, availableInterests.length);
        const interestTagIds = [];
        for (let r = 0; r < numInterests && availableInterests.length > 0; r++) {
            const idx = Math.floor(Math.random() * availableInterests.length);
            interestTagIds.push(availableInterests.splice(idx, 1)[0]);
        }
        students.push({
            id: generateId(),
            name,
            password: 'dummy',
            roleTagIds,
            interestTagIds,
            customInterest: '',
            messageToTeam: MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
            teamId: null
        });
    }
    return students;
}
