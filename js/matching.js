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

function calculatePairwiseScore(studentA, studentB, weights, params) {
    let score = 0;
    if (params.includes('role')) {
        const rolesA = new Set(studentA.roleTagIds || []);
        const rolesB = new Set(studentB.roleTagIds || []);
        score += weights.role * jaccardDistance(rolesA, rolesB);
    }
    if (params.includes('interest')) {
        const interestsA = new Set(studentA.interestTagIds || []);
        const interestsB = new Set(studentB.interestTagIds || []);
        score += weights.interest * jaccardSimilarity(interestsA, interestsB);
    }
    return score;
}

function buildCompatibilityMatrix(students, weights, params) {
    const n = students.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const score = calculatePairwiseScore(students[i], students[j], weights, params);
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

function getExtro(student) {
    const v = student.extroversionScore;
    return typeof v === 'number' ? v : 5;
}

function greedyTeamFormation(students, teamSize, matrix, params, weightExtro, globalExtroMean) {
    const n = students.length;
    const numTeams = Math.ceil(n / teamSize);
    const assigned = Array(n).fill(false);
    const teams = [];
    const useExtro = params.includes('extroversion') && weightExtro > 0 && globalExtroMean != null;

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
            let bestCandidate = -1, bestScore = -Infinity;
            const teamExtSum = useExtro ? team.reduce((s, idx) => s + getExtro(students[idx]), 0) : 0;
            for (let candidate = 0; candidate < n; candidate++) {
                if (assigned[candidate]) continue;
                const avgWithTeam = team.reduce((sum, member) => sum + matrix[candidate][member], 0) / team.length;
                let score = avgWithTeam;
                if (useExtro) {
                    const newTeamAvg = (teamExtSum + getExtro(students[candidate])) / (team.length + 1);
                    const dev = Math.abs(newTeamAvg - globalExtroMean) / 5;
                    score -= weightExtro * dev;
                }
                if (score > bestScore) { bestScore = score; bestCandidate = candidate; }
            }
            if (bestCandidate >= 0) { team.push(bestCandidate); assigned[bestCandidate] = true; }
            else break;
        }
        if (team.length > 0) teams.push(team);
    }
    return teams;
}

function getSessionWeightsAndParams(session) {
    const params = session.selectedParams || ['role', 'interest'];
    const wRole = session.weightRole ?? 50;
    const wInterest = session.weightInterest ?? 50;
    const wExtro = session.weightExtroversion ?? 0;
    const total = params.reduce((sum, p) => {
        if (p === 'role') return sum + wRole;
        if (p === 'interest') return sum + wInterest;
        if (p === 'extroversion') return sum + wExtro;
        return sum;
    }, 0);
    const weights = {
        role: total > 0 ? wRole / total : 0,
        interest: total > 0 ? wInterest / total : 0,
        extroversion: total > 0 ? wExtro / total : 0
    };
    return { params, weights, total };
}

function isStudentComplete(s, params) {
    if (params.includes('role') && (!s.roleTagIds || s.roleTagIds.length === 0)) return false;
    if (params.includes('interest') && (!s.interestTagIds || s.interestTagIds.length === 0)) return false;
    if (params.includes('extroversion') && typeof s.extroversionScore !== 'number') return false;
    return true;
}

export function runMatching(session) {
    const studentsObj = session.students || {};
    const { params, weights } = getSessionWeightsAndParams(session);
    const students = Object.values(studentsObj).filter(s => isStudentComplete(s, params));
    if (students.length === 0) return [];
    const matrix = buildCompatibilityMatrix(students, weights, params);
    const globalExtroMean = params.includes('extroversion')
        ? students.reduce((s, st) => s + getExtro(st), 0) / students.length
        : null;
    const teamIndices = greedyTeamFormation(students, session.teamSize, matrix, params, weights.extroversion, globalExtroMean);
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
        const sessionParams = state.currentSession?.selectedParams || ['role', 'interest'];
        const student = {
            id: generateId(),
            name,
            password: 'dummy',
            roleTagIds,
            interestTagIds,
            customInterest: '',
            messageToTeam: MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
            teamId: null
        };
        if (sessionParams.includes('extroversion')) {
            student.extroversionScore = Math.floor(Math.random() * 11);
        }
        students.push(student);
    }
    return students;
}
