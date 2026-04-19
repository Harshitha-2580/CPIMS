/**
 * AuthSessionManager
 * Stores auth sessions in localStorage keyed by a tab-specific session id.
 * Uses sessionStorage for the current session identifier so each browser tab has isolated auth state.
 */
const AuthSessionManager = {
    sessionStorageKey: 'current_session_id',
    persistentStorageKey: 'auth_sessions',

    getCookieToken() {
        const cookieParts = document.cookie ? document.cookie.split(';') : [];
        for (let i = 0; i < cookieParts.length; i++) {
            const [rawKey, ...rawValueParts] = cookieParts[i].trim().split('=');
            if (rawKey === 'auth_token') {
                const rawValue = rawValueParts.join('=');
                try {
                    return decodeURIComponent(rawValue);
                } catch {
                    return rawValue;
                }
            }
        }
        return null;
    },

    getCurrentSessionId() {
        let sessionId = sessionStorage.getItem(this.sessionStorageKey);
        if (!sessionId) {
            const sessions = this.getAllSessions();
            const cookieToken = this.getCookieToken();
            if (cookieToken) {
                const sessionKeys = Object.keys(sessions);
                for (let i = 0; i < sessionKeys.length; i++) {
                    const key = sessionKeys[i];
                    const session = sessions[key];
                    if (session && session.token === cookieToken) {
                        sessionStorage.setItem(this.sessionStorageKey, key);
                        sessionId = key;
                        break;
                    }
                }
            }
        }
        return sessionId;
    },

    setCurrentSessionId(sessionId) {
        if (sessionId) {
            sessionStorage.setItem(this.sessionStorageKey, sessionId);
        } else {
            sessionStorage.removeItem(this.sessionStorageKey);
        }
    },

    getAllSessions() {
        try {
            return JSON.parse(localStorage.getItem(this.persistentStorageKey) || '{}');
        } catch (err) {
            console.warn('Unable to parse auth sessions from localStorage:', err);
            return {};
        }
    },

    saveSession(sessionId, sessionData) {
        const sessions = this.getAllSessions();
        sessions[sessionId] = sessionData;
        localStorage.setItem(this.persistentStorageKey, JSON.stringify(sessions));
        this.setCurrentSessionId(sessionId);
        if (sessionData && sessionData.token) {
            this.setCookieToken(sessionData.token);
        }
    },

    setCookieToken(token) {
        if (!token) return;
        document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=7200; samesite=lax`;
    },

    clearCookieToken() {
        document.cookie = 'auth_token=; path=/; max-age=0; samesite=lax';
    },

    getSession(sessionId = this.getCurrentSessionId()) {
        if (!sessionId) return null;
        const sessions = this.getAllSessions();
        return sessions[sessionId] || null;
    },

    createSession({ user, token, privileges = {}, meta = {} }) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const sessionData = {
            user,
            token,
            privileges,
            role: user?.role || null,
            createdAt: new Date().toISOString(),
            meta
        };
        this.saveSession(sessionId, sessionData);
        return sessionId;
    },

    getCurrentSession() {
        return this.getSession(this.getCurrentSessionId());
    },

    getCurrentUser() {
        return this.getCurrentSession()?.user || null;
    },

    getCurrentPrivileges() {
        return this.getCurrentSession()?.privileges || {};
    },

    getCurrentRole() {
        return this.getCurrentSession()?.role || null;
    },

    getAuthToken() {
        return this.getCurrentSession()?.token || null;
    },

    buildAuthHeaders(existingHeaders) {
        const token = this.getAuthToken() || sessionStorage.getItem('authToken') || null;
        if (!token) {
            return existingHeaders;
        }

        const headers = new Headers(existingHeaders || {});
        if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    },

    installFetchInterceptor() {
        if (window.__authFetchInterceptorInstalled) {
            return;
        }

        const originalFetch = window.fetch.bind(window);
        window.fetch = (input, init = {}) => {
            try {
                const rawUrl = typeof input === 'string' ? input : (input && input.url ? input.url : '');
                const isApiRequest = rawUrl.includes('/api/');

                if (!isApiRequest) {
                    return originalFetch(input, init);
                }

                const nextInit = { ...init };
                nextInit.headers = this.buildAuthHeaders(init.headers);

                return originalFetch(input, nextInit);
            } catch (err) {
                console.warn('Auth fetch interceptor fallback:', err);
                return originalFetch(input, init);
            }
        };

        window.__authFetchInterceptorInstalled = true;
    },

    removeSession(sessionId) {
        const sessions = this.getAllSessions();
        if (!sessionId || !sessions[sessionId]) return;
        delete sessions[sessionId];
        localStorage.setItem(this.persistentStorageKey, JSON.stringify(sessions));
        if (this.getCurrentSessionId() === sessionId) {
            this.setCurrentSessionId(null);
            const remainingKeys = Object.keys(sessions);
            if (remainingKeys.length > 0) {
                this.setCurrentSessionId(remainingKeys[0]);
                const nextSession = sessions[remainingKeys[0]];
                if (nextSession && nextSession.token) {
                    this.setCookieToken(nextSession.token);
                }
            } else {
                this.clearCookieToken();
            }
        }
    },

    clearCurrentSession() {
        const sessionId = this.getCurrentSessionId();
        if (sessionId) {
            this.removeSession(sessionId);
        } else {
            this.clearCookieToken();
        }
    }
};

window.AuthSessionManager = AuthSessionManager;
window.AdminSessionManager = AuthSessionManager; // Keep backward compatibility for admin pages
AuthSessionManager.installFetchInterceptor();
