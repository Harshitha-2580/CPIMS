(function () {
    if (window.__logoutBackGuardInstalled) {
        return;
    }
    window.__logoutBackGuardInstalled = true;

    var BACK_PROMPT_SEEN_KEY = 'logout_back_guard_prompt_seen_page';

    var ROLE_LOGIN_MAP = {
        student: 'login-student.html',
        faculty: 'login-faculty.html',
        admin: 'login-admin.html',
        super: 'login-admin.html',
        superadmin: 'login-admin.html',
        placement: 'login-placement.html'
    };

    function getPageRole() {
        var page = (window.location.pathname.split('/').pop() || '').toLowerCase();
        if (page.indexOf('student-dashboard.html') !== -1) return 'student';
        if (page.indexOf('faculty-dashboard.html') !== -1) return 'faculty';
        if (page.indexOf('admin-dashboard.html') !== -1) return 'admin';
        return null;
    }

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

    function removeCookie(name) {
        document.cookie = name + '=; path=/; max-age=0; samesite=lax';
    }

    function getAuthSessions() {
        try {
            return JSON.parse(localStorage.getItem('auth_sessions') || '{}');
        } catch (err) {
            return {};
        }
    }

    function saveAuthSessions(sessions) {
        localStorage.setItem('auth_sessions', JSON.stringify(sessions || {}));
    }

    function getCurrentAuthSession() {
        var sessions = getAuthSessions();
        var currentSessionId = sessionStorage.getItem('current_session_id');
        if (currentSessionId && sessions[currentSessionId]) {
            return { sessionId: currentSessionId, session: sessions[currentSessionId] };
        }

        var cookieToken = getCookieValue('auth_token');
        if (cookieToken) {
            var sessionIds = Object.keys(sessions);
            for (var i = 0; i < sessionIds.length; i++) {
                var sessionId = sessionIds[i];
                var candidate = sessions[sessionId];
                if (candidate && candidate.token === cookieToken) {
                    sessionStorage.setItem('current_session_id', sessionId);
                    return { sessionId: sessionId, session: candidate };
                }
            }
        }

        return { sessionId: currentSessionId || null, session: null };
    }

    function getCurrentRole() {
        var authSession = getCurrentAuthSession();
        if (authSession.session && authSession.session.role) {
            return String(authSession.session.role).toLowerCase();
        }

        var sessionRole = sessionStorage.getItem('admin_role') || sessionStorage.getItem('role') || localStorage.getItem('role');
        if (sessionRole) {
            return String(sessionRole).toLowerCase();
        }

        var authData = sessionStorage.getItem('admin_data');
        if (authData) {
            try {
                var parsed = JSON.parse(authData);
                if (parsed && parsed.role) {
                    return String(parsed.role).toLowerCase();
                }
            } catch (err) {
                // Ignore parse errors and fall back to the page role.
            }
        }

        return getPageRole();
    }

    function getLoginUrl(role) {
        return ROLE_LOGIN_MAP[role] || ROLE_LOGIN_MAP[getPageRole()] || 'index.html';
    }

    function clearStudentSession() {
        var keysToRemove = [
            'student_id',
            'student_name',
            'student_email',
            'student_branch',
            'student_year',
            'student_college',
            'role',
            'authToken',
            'logout_back_guard_entry',
            BACK_PROMPT_SEEN_KEY
        ];

        for (var i = 0; i < keysToRemove.length; i++) {
            localStorage.removeItem(keysToRemove[i]);
        }

        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('current_session_id');
        document.cookie = 'auth_token=; path=/; max-age=0; samesite=lax';
    }

    function clearFacultySession() {
        var authSession = getCurrentAuthSession();
        var sessions = getAuthSessions();
        if (authSession.sessionId && sessions[authSession.sessionId]) {
            delete sessions[authSession.sessionId];
            saveAuthSessions(sessions);
        }

        sessionStorage.removeItem('current_session_id');
        removeCookie('auth_token');
        sessionStorage.removeItem('logout_back_guard_entry');
        sessionStorage.removeItem(BACK_PROMPT_SEEN_KEY);

        var keysToRemove = [];
        for (var i = 0; i < sessionStorage.length; i++) {
            var key = sessionStorage.key(i);
            if (key && (key.indexOf('faculty_') === 0 || key === 'pending_faculty_login' || key === 'authToken')) {
                keysToRemove.push(key);
            }
        }
        for (var j = 0; j < keysToRemove.length; j++) {
            sessionStorage.removeItem(keysToRemove[j]);
        }
    }

    function clearAdminSession() {
        var authSession = getCurrentAuthSession();
        var sessions = getAuthSessions();
        if (authSession.sessionId && sessions[authSession.sessionId]) {
            delete sessions[authSession.sessionId];
            saveAuthSessions(sessions);
        }

        var adminUserId = null;
        if (authSession.session && authSession.session.user && authSession.session.user.id != null) {
            adminUserId = String(authSession.session.user.id);
        } else {
            var adminData = sessionStorage.getItem('admin_data');
            if (adminData) {
                try {
                    var parsedAdmin = JSON.parse(adminData);
                    if (parsedAdmin && parsedAdmin.id != null) {
                        adminUserId = String(parsedAdmin.id);
                    }
                } catch (err) {
                    // Ignore parse errors and fall back to generic cleanup.
                }
            }
        }

        if (adminUserId) {
            try {
                var adminSessions = JSON.parse(localStorage.getItem('admin_sessions') || '{}');
                if (adminSessions[adminUserId]) {
                    delete adminSessions[adminUserId];
                    localStorage.setItem('admin_sessions', JSON.stringify(adminSessions));
                }
            } catch (err) {
                // Ignore malformed legacy admin session data.
            }
        }

        sessionStorage.removeItem('current_session_id');
        sessionStorage.removeItem('current_admin_id');
        sessionStorage.removeItem('admin_data');
        sessionStorage.removeItem('admin_role');
        sessionStorage.removeItem('admin_privileges');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('logout_back_guard_entry');
        sessionStorage.removeItem(BACK_PROMPT_SEEN_KEY);
        localStorage.removeItem('current_admin_id');
        removeCookie('auth_token');
    }

    function clearSessionForRole(role) {
        if (role === 'student') {
            clearStudentSession();
            return;
        }

        if (role === 'faculty') {
            clearFacultySession();
            return;
        }

        if (role === 'admin' || role === 'super' || role === 'superadmin') {
            clearAdminSession();
            return;
        }

        clearFacultySession();
        clearAdminSession();
        clearStudentSession();
    }

    function clearLandingMarkerIfLeaving(event) {
        var target = event.target;
        if (!target) {
            return;
        }

        var link = target.closest ? target.closest('a[href]') : null;
        if (!link) {
            return;
        }

        var href = link.getAttribute('href') || '';
        var trimmedHref = href.trim().toLowerCase();
        if (!trimmedHref || trimmedHref === '#' || trimmedHref.indexOf('javascript:') === 0) {
            return;
        }

        if (trimmedHref.indexOf('logout') !== -1) {
            return;
        }

        sessionStorage.removeItem('logout_back_guard_entry');
    }

    function buildModal() {
        if (document.getElementById('logoutBackGuardModal')) {
            return;
        }

        var overlay = document.createElement('div');
        overlay.id = 'logoutBackGuardModal';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.className = 'logout-back-guard-overlay';
        overlay.innerHTML = '' +
            '<div class="logout-back-guard-card" role="dialog" aria-modal="true" aria-labelledby="logoutBackGuardTitle" aria-describedby="logoutBackGuardMessage">' +
                '<div class="logout-back-guard-icon">' +
                    '<i class="ri-logout-box-line" aria-hidden="true"></i>' +
                '</div>' +
                '<h3 id="logoutBackGuardTitle">Do you want to log out?</h3>' +
                
                '<div class="logout-back-guard-actions">' +
                    '<button type="button" class="logout-back-guard-btn cancel" id="logoutBackGuardCancel">Cancel</button>' +
                    '<button type="button" class="logout-back-guard-btn confirm" id="logoutBackGuardConfirm">Yes</button>' +
                '</div>' +
            '</div>';

        var style = document.createElement('style');
        style.textContent = '' +
            '.logout-back-guard-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(4,12,28,.62);backdrop-filter:blur(10px);z-index:99999}' +
            '.logout-back-guard-overlay.is-visible{display:flex}' +
            '.logout-back-guard-card{width:min(92vw,440px);border-radius:24px;background:linear-gradient(180deg,#ffffff 0%,#f6f9ff 100%);box-shadow:0 30px 70px rgba(0,0,0,.28);padding:28px 28px 24px;text-align:center;color:#10213a;border:1px solid rgba(0,30,67,.08)}' +
            '.logout-back-guard-icon{width:68px;height:68px;border-radius:22px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#ffe7e7,#ffd4d4);color:#c92a2a;font-size:32px}' +
            '.logout-back-guard-card h3{margin:0 0 10px;font-size:1.4rem;font-weight:800;letter-spacing:-0.02em}' +
            '.logout-back-guard-card p{margin:0 0 22px;color:#52627a;line-height:1.55;font-size:.98rem}' +
            '.logout-back-guard-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}' +
            '.logout-back-guard-btn{min-width:124px;border:none;border-radius:14px;padding:12px 20px;font-weight:700;font-size:.98rem;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,background .18s ease}' +
            '.logout-back-guard-btn:hover{transform:translateY(-1px)}' +
            '.logout-back-guard-btn.cancel{background:#e9eef7;color:#10213a}' +
            '.logout-back-guard-btn.confirm{background:linear-gradient(135deg,#dc3545,#b02a37);color:#fff;box-shadow:0 12px 28px rgba(220,53,69,.28)}' +
            '@media (max-width: 480px){.logout-back-guard-card{padding:22px 18px 18px;border-radius:20px}.logout-back-guard-actions{flex-direction:column}.logout-back-guard-btn{width:100%}}';

        document.head.appendChild(style);
        document.body.appendChild(overlay);
    }

    function showModal() {
        buildModal();
        var overlay = document.getElementById('logoutBackGuardModal');
        if (!overlay) {
            return;
        }
        overlay.classList.add('is-visible');
        overlay.setAttribute('aria-hidden', 'false');
        var cancelBtn = document.getElementById('logoutBackGuardCancel');
        if (cancelBtn) {
            cancelBtn.focus();
        }
    }

    function hideModal() {
        var overlay = document.getElementById('logoutBackGuardModal');
        if (!overlay) {
            return;
        }
        overlay.classList.remove('is-visible');
        overlay.setAttribute('aria-hidden', 'true');
    }

    function handleConfirmLogout() {
        var role = getCurrentRole();
        clearSessionForRole(role);
        hideModal();
        window.location.replace(getLoginUrl(role));
    }

    function guardBackNavigation() {
        var currentPage = (window.location.pathname.split('/').pop() || '').toLowerCase();
        if (sessionStorage.getItem(BACK_PROMPT_SEEN_KEY) === currentPage) {
            return;
        }

        if (window.history && window.history.pushState) {
            window.history.pushState({ logoutBackGuard: true }, '', window.location.href);
        }

        window.addEventListener('popstate', function () {
            sessionStorage.setItem(BACK_PROMPT_SEEN_KEY, currentPage);
            showModal();
        });
    }

    function initLogoutTriggers() {
        var cancelBtn = document.getElementById('logoutBackGuardCancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function () {
                hideModal();
            });
        }

        var confirmBtn = document.getElementById('logoutBackGuardConfirm');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', handleConfirmLogout);
        }

        var overlay = document.getElementById('logoutBackGuardModal');
        if (overlay) {
            overlay.addEventListener('click', function (event) {
                if (event.target === overlay) {
                    hideModal();
                }
            });
        }

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                hideModal();
            }
        });
    }

    function verifySessionOrRedirect() {
        var role = getCurrentRole();
        var loginUrl = getLoginUrl(role);

        if (role === 'student') {
            var studentSession = getCurrentAuthSession();
            if (!studentSession.session && !(sessionStorage.getItem('student_id') || localStorage.getItem('student_id'))) {
                window.location.replace(loginUrl);
                return false;
            }
            return true;
        }

        if (role === 'faculty') {
            var facultySession = getCurrentAuthSession();
            if (!facultySession.session && !sessionStorage.getItem('faculty_id')) {
                window.location.replace(loginUrl);
                return false;
            }
            return true;
        }

        if (role === 'admin' || role === 'super' || role === 'superadmin') {
            var adminSession = getCurrentAuthSession();
            if (!adminSession.session && !sessionStorage.getItem('admin_data') && !localStorage.getItem('current_admin_id')) {
                window.location.replace(loginUrl);
                return false;
            }
            return true;
        }

        return true;
    }

    function init() {
        if (!verifySessionOrRedirect()) {
            return;
        }

        var currentPage = (window.location.pathname.split('/').pop() || '').toLowerCase();
        if (sessionStorage.getItem('logout_back_guard_entry') !== currentPage) {
            return;
        }

        buildModal();
        initLogoutTriggers();
        guardBackNavigation();
        document.addEventListener('click', clearLandingMarkerIfLeaving, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.LogoutBackGuard = {
        clearSessionForRole: clearSessionForRole,
        getCurrentRole: getCurrentRole,
        getLoginUrl: getLoginUrl,
        handleConfirmLogout: handleConfirmLogout,
        showModal: showModal,
        hideModal: hideModal
    };
})();


