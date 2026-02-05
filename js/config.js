// Firebase & app config
export const firebaseConfig = {
    apiKey: "AIzaSyAN_uJM7v23CSv8et3sGKUJI04kDpVUIAU",
    authDomain: "who-to-75f43.firebaseapp.com",
    databaseURL: "https://who-to-75f43-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "who-to-75f43",
    storageBucket: "who-to-75f43.firebasestorage.app",
    messagingSenderId: "532213077301",
    appId: "1:532213077301:web:c5a8301dc2105d478c287c",
    measurementId: "G-8M5X3DL7FS"
};

export const ROLE_TAGS = [
    { id: 'engineer', name: 'Engineer', emoji: '💻' },
    { id: 'researcher', name: 'Researcher', emoji: '🔬' },
    { id: 'data-analyst', name: 'Data Analyst', emoji: '📊' },
    { id: 'designer', name: 'Designer', emoji: '🎨' },
    { id: 'speech-giver', name: 'Speech Giver', emoji: '🎤' }
];

export const INTEREST_TAGS = [
    { id: 'health-care', name: 'Health Care', emoji: '🏥' },
    { id: 'edu-tech', name: 'Edu Tech', emoji: '📚' },
    { id: 'fin-tech', name: 'Fin Tech', emoji: '💰' },
    { id: 'social-impact', name: 'Social Impact', emoji: '🌍' },
    { id: 'others', name: 'Others', emoji: '✏️' }
];

/** Matching parameters: id, labelKey (i18n), defaultOn, hasForm (role/interest/extroversion have forms) */
export const MATCHING_PARAMS = [
    { id: 'role', labelKey: 'roleDiversity', defaultOn: true, hasForm: true },
    { id: 'interest', labelKey: 'interestSimilarity', defaultOn: true, hasForm: true },
    { id: 'extroversion', labelKey: 'extroversionBalance', defaultOn: false, hasForm: true }
];
