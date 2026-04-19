(function () {
    'use strict';

    if (window.__facultySessionBootstrapInstalled) {
        return;
    }
    window.__facultySessionBootstrapInstalled = true;

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

    function isFacultyPage() {
        var page = (window.location.pathname.split('/').pop() || '').toLowerCase();
        if (!page.startsWith('faculty-')) {
            return false;
        }

        return page !== 'faculty-reset-password.html';
    }

    function resolveFacultySession() {
        var sessions = getAllSessions();
        var currentSessionId = sessionStorage.getItem('current_session_id');

        if (currentSessionId && sessions[currentSessionId] && getRoleFromSession(sessions[currentSessionId]) === 'faculty') {
            return { sessionId: currentSessionId, session: sessions[currentSessionId] };
        }

        var cookieToken = getCookieValue('auth_token');
        if (cookieToken) {
            var cookieMatched = Object.entries(sessions).find(function (entry) {
                var session = entry[1];
                return session && session.token === cookieToken && getRoleFromSession(session) === 'faculty';
            });

            if (cookieMatched) {
                sessionStorage.setItem('current_session_id', cookieMatched[0]);
                return { sessionId: cookieMatched[0], session: cookieMatched[1] };
            }
        }

        var firstFaculty = Object.entries(sessions).find(function (entry) {
            return getRoleFromSession(entry[1]) === 'faculty';
        });

        if (firstFaculty) {
            sessionStorage.setItem('current_session_id', firstFaculty[0]);
            return { sessionId: firstFaculty[0], session: firstFaculty[1] };
        }

        return null;
    }

    function hydrateSessionStorage(session) {
        if (!session || !session.user) {
            return;
        }

        var user = session.user;
        var privileges = session.privileges || user.privileges || {};

        sessionStorage.setItem('faculty_id', String(user.id || ''));
        sessionStorage.setItem('faculty_name', String(user.name || ''));
        sessionStorage.setItem('faculty_email', String(user.email || ''));
        sessionStorage.setItem('faculty_department', String(user.department || ''));
        sessionStorage.setItem('faculty_designation', String(user.designation || 'Faculty Member'));
        sessionStorage.setItem('faculty_phone', String(user.phone || ''));
        sessionStorage.setItem('faculty_campus_type', String(user.campusType || (session.meta && session.meta.college) || 'NECN'));
        sessionStorage.setItem('faculty_privileges', JSON.stringify(privileges));

        if (session.token) {
            sessionStorage.setItem('authToken', session.token);
        }
    }

    function clearFacultySessionStorage() {
        var keys = [
            'faculty_id',
            'faculty_name',
            'faculty_email',
            'faculty_department',
            'faculty_designation',
            'faculty_phone',
            'faculty_campus_type',
            'faculty_privileges',
            'authToken'
        ];

        for (var i = 0; i < keys.length; i++) {
            sessionStorage.removeItem(keys[i]);
        }
    }

    function redirectToLogin() {
        window.location.replace('login-faculty.html');
    }

    function bootstrap() {
        if (!window.AuthSessionManager) {
            if (isFacultyPage()) {
                redirectToLogin();
            }
            return;
        }

        var resolved = resolveFacultySession();
        if (!resolved || !resolved.session || getRoleFromSession(resolved.session) !== 'faculty') {
            clearFacultySessionStorage();
            if (isFacultyPage()) {
                redirectToLogin();
            }
            return;
        }

        hydrateSessionStorage(resolved.session);
    }

    bootstrap();
})();