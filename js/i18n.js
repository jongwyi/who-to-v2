const translations = {
    en: {
        appTitle: 'WHO2MEET',
        subtitle: 'Find Your Perfect Team',
        sessionCode: 'Session Code',
        joinSession: 'Join Session',
        createSession: 'Create New Session (Instructor)',
        reEnterInstructor: 'Re-enter as Instructor →',
        yourName: 'Your Name',
        password: 'Password',
        emojiOptional: 'Emoji (optional)',
        continue: 'Continue →',
        back: '← Back',
        sessionName: 'Session Name',
        yourNameInstructor: 'Your Name (Instructor)',
        teamSize: 'Team Size',
        roleTags: 'Role Tags',
        interestTags: 'Interest Tags',
        matchingWeights: 'Matching Weights',
        weightHint: 'Adjust how much each factor matters (must sum to 100%)',
        roleDiversity: 'Role Diversity',
        interestSimilarity: 'Interest Similarity',
        createSessionBtn: 'Create Session →',
        stepRoles: 'Your Roles',
        stepInterests: 'Your Interests',
        stepMessage: 'Message to Team',
        next: 'Next →',
        submit: 'Submit ✓',
        previous: '← Previous',
        waiting: 'Waiting for teams to be assigned...',
        checkStatus: 'Check Status',
        instructorDashboard: 'Instructor Dashboard',
        shareCode: 'Share this code with your students',
        runMatching: 'Run Matching',
        viewResults: 'View Results →',
        refresh: 'Refresh',
        studentsJoined: 'Students joined',
        yourTeam: 'Your Team',
        allTeams: 'All Teams',
        backToDashboard: '← Back to Dashboard',
        noTeamsYet: 'No teams yet.',
        cohesion: 'Cohesion',
        you: '(You)',
        new: 'new'
    },
    ko: {
        appTitle: 'WHO2MEET',
        subtitle: '완벽한 팀을 만나세요',
        sessionCode: '세션 코드',
        joinSession: '세션 참여',
        createSession: '새 세션 만들기 (강사)',
        reEnterInstructor: '강사로 다시 들어가기 →',
        yourName: '이름',
        password: '비밀번호',
        emojiOptional: '이모지 (선택)',
        continue: '계속 →',
        back: '← 뒤로',
        sessionName: '세션 이름',
        yourNameInstructor: '이름 (강사)',
        teamSize: '팀 크기',
        roleTags: '역할 태그',
        interestTags: '관심사 태그',
        matchingWeights: '매칭 가중치',
        weightHint: '각 요소의 비중을 조절하세요 (합 100%)',
        roleDiversity: '역할 다양성',
        interestSimilarity: '관심사 유사도',
        createSessionBtn: '세션 만들기 →',
        stepRoles: '당신의 역할',
        stepInterests: '당신의 관심사',
        stepMessage: '팀에게 한마디',
        next: '다음 →',
        submit: '제출 ✓',
        previous: '← 이전',
        waiting: '팀 배정을 기다리는 중...',
        checkStatus: '상태 확인',
        instructorDashboard: '강사 대시보드',
        shareCode: '학생들에게 이 코드를 공유하세요',
        runMatching: '매칭 실행',
        viewResults: '결과 보기 →',
        refresh: '새로고침',
        studentsJoined: '참가한 학생',
        yourTeam: '내 팀',
        allTeams: '전체 팀',
        backToDashboard: '← 대시보드로',
        noTeamsYet: '아직 팀이 없습니다.',
        cohesion: '응집도',
        you: '(나)',
        new: 'new'
    }
};

let currentLang = 'en';

export function getLang() {
    return currentLang;
}

export function setLang(lang) {
    if (translations[lang]) currentLang = lang;
}

export function t(key) {
    return translations[currentLang][key] ?? translations.en[key] ?? key;
}

export function applyToPage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) el.placeholder = t(key);
    });
}
