(function () {
    'use strict';

    function initEvents() {
        var W = window.WHO2MEET;
        if (!W) return;
        var state = W.state;
        var utils = W.utils;
        var firebase = W.firebase;
        var tags = W.tags;
        var nav = W.nav;
        var matching = W.matching;
        var render = W.render;
        var joinCodeInput = document.getElementById('join-code');
        if (joinCodeInput) {
            joinCodeInput.addEventListener('input', function (e) {
                e.target.value = e.target.value.toUpperCase();
                document.getElementById('btn-go-join').disabled = e.target.value.length !== 6;
            });
        }

        document.getElementById('btn-go-join') && document.getElementById('btn-go-join').addEventListener('click', function () {
            var codeEl = document.getElementById('join-code');
            var displayEl = document.getElementById('display-join-code');
            if (codeEl && displayEl) {
                displayEl.textContent = codeEl.value;
                nav.showScreen('join-session');
            }
        });

        document.getElementById('btn-go-create') && document.getElementById('btn-go-create').addEventListener('click', function () {
            if (W.params) {
                W.params.initCreateParams();
                W.params.populateDefaultTags();
            }
            nav.showScreen('create-session');
        });

        document.querySelectorAll('[data-go]').forEach(function (btn) {
            btn.addEventListener('click', function () { nav.showScreen(btn.dataset.go); });
        });

        document.getElementById('btn-instructor-relogin') && document.getElementById('btn-instructor-relogin').addEventListener('click', function (e) {
            e.preventDefault();
            nav.showScreen('instructor-relogin');
        });

        document.getElementById('logo-home') && document.getElementById('logo-home').addEventListener('click', function (e) {
            e.preventDefault();
            nav.showScreen('landing');
        });

        document.getElementById('btn-quick-test') && document.getElementById('btn-quick-test').addEventListener('click', function (e) {
            e.preventDefault();
            if (W.renderfortest && W.renderfortest.runQuickTest) {
                W.renderfortest.runQuickTest();
            }
        });

        var feedbackOverlay = document.getElementById('feedback-overlay');
        var feedbackForm = document.getElementById('feedback-form');
        var feedbackContent = document.getElementById('feedback-content');
        var feedbackIncludeEmail = document.getElementById('feedback-include-email');
        var feedbackEmailWrap = document.getElementById('feedback-email-wrap');
        var feedbackEmail = document.getElementById('feedback-email');
        document.getElementById('btn-feedback') && document.getElementById('btn-feedback').addEventListener('click', function (e) {
            e.preventDefault();
            if (feedbackOverlay) feedbackOverlay.classList.add('feedback-visible');
        });
        document.getElementById('feedback-close') && document.getElementById('feedback-close').addEventListener('click', function () {
            if (feedbackOverlay) feedbackOverlay.classList.remove('feedback-visible');
        });
        if (feedbackOverlay) {
            feedbackOverlay.addEventListener('click', function (e) {
                if (e.target === feedbackOverlay) feedbackOverlay.classList.remove('feedback-visible');
            });
        }
        if (feedbackIncludeEmail && feedbackEmailWrap) {
            feedbackIncludeEmail.addEventListener('change', function () {
                feedbackEmailWrap.style.display = feedbackIncludeEmail.checked ? 'block' : 'none';
                if (!feedbackIncludeEmail.checked && feedbackEmail) feedbackEmail.value = '';
            });
        }
        if (feedbackForm) {
            feedbackForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                var content = feedbackContent && feedbackContent.value.trim();
                if (!content) return;
                var confirmMsg = (W.i18n && W.i18n.t) ? W.i18n.t('feedbackConfirm') : '보내시겠습니까?';
                if (!confirm(confirmMsg)) return;
                var email = (feedbackIncludeEmail && feedbackIncludeEmail.checked && feedbackEmail) ? feedbackEmail.value.trim() : '';
                try {
                    await firebase.saveFeedbackInDB({ content: content, email: email });
                    var successMsg = (W.i18n && W.i18n.t) ? W.i18n.t('feedbackSuccess') : '감사합니다! 피드백이 전송되었습니다.';
                    alert(successMsg);
                    feedbackOverlay.classList.remove('feedback-visible');
                    feedbackForm.reset();
                    if (feedbackEmailWrap) feedbackEmailWrap.style.display = 'none';
                    if (feedbackIncludeEmail) feedbackIncludeEmail.checked = false;
                } catch (err) {
                    var errMsg = (W.i18n && W.i18n.t) ? W.i18n.t('feedbackError') : '전송에 실패했습니다.';
                    alert(errMsg);
                }
            });
        }

        var reloginCodeInput = document.getElementById('relogin-code');
        var reloginNameInput = document.getElementById('relogin-name');
        var reloginPasswordInput = document.getElementById('relogin-password');
        function validateReloginForm() {
            var code = reloginCodeInput && reloginCodeInput.value.trim();
            var name = reloginNameInput && reloginNameInput.value.trim();
            var password = reloginPasswordInput && reloginPasswordInput.value.trim();
            var btn = document.getElementById('btn-instructor-login');
            if (btn) btn.disabled = !code || code.length !== 6 || !name || !password;
        }
        if (reloginCodeInput) reloginCodeInput.addEventListener('input', function (e) { e.target.value = e.target.value.toUpperCase(); validateReloginForm(); });
        if (reloginNameInput) reloginNameInput.addEventListener('input', validateReloginForm);
        if (reloginPasswordInput) reloginPasswordInput.addEventListener('input', validateReloginForm);

        document.getElementById('btn-instructor-login') && document.getElementById('btn-instructor-login').addEventListener('click', async function () {
            var code = (reloginCodeInput && reloginCodeInput.value.trim() || '').toUpperCase();
            var name = (reloginNameInput && reloginNameInput.value.trim()) || '';
            var password = (reloginPasswordInput && reloginPasswordInput.value.trim()) || '';
            try {
                var session = await firebase.getSessionByCode(code);
                if (!session) {
                    document.getElementById('relogin-error').textContent = 'Session not found. Check the code.';
                    return;
                }
                if (session.instructorName !== name || session.instructorPassword !== password) {
                    document.getElementById('relogin-error').textContent = 'Invalid name or password.';
                    return;
                }
                state.currentSession = session;
                state.isInstructor = true;
                firebase.listenToSession(code, function (updatedSession) {
                    state.currentSession = updatedSession;
                    if (state.currentScreen === 'instructor-dashboard') render.renderDashboard();
                    else if (state.currentScreen === 'results') {
                        var teams = Object.values(updatedSession.teams || {});
                        document.getElementById('results-title').textContent = 'All Teams';
                        var backBtn = document.getElementById('btn-back-dashboard');
                        if (backBtn) backBtn.style.display = 'block';
                        render.renderTeams(teams, true);
                    }
                });
                if (reloginCodeInput) reloginCodeInput.value = '';
                if (reloginNameInput) reloginNameInput.value = '';
                if (reloginPasswordInput) reloginPasswordInput.value = '';
                document.getElementById('relogin-error').textContent = '';
                render.renderDashboard();
                nav.showScreen('instructor-dashboard');
            } catch (err) {
                document.getElementById('relogin-error').textContent = 'Error: ' + err.message;
            }
        });

        var studentNameInput = document.getElementById('student-name');
        var studentPasswordInput = document.getElementById('student-password');
        function validateJoinForm() {
            var name = studentNameInput && studentNameInput.value.trim();
            var password = studentPasswordInput && studentPasswordInput.value.trim();
            var btn = document.getElementById('btn-join-session');
            if (btn) btn.disabled = !name || !password;
        }
        if (studentNameInput) studentNameInput.addEventListener('input', validateJoinForm);
        if (studentPasswordInput) studentPasswordInput.addEventListener('input', validateJoinForm);

        document.getElementById('btn-join-session') && document.getElementById('btn-join-session').addEventListener('click', async function () {
            var code = document.getElementById('display-join-code').textContent;
            var name = (studentNameInput && studentNameInput.value.trim()) || '';
            var password = (studentPasswordInput && studentPasswordInput.value.trim()) || '';
            var emojiInput = (document.getElementById('student-emoji') && document.getElementById('student-emoji').value || '').trim().slice(0, 4);
            try {
                var session = await firebase.getSessionByCode(code);
                if (!session) {
                    document.getElementById('join-error').textContent = 'Session not found. Check the code.';
                    return;
                }
                state.currentSession = session;
                var students = session.students || {};
                var existingStudent = Object.values(students).find(function (s) { return s.name.toLowerCase() === name.toLowerCase(); });

                if (existingStudent) {
                    if (existingStudent.password !== password) {
                        document.getElementById('join-error').textContent = 'Wrong password.';
                        return;
                    }
                    if (emojiInput) {
                        existingStudent.emoji = emojiInput;
                        await firebase.saveStudentInDB(code, existingStudent);
                    }
                    state.currentStudent = existingStudent;
                    if (existingStudent.roleTagIds && existingStudent.roleTagIds.length > 0) {
                        if (session.status === 'published') {
                            var teams = session.teams ? Object.values(session.teams) : [];
                            var myTeam = teams.find(function (t) { return t.memberIds && t.memberIds.includes(existingStudent.id); });
                            document.getElementById('results-title').textContent = 'Your Team';
                            render.renderTeams(myTeam ? [myTeam] : []);
                            nav.showScreen('results');
                        } else {
                            firebase.listenToSession(code, function (updatedSession) {
                                state.currentSession = updatedSession;
                                if (updatedSession.status === 'published') {
                                    var teamsList = updatedSession.teams ? Object.values(updatedSession.teams) : [];
                                    var myTeam = teamsList.find(function (t) { return t.memberIds && t.memberIds.includes(state.currentStudent.id); });
                                    document.getElementById('results-title').textContent = 'Your Team';
                                    render.renderTeams(myTeam ? [myTeam] : []);
                                    nav.showScreen('results');
                                }
                            });
                            nav.showScreen('waiting');
                        }
                    } else {
                        render.renderRoleTags();
                        render.renderInterestTags();
                        render.renderProfileStep(1);
                        nav.showScreen('profile-input');
                    }
                } else {
                    var newStudent = {
                        id: utils.generateId(),
                        name: name,
                        emoji: emojiInput || '',
                        password: password,
                        roleTagIds: [],
                        interestTagIds: [],
                        customInterest: '',
                        messageToTeam: '',
                        teamId: null
                    };
                    await firebase.saveStudentInDB(code, newStudent);
                    state.currentStudent = newStudent;
                    render.renderRoleTags();
                    render.renderInterestTags();
                    render.renderProfileStep(1);
                    nav.showScreen('profile-input');
                }
            } catch (err) {
                document.getElementById('join-error').textContent = 'Error: ' + err.message;
            }
        });

        var sessionNameInput = document.getElementById('session-name');
        var instructorNameInput = document.getElementById('instructor-name');
        var instructorPasswordInput = document.getElementById('instructor-password');
        var paramsMod = W.params || {};
        function validateCreateForm() {
            var sessionName = sessionNameInput && sessionNameInput.value.trim();
            var name = instructorNameInput && instructorNameInput.value.trim();
            var password = instructorPasswordInput && instructorPasswordInput.value.trim();
            var selectedParams = paramsMod.getSelectedParams ? paramsMod.getSelectedParams() : [];
            var locked = paramsMod.isParamLocked ? paramsMod.isParamLocked() : false;
            var roleTags = (paramsMod.getCreateRoleTags || tags.getCreateRoleTags)();
            var interestTags = (paramsMod.getCreateInterestTags || tags.getCreateInterestTags)();
            var hasRoleTags = !selectedParams.includes('role') || roleTags.length > 0;
            var hasInterestTags = !selectedParams.includes('interest') || interestTags.length > 0;
            var hasEnoughParams = selectedParams.length >= 2;
            var btn = document.getElementById('btn-create-session');
            if (btn) btn.disabled = !sessionName || !name || !password || !hasRoleTags || !hasInterestTags || !hasEnoughParams || !locked;
        }
        if (sessionNameInput) sessionNameInput.addEventListener('input', validateCreateForm);
        if (instructorNameInput) instructorNameInput.addEventListener('input', validateCreateForm);
        if (instructorPasswordInput) instructorPasswordInput.addEventListener('input', validateCreateForm);

        document.getElementById('param-tiles-scroll') && document.getElementById('param-tiles-scroll').addEventListener('click', function (e) {
            if (e.target.classList.contains('btn-add-tag')) {
                var param = e.target.dataset.param;
                if (param === 'role' && paramsMod.appendCreateRoleTagRow) paramsMod.appendCreateRoleTagRow('', '');
                else if (param === 'interest' && paramsMod.appendCreateInterestTagRow) paramsMod.appendCreateInterestTagRow('', '');
                validateCreateForm();
            }
            if (e.target.classList.contains('btn-remove-tag')) {
                var row = e.target.closest('.create-tag-row');
                if (row) row.remove();
                validateCreateForm();
            }
        });
        document.getElementById('param-tiles-scroll') && document.getElementById('param-tiles-scroll').addEventListener('input', validateCreateForm);

        document.getElementById('btn-param-done') && document.getElementById('btn-param-done').addEventListener('click', function () {
            var selected = paramsMod.getSelectedParams ? paramsMod.getSelectedParams() : [];
            if (selected.length < 2) {
                document.getElementById('create-error').textContent = 'Select at least 2 parameters.';
                return;
            }
            var roleTags = (paramsMod.getCreateRoleTags || tags.getCreateRoleTags)();
            var interestTags = (paramsMod.getCreateInterestTags || tags.getCreateInterestTags)();
            if (selected.includes('role') && roleTags.length === 0) {
                document.getElementById('create-error').textContent = 'Add at least one role tag.';
                return;
            }
            if (selected.includes('interest') && interestTags.length === 0) {
                document.getElementById('create-error').textContent = 'Add at least one interest tag.';
                return;
            }
            document.getElementById('create-error').textContent = '';
            if (paramsMod.lockParamsAndShowWeights && paramsMod.lockParamsAndShowWeights()) validateCreateForm();
        });

        document.getElementById('btn-create-session') && document.getElementById('btn-create-session').addEventListener('click', async function () {
            var sessionName = (sessionNameInput && sessionNameInput.value.trim()) || '';
            var instructorName = (instructorNameInput && instructorNameInput.value.trim()) || '';
            var instructorEmoji = (document.getElementById('instructor-emoji') && document.getElementById('instructor-emoji').value || '').trim().slice(0, 4);
            var instructorPassword = (instructorPasswordInput && instructorPasswordInput.value.trim()) || '';
            var code = utils.generateSessionCode();
            var teamSize = parseInt((document.getElementById('team-size') && document.getElementById('team-size').value) || '4', 10);
            var selectedParams = paramsMod.getSelectedParams ? paramsMod.getSelectedParams() : ['role', 'interest'];
            var weights = paramsMod.getWeightsForSession ? paramsMod.getWeightsForSession(selectedParams) : { role: 50, interest: 50 };
            var roleTags = (paramsMod.getCreateRoleTags || tags.getCreateRoleTags)();
            var interestTags = (paramsMod.getCreateInterestTags || tags.getCreateInterestTags)();
            if (!paramsMod.isParamLocked || !paramsMod.isParamLocked()) {
                document.getElementById('create-error').textContent = 'Click "설정 완료" first.';
                return;
            }
            if (selectedParams.includes('role') && roleTags.length === 0) {
                document.getElementById('create-error').textContent = 'Add at least one role tag.';
                return;
            }
            if (selectedParams.includes('interest') && interestTags.length === 0) {
                document.getElementById('create-error').textContent = 'Add at least one interest tag.';
                return;
            }
            var newSession = {
                id: utils.generateId(),
                code: code,
                name: sessionName,
                instructorName: instructorName,
                instructorEmoji: instructorEmoji || '',
                instructorPassword: instructorPassword,
                teamSize: teamSize,
                selectedParams: selectedParams,
                weights: weights,
                weightRole: weights.role || 0,
                weightInterest: weights.interest || 0,
                weightExtroversion: weights.extroversion || 0,
                status: 'open',
                students: {},
                teams: {},
                roleTags: roleTags,
                interestTags: interestTags
            };
            document.getElementById('create-error').textContent = '';
            try {
                await firebase.createSessionInDB(newSession);
                state.currentSession = newSession;
                state.isInstructor = true;
                firebase.listenToSession(code, function (updatedSession) {
                    state.currentSession = updatedSession;
                    if (state.currentScreen === 'instructor-dashboard') render.renderDashboard();
                    else if (state.currentScreen === 'results') {
                        var teams = Object.values(updatedSession.teams || {});
                        document.getElementById('results-title').textContent = 'All Teams';
                        var backBtn = document.getElementById('btn-back-dashboard');
                        if (backBtn) backBtn.style.display = 'block';
                        render.renderTeams(teams, true);
                    }
                });
                render.renderDashboard();
                nav.showScreen('instructor-dashboard');
            } catch (err) {
                document.getElementById('create-error').textContent = 'Error: ' + err.message;
            }
        });

        document.getElementById('role-tags') && document.getElementById('role-tags').addEventListener('click', function (e) {
            var tagItem = e.target.closest('.tag-item');
            if (!tagItem) return;
            var tagId = tagItem.dataset.tagId;
            var index = state.selectedRoles.indexOf(tagId);
            if (index === -1) {
                if (state.selectedRoles.length >= 2) state.selectedRoles[1] = tagId;
                else state.selectedRoles.push(tagId);
            } else {
                state.selectedRoles.splice(index, 1);
            }
            render.renderRoleTags();
            render.updateRolePrioritySummary();
            render.validateProfileStep();
        });

        document.getElementById('interest-tags') && document.getElementById('interest-tags').addEventListener('click', function (e) {
            var tagItem = e.target.closest('.tag-item');
            if (!tagItem) return;
            var tagId = tagItem.dataset.tagId;
            var index = state.selectedInterests.indexOf(tagId);
            if (index === -1) state.selectedInterests.push(tagId);
            else state.selectedInterests.splice(index, 1);
            var customGroup = document.getElementById('custom-interest-group');
            if (customGroup) customGroup.style.display = state.selectedInterests.includes('others') ? 'block' : 'none';
            render.renderInterestTags();
            render.validateProfileStep();
        });

        document.getElementById('custom-interest') && document.getElementById('custom-interest').addEventListener('input', render.validateProfileStep);
        document.getElementById('message-to-team') && document.getElementById('message-to-team').addEventListener('input', render.validateProfileStep);

        var extroversionSlider = document.getElementById('extroversion-slider');
        if (extroversionSlider) {
            extroversionSlider.addEventListener('input', function () {
                var val = parseInt(extroversionSlider.value, 10) || 5;
                state.extroversionScore = Math.max(0, Math.min(10, val));
                var valueEl = document.getElementById('extroversion-value');
                if (valueEl) valueEl.textContent = state.extroversionScore;
            });
        }

        document.getElementById('btn-profile-back') && document.getElementById('btn-profile-back').addEventListener('click', function () {
            var visibleSteps = render.getVisibleProfileSteps ? render.getVisibleProfileSteps(state.currentSession) : ['role', 'interest', 'message'];
            if (state.profileStep === 1) nav.showScreen('landing');
            else render.renderProfileStep(state.profileStep - 1);
        });

        document.getElementById('btn-profile-next') && document.getElementById('btn-profile-next').addEventListener('click', async function () {
            var visibleSteps = render.getVisibleProfileSteps ? render.getVisibleProfileSteps(state.currentSession) : ['role', 'interest', 'message'];
            if (state.profileStep < visibleSteps.length) {
                render.renderProfileStep(state.profileStep + 1);
            } else {
                var student = state.currentStudent;
                var session = state.currentSession;
                var selParams = session && session.selectedParams ? session.selectedParams : ['role', 'interest'];
                student.roleTagIds = selParams.includes('role') ? state.selectedRoles.slice() : [];
                student.interestTagIds = selParams.includes('interest') ? state.selectedInterests.slice() : [];
                student.customInterest = (document.getElementById('custom-interest') && document.getElementById('custom-interest').value || '').trim();
                student.extroversionScore = selParams.includes('extroversion') ? state.extroversionScore : undefined;
                student.messageToTeam = (document.getElementById('message-to-team') && document.getElementById('message-to-team').value || '').trim();
                try {
                    await firebase.saveStudentInDB(state.currentSession.code, student);
                    state.selectedRoles = [];
                    state.selectedInterests = [];
                    var session = state.currentSession;
                    if (session.status === 'published') {
                        var myTeam = await firebase.assignLateJoinerToTeam(session.code, session, student);
                        if (myTeam) {
                            state.currentStudent = student;
                            await new Promise(function (r) { setTimeout(r, 350); });
                            var updatedSession = await firebase.getSessionByCode(session.code);
                            state.currentSession = updatedSession;
                            var teams = Object.values(updatedSession.teams || {});
                            var myTeamFromSession = teams.find(function (t) { return t.memberIds && t.memberIds.includes(student.id); });
                            document.getElementById('results-title').textContent = 'Your Team';
                            render.renderTeams(myTeamFromSession ? [myTeamFromSession] : [myTeam]);
                            nav.showScreen('results');
                            firebase.listenToSession(session.code, function (nextSession) {
                                state.currentSession = nextSession;
                                if (state.currentScreen === 'results' && state.currentStudent) {
                                    var nextTeams = Object.values(nextSession.teams || {});
                                    var nextMyTeam = nextTeams.find(function (t) { return t.memberIds && t.memberIds.includes(state.currentStudent.id); });
                                    if (nextMyTeam) {
                                        document.getElementById('results-title').textContent = 'Your Team';
                                        render.renderTeams([nextMyTeam]);
                                    }
                                }
                            });
                        } else {
                            nav.showScreen('waiting');
                        }
                    } else {
                        firebase.listenToSession(state.currentSession.code, function (updatedSession) {
                            state.currentSession = updatedSession;
                            if (updatedSession.status === 'published') {
                                var teams = updatedSession.teams ? Object.values(updatedSession.teams) : [];
                                var myTeam = teams.find(function (t) { return t.memberIds && t.memberIds.includes(student.id); });
                                document.getElementById('results-title').textContent = 'Your Team';
                                render.renderTeams(myTeam ? [myTeam] : []);
                                nav.showScreen('results');
                            }
                        });
                        nav.showScreen('waiting');
                    }
                } catch (err) {
                    alert('Error saving profile: ' + err.message);
                }
            }
        });

        document.getElementById('btn-check-status') && document.getElementById('btn-check-status').addEventListener('click', async function () {
            try {
                var session = await firebase.getSessionByCode(state.currentSession.code);
                state.currentSession = session;
                if (session && session.status === 'published') {
                    var teams = session.teams ? Object.values(session.teams) : [];
                    var myTeam = teams.find(function (t) { return t.memberIds && t.memberIds.includes(state.currentStudent.id); });
                    document.getElementById('results-title').textContent = 'Your Team';
                    render.renderTeams(myTeam ? [myTeam] : []);
                    nav.showScreen('results');
                }
            } catch (err) { console.error(err); }
        });

        document.getElementById('btn-refresh') && document.getElementById('btn-refresh').addEventListener('click', async function () {
            try {
                var session = await firebase.getSessionByCode(state.currentSession.code);
                state.currentSession = session;
                render.renderDashboard();
            } catch (err) { console.error(err); }
        });

        document.getElementById('btn-run-matching') && document.getElementById('btn-run-matching').addEventListener('click', async function () {
            var session = state.currentSession;
            if (session.status === 'published') {
                var teams = session.teams ? Object.values(session.teams) : [];
                document.getElementById('results-title').textContent = 'All Teams';
                var backBtn = document.getElementById('btn-back-dashboard');
                if (backBtn) backBtn.style.display = 'block';
                render.renderTeams(teams, true);
                nav.showScreen('results');
            } else {
                try {
                    var latestSession = await firebase.getSessionByCode(session.code);
                    state.currentSession = latestSession;
                    var teams = matching.runMatching(latestSession);
                    if (teams.length === 0) {
                        alert('No students have submitted their profiles yet!');
                        return;
                    }
                    var teamsObj = {};
                    teams.forEach(function (team) { teamsObj[team.id] = team; });
                    await firebase.saveTeamsInDB(session.code, teamsObj);
                    state.currentSession.teams = teamsObj;
                    state.currentSession.status = 'published';
                    render.renderDashboard();
                    document.getElementById('results-title').textContent = 'All Teams';
                    var backBtn = document.getElementById('btn-back-dashboard');
                    if (backBtn) backBtn.style.display = 'block';
                    render.renderTeams(teams, true);
                    nav.showScreen('results');
                } catch (err) {
                    alert('Error running matching: ' + err.message);
                }
            }
        });

        document.getElementById('btn-back-dashboard') && document.getElementById('btn-back-dashboard').addEventListener('click', function () {
            nav.showScreen('instructor-dashboard');
        });

        var emailResultsOverlay = document.getElementById('email-results-overlay');
        var emailResultsForm = document.getElementById('email-results-form');
        var emailResultsInput = document.getElementById('email-results-input');
        var emailResultsSubmit = document.getElementById('btn-email-results-submit');
        document.getElementById('btn-email-results') && document.getElementById('btn-email-results').addEventListener('click', function () {
            if (emailResultsOverlay) {
                if (W.i18n && W.i18n.applyToPage) W.i18n.applyToPage();
                emailResultsOverlay.classList.add('email-results-visible');
                if (emailResultsInput) emailResultsInput.value = '';
            }
        });
        document.getElementById('email-results-close') && document.getElementById('email-results-close').addEventListener('click', function () {
            if (emailResultsOverlay) emailResultsOverlay.classList.remove('email-results-visible');
        });
        if (emailResultsOverlay) {
            emailResultsOverlay.addEventListener('click', function (e) {
                if (e.target === emailResultsOverlay) emailResultsOverlay.classList.remove('email-results-visible');
            });
        }
        if (emailResultsForm) {
            emailResultsForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                var email = emailResultsInput && emailResultsInput.value.trim();
                if (!email) return;
                var confirmMsg = (W.i18n && W.i18n.t) ? W.i18n.t('emailResultsConfirm') : '이메일로 전송하시겠습니까?';
                if (!confirm(confirmMsg)) return;
                var session = state.currentSession;
                if (!session || !session.code) {
                    alert((W.i18n && W.i18n.t) ? W.i18n.t('emailResultsError') : '세션이 없습니다.');
                    return;
                }
                var teams = session.teams ? Object.values(session.teams) : [];
                if (teams.length === 0) {
                    alert((W.i18n && W.i18n.t) ? W.i18n.t('emailResultsNoTeams') : '매칭된 팀이 없습니다. 먼저 매칭을 실행하세요.');
                    return;
                }
                if (emailResultsSubmit) emailResultsSubmit.disabled = true;
                try {
                    await firebase.sendTeamResultsEmail(email, session.code);
                    var successMsg = (W.i18n && W.i18n.t) ? W.i18n.t('emailResultsSuccess') : '전송되었습니다. 이메일을 확인해주세요.';
                    alert(successMsg);
                    emailResultsOverlay.classList.remove('email-results-visible');
                    emailResultsForm.reset();
                } catch (err) {
                    var errMsg = (err && err.message) ? err.message : ((W.i18n && W.i18n.t) ? W.i18n.t('emailResultsError') : '전송에 실패했습니다.');
                    alert(errMsg);
                } finally {
                    if (emailResultsSubmit) emailResultsSubmit.disabled = false;
                }
            });
        }
    }

    window.WHO2MEET_initEvents = initEvents;
})();
