(function () {
    'use strict';

    if (window.__studentSessionBootstrapInstalled) {
        return;
    }
    window.__studentSessionBootstrapInstalled = true;

    function getCookieValue(name) {
        try {
            var parts = document.cookie ? document.cookie.split(';') : [];
            for (var i = 0; i < parts.length; i++) {
                var part = parts[i].trim();
                if (!part) continue;
                var splitIndex = part.indexOf('=');
                var key = splitIndex >= 0 ? part.slice(0, splitIndex) : part;
                if (key === name) {
                    var value = splitIndex >= 0 ? part.slice(splitIndex + 1) : '';
                    try {
                        return decodeURIComponent(value);
                    } catch (err) {
                        return value;
                    }
                }
            }
        } catch (err) {
            return null;
        }

        return null;
    }

    function getAllSessions() {
        try {
            return JSON.parse(localStorage.getItem('auth_sessions') || '{}');
        } catch (err) {
            return {};
        }
    }

    function getRoleFromSession(session) {
        var role = session && (session.role || (session.user && session.user.role));
        return String(role || '').toLowerCase();
    }

    function isStudentPage() {
        var page = (window.location.pathname.split('/').pop() || '').toLowerCase();
        return page.startsWith('student-');
    }

    function resolveStudentSession() {
        var sessions = getAllSessions();
        var currentSessionId = sessionStorage.getItem('current_session_id');

        if (currentSessionId && sessions[currentSessionId] && getRoleFromSession(sessions[currentSessionId]) === 'student') {
            return { sessionId: currentSessionId, session: sessions[currentSessionId] };
        }

        var cookieToken = getCookieValue('auth_token');
        if (cookieToken) {
            var cookieMatched = Object.entries(sessions).find(function (entry) {
                var session = entry[1];
                return session && session.token === cookieToken && getRoleFromSession(session) === 'student';
            });

            if (cookieMatched) {
                sessionStorage.setItem('current_session_id', cookieMatched[0]);
                return { sessionId: cookieMatched[0], session: cookieMatched[1] };
            }
        }

        return null;
    }

    function hydrateSessionStorage(session) {
        if (!session || !session.user) {
            return;
        }

        var user = session.user;
        var meta = session.meta || {};
        var college = user.college || meta.college || 'necn';

        sessionStorage.setItem('student_id', String(user.id || ''));
        sessionStorage.setItem('student_name', String(user.name || ''));
        sessionStorage.setItem('student_email', String(user.email || ''));
        sessionStorage.setItem('student_branch', String(user.branch || ''));
        sessionStorage.setItem('student_year', String(user.year || ''));
        sessionStorage.setItem('student_college', String(college));
        sessionStorage.setItem('role', 'student');

        if (session.token) {
            sessionStorage.setItem('authToken', session.token);
        }
    }

    function clearStudentSessionStorage() {
        var keys = [
            'student_id',
            'student_name',
            'student_email',
            'student_branch',
            'student_year',
            'student_college',
            'role',
            'authToken'
        ];

        for (var i = 0; i < keys.length; i++) {
            sessionStorage.removeItem(keys[i]);
        }
    }

    function redirectToLogin() {
        window.location.replace('login-student.html');
    }

    function bootstrap() {
        if (!window.AuthSessionManager) {
            if (isStudentPage()) {
                redirectToLogin();
            }
            return;
        }

        var resolved = resolveStudentSession();
        if (!resolved || !resolved.session || getRoleFromSession(resolved.session) !== 'student') {
            clearStudentSessionStorage();
            if (isStudentPage()) {
                redirectToLogin();
            }
            return;
        }

        hydrateSessionStorage(resolved.session);
    }

    bootstrap();
})();