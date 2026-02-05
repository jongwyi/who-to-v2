let db;

export function initFirebase(config) {
    if (typeof firebase === 'undefined') throw new Error('Firebase SDK not loaded');
    firebase.initializeApp(config);
    db = firebase.database();
}

function ref(code) {
    return (code || '').toString().trim().toUpperCase();
}

export async function createSessionInDB(session) {
    await db.ref('sessions/' + ref(session.code)).set(session);
    return session;
}

export async function getSessionByCode(code) {
    const snapshot = await db.ref('sessions/' + ref(code)).once('value');
    return snapshot.val();
}

export async function updateSessionInDB(code, updates) {
    await db.ref('sessions/' + ref(code)).update(updates);
}

export async function saveStudentInDB(code, student) {
    await db.ref('sessions/' + ref(code) + '/students/' + student.id).set(student);
}

export async function getStudentFromDB(code, studentId) {
    const snapshot = await db.ref('sessions/' + ref(code) + '/students/' + studentId).once('value');
    return snapshot.val();
}

export async function saveTeamsInDB(code, teams) {
    const r = ref(code);
    await db.ref('sessions/' + r + '/teams').set(teams);
    await db.ref('sessions/' + r + '/status').set('published');
}

export function listenToSession(code, callback) {
    db.ref('sessions/' + ref(code)).on('value', (snapshot) => {
        const session = snapshot.val();
        if (session) callback(session);
    });
}

export async function assignLateJoinerToTeam(code, session, student) {
    const r = ref(code);
    const teams = session.teams ? Object.values(session.teams) : [];
    if (teams.length === 0) return null;
    const sorted = [...teams].sort((a, b) => (a.memberIds?.length || 0) - (b.memberIds?.length || 0));
    const team = sorted[0];
    const memberIds = [...(team.memberIds || []), student.id];
    const members = [...(team.members || []), student];
    const newMemberIds = [...(team.newMemberIds || []), student.id];
    const updatedTeam = { ...team, memberIds, members, newMemberIds };
    await db.ref('sessions/' + r + '/teams/' + team.id).set(updatedTeam);
    student.teamId = team.id;
    await saveStudentInDB(r, student);
    return updatedTeam;
}
