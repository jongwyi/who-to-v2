const functions = require('firebase-functions');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { Resend } = require('resend');

admin.initializeApp();

const resendApiKey = defineSecret('RESEND_API_KEY');

const db = admin.database();

// Labels for email (en)
const L = {
  cohesion: 'Cohesion',
  allFondOf: 'Common interests:',
  interestLabel: 'Interests:',
  priority1st: '1st',
  priority2nd: '2nd',
  noTeamsYet: 'No teams yet.',
  new: 'new',
  you: '(You)',
};

function getRoleTags(session) {
  if (session && session.roleTags && session.roleTags.length > 0) return session.roleTags;
  return [
    { id: 'engineer', name: 'Engineer', emoji: '💻' },
    { id: 'researcher', name: 'Researcher', emoji: '🔬' },
    { id: 'data-analyst', name: 'Data Analyst', emoji: '📊' },
    { id: 'designer', name: 'Designer', emoji: '🎨' },
    { id: 'speech-giver', name: 'Speech Giver', emoji: '🎤' },
  ];
}

function getInterestTags(session) {
  if (session && session.interestTags && session.interestTags.length > 0) return session.interestTags;
  return [
    { id: 'health-care', name: 'Health Care', emoji: '🏥' },
    { id: 'edu-tech', name: 'Edu Tech', emoji: '📚' },
    { id: 'fin-tech', name: 'Fin Tech', emoji: '💰' },
    { id: 'social-impact', name: 'Social Impact', emoji: '🌍' },
    { id: 'others', name: 'Others', emoji: '✏️' },
  ];
}

function getTeamSharedInterestIds(team) {
  const members = team.members || [];
  if (members.length === 0) return [];
  const allInterestSets = members.map(m => new Set((m.interestTagIds || []).filter(id => id !== 'others')));
  const firstSet = allInterestSets[0];
  return [...firstSet].filter(id => allInterestSets.every(s => s.has(id)));
}

function buildTeamsHtml(session, teams) {
  const params = session?.selectedParams || ['role', 'interest'];
  const roleTags = getRoleTags(session);
  const interestTags = getInterestTags(session);
  const findRole = (id) => roleTags.find(t => t.id === id);
  const findInterest = (id) => interestTags.find(t => t.id === id);

  if (!teams || teams.length === 0) {
    return `<p>${L.noTeamsYet}</p>`;
  }

  return teams.map(team => {
    const showInterest = params.includes('interest');
    const sharedInterestIds = showInterest ? getTeamSharedInterestIds(team) : [];
    const membersHtml = (team.members || []).map(member => {
      const isNew = (team.newMemberIds && team.newMemberIds.includes(member.id));
      let roleLine = '';
      if (params.includes('role')) {
        const first = member.roleTagIds && member.roleTagIds.length >= 1 ? findRole(member.roleTagIds[0]) : null;
        const second = member.roleTagIds && member.roleTagIds.length >= 2 ? findRole(member.roleTagIds[1]) : null;
        roleLine = (first || second)
          ? `${L.priority1st} ${first ? first.emoji + ' ' + first.name : '—'} · ${L.priority2nd} ${second ? second.emoji + ' ' + second.name : '—'}`
          : '';
      }
      let interestBlock = '';
      if (params.includes('interest')) {
        const interestNames = (member.interestTagIds || [])
          .filter(id => id !== 'others')
          .map(id => findInterest(id))
          .filter(Boolean)
          .map(x => x.emoji + ' ' + x.name);
        if (member.customInterest) interestNames.push('✏️ ' + member.customInterest);
        if (interestNames.length) interestBlock = `<div style="font-size:13px;color:#666;margin:4px 0;">${L.interestLabel} ${interestNames.join(', ')}</div>`;
      }
      let extroBlock = '';
      if (params.includes('extroversion') && typeof member.extroversionScore === 'number') {
        const score = member.extroversionScore;
        const isExtro = score >= 6;
        const label = isExtro ? 'Extroverted' : 'Introverted';
        const tagStyle = isExtro
          ? 'background:rgba(35,131,226,0.15);color:#2383e2;border:1px solid #2383e2;'
          : 'background:#f8f9fa;color:#333;border:1px solid #ddd;';
        extroBlock = `<div style="margin-top:6px;"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;${tagStyle}">${label}: ${score} pts</span></div>`;
      }
      const msgHtml = member.messageToTeam
        ? `<p style="font-size:12px;font-style:italic;color:#666;margin-top:8px;">"${member.messageToTeam}"</p>`
        : '';
      return `
        <div style="padding:12px;background:#f8f9fa;border-radius:8px;margin-bottom:8px;border-left:3px solid ${isNew ? '#2383e2' : 'transparent'};">
          <div style="font-weight:600;margin-bottom:4px;">${member.emoji || '👤'} ${member.name}${isNew ? ` <span style="font-size:10px;background:rgba(35,131,226,0.2);color:#2383e2;padding:2px 6px;border-radius:4px;">${L.new}</span>` : ''}</div>
          ${roleLine ? `<div style="font-size:13px;color:#666;">${roleLine}</div>` : ''}
          ${interestBlock}
          ${extroBlock}
          ${msgHtml}
        </div>`;
    }).join('');

    const sharedHtml = showInterest && sharedInterestIds.length > 0
      ? `<div style="margin-bottom:12px;"><span style="font-size:12px;color:#666;">${L.allFondOf}</span>
         <div style="margin-top:4px;">${sharedInterestIds.map(id => {
           const tag = findInterest(id);
           return tag ? `<span style="display:inline-block;padding:4px 10px;background:#e3f2fd;color:#1976d2;border-radius:6px;font-size:12px;margin-right:4px;margin-bottom:4px;">${tag.emoji} ${tag.name}</span>` : '';
         }).join('')}</div></div>`
      : '';

    return `
      <div style="margin-bottom:24px;padding:16px;background:#fff;border:1px solid #e0e0e0;border-radius:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;font-size:18px;">🎯 ${team.name}</h3>
          <span style="padding:4px 12px;background:rgba(255,182,193,0.3);border-radius:12px;font-size:12px;color:#c44569;">${L.cohesion}: ${(team.cohesionScore * 100).toFixed(0)}%</span>
        </div>
        ${sharedHtml}
        ${membersHtml}
      </div>`;
  }).join('');
}

function buildFullEmailHtml(session, teams) {
  const sessionName = session.name || 'Session';
  const teamsHtml = buildTeamsHtml(session, teams);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WHO2MEET - Team Results</title>
</head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <div style="max-width:640px;margin:0 auto;background:#fff;padding:24px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <h1 style="margin:0 0 8px;font-size:24px;color:#333;">WHO2MEET</h1>
    <p style="margin:0 0 20px;color:#666;font-size:14px;">Find Your Perfect Team</p>
    <h2 style="margin:0 0 20px;font-size:18px;color:#333;">Team Results — ${escapeHtml(sessionName)}</h2>
    <p style="margin:0 0 16px;font-size:13px;color:#666;">Session code: <strong>${escapeHtml(session.code)}</strong></p>
    ${teamsHtml}
    <p style="margin-top:24px;font-size:12px;color:#999;">Sent from WHO2MEET</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_CODE_REGEX = /^[A-Za-z0-9]{6}$/;

async function captureScreenshot(html) {
  return null;
}

exports.sendTeamResultsEmail = functions
  .runWith({ memory: '1GB', timeoutSeconds: 60, secrets: [resendApiKey] })
  .https.onCall(async (data, context) => {
    const { email, sessionCode } = data || {};

    // Validation: email format
    if (!email || typeof email !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Email is required.');
    }
    const emailTrimmed = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(emailTrimmed)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email format.');
    }

    // Validation: session code
    if (!sessionCode || typeof sessionCode !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Session code is required.');
    }
    const code = sessionCode.trim().toUpperCase();
    if (!SESSION_CODE_REGEX.test(code)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid session code. Must be 6 characters.');
    }

    // Fetch session from Firebase
    const sessionRef = db.ref('sessions/' + code);
    const snapshot = await sessionRef.once('value');
    const session = snapshot.val();
    if (!session) {
      throw new functions.https.HttpsError('not-found', 'Session not found.');
    }

    const teams = session.teams ? Object.values(session.teams) : [];
    if (teams.length === 0) {
      throw new functions.https.HttpsError('failed-precondition', 'No teams found. Run matching first.');
    }

    const html = buildFullEmailHtml(session, teams);
    let screenshotBuffer = null;
    try {
      screenshotBuffer = await captureScreenshot(html);
    } catch (e) {
      console.warn('Screenshot skipped:', e.message);
    }

    const apiKey = resendApiKey.value() || process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('Resend API key not configured. Add RESEND_API_KEY secret in Secret Manager.');
      throw new functions.https.HttpsError('failed-precondition', 'Email service not configured. Contact admin.');
    }

    const resend = new Resend(apiKey);
    const attachments = [];
    if (screenshotBuffer && screenshotBuffer.length > 0) {
      attachments.push({
        filename: 'teams-screenshot.png',
        content: screenshotBuffer,
      });
    }

    const sessionName = session.name || 'Session';
    const subject = `[WHO2MEET] Team Results — ${sessionName}`;

    // Resend sandbox (onboarding@resend.dev) only allows: delivered@resend.dev, bounced@resend.dev, complained@resend.dev
    // v1.1 - force redeploy for process.env fallback + error surfacing
    if (!emailTrimmed.endsWith('@resend.dev')) {
      console.warn('Resend sandbox: sending to non-@resend.dev may fail. Use delivered@resend.dev for testing, or verify domain for production.');
    }

    const { error } = await resend.emails.send({
      from: 'WHO2MEET <onboarding@resend.dev>',
      to: emailTrimmed,
      subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (error) {
      console.error('Resend error:', error);
      const errMsg = (error && error.message) ? error.message : 'Unknown error';
      throw new functions.https.HttpsError('failed-precondition', `Failed to send email: ${errMsg}`);
    }

    return { success: true, message: 'Email sent.' };
  });
