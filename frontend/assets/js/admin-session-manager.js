/**
 * Admin Session Manager
 * Handles retrieving data for the currently active admin
 * Supports multiple admins logged in from same browser
 */

const AdminSessionManager = {
    _getCookieValue(name) {
        try {
            const cookieParts = document.cookie ? document.cookie.split(';') : [];
            for (const part of cookieParts) {
                const [rawKey, ...rawValueParts] = part.trim().split('=');
                if (rawKey === name) {
                    const rawValue = rawValueParts.join('=');
                    try {
                        return decodeURIComponent(rawValue);
                    } catch {
                        return rawValue;
                    }
                }
            }
        } catch (err) {
            return null;
        }
        return null;
    },

    _getAuthSessions() {
        try {
            return JSON.parse(localStorage.getItem('auth_sessions') || '{}');
        } catch (err) {
            return {};
        }
    },

    _getCurrentAuthSession() {
        const sessions = this._getAuthSessions();
        const currentSessionId = sessionStorage.getItem('current_session_id');
        const cookieToken = this._getCookieValue('auth_token');

        if (currentSessionId && sessions[currentSessionId]) {
            return sessions[currentSessionId];
        }

        if (cookieToken) {
            const sessionKeys = Object.keys(sessions);
            for (let i = 0; i < sessionKeys.length; i++) {
                const session = sessions[sessionKeys[i]];
                if (session && session.token === cookieToken) {
                    sessionStorage.setItem('current_session_id', sessionKeys[i]);
                    return session;
                }
            }
        }

        const sessionKeys = Object.keys(sessions);
        for (let i = 0; i < sessionKeys.length; i++) {
            const session = sessions[sessionKeys[i]];
            if (session && session.user && session.token) {
                const role = session.role || session.user.role;
                if (role === 'admin' || role === 'super' || role === 'superadmin') {
                    sessionStorage.setItem('current_session_id', sessionKeys[i]);
                    return session;
                }
            }
        }

        return null;
    },

    /**
     * Get current active admin ID (per-tab via sessionStorage, fallback localStorage)
     */
    getCurrentAdminId: function() {
        const currentId = sessionStorage.getItem('current_admin_id') || localStorage.getItem('current_admin_id');
        if (currentId) return currentId;

        const currentAuthSession = this._getCurrentAuthSession();
        if (currentAuthSession && currentAuthSession.user && currentAuthSession.user.id) {
            const adminId = currentAuthSession.user.id;
            sessionStorage.setItem('current_admin_id', adminId);
            localStorage.setItem('current_admin_id', adminId);
            return adminId;
        }

        const cookieToken = this._getCookieValue('auth_token');
        if (cookieToken) {
            const authSessions = this._getAuthSessions();
            const sessionKeys = Object.keys(authSessions);
            for (let i = 0; i < sessionKeys.length; i++) {
                const session = authSessions[sessionKeys[i]];
                if (session && session.token === cookieToken && session.user && session.user.id) {
                    const adminId = session.user.id;
                    sessionStorage.setItem('current_admin_id', adminId);
                    localStorage.setItem('current_admin_id', adminId);
                    return adminId;
                }
            }
        }

        const adminSessions = JSON.parse(localStorage.getItem('admin_sessions') || '{}');
        const adminSessionKeys = Object.keys(adminSessions);
        for (let i = 0; i < adminSessionKeys.length; i++) {
            const adminSession = adminSessions[adminSessionKeys[i]];
            if (adminSession && adminSession.user && adminSession.user.id) {
                const role = adminSession.user.role;
                if (role === 'admin' || role === 'super' || role === 'superadmin') {
                    sessionStorage.setItem('current_admin_id', adminSession.user.id);
                    localStorage.setItem('current_admin_id', adminSession.user.id);
                    return adminSession.user.id;
                }
            }
        }

        return null;
    },

    /**
     * Set current active admin ID in this tab
     */
    setCurrentAdminId: function(adminId) {
        if (adminId) {
            sessionStorage.setItem('current_admin_id', adminId);
            localStorage.setItem('current_admin_id', adminId); // for compatibility
        } else {
            sessionStorage.removeItem('current_admin_id');
            localStorage.removeItem('current_admin_id');
        }
    },

    /**
     * Get data for current active admin
     */
    getCurrentAdminData: function() {
        const currentAuthSession = this._getCurrentAuthSession();
        if (currentAuthSession && currentAuthSession.user) {
            return currentAuthSession.user;
        }

        const adminId = this.getCurrentAdminId();
        if (!adminId) return null;

        const adminSessions = JSON.parse(localStorage.getItem('admin_sessions') || '{}');
        return adminSessions[adminId]?.user || null;
    },

    /**
     * Get privileges for current active admin
     */
    getCurrentAdminPrivileges: function() {
        const currentAuthSession = this._getCurrentAuthSession();
        if (currentAuthSession && currentAuthSession.privileges) {
            return currentAuthSession.privileges;
        }

        const adminId = this.getCurrentAdminId();
        if (!adminId) return null;

        const adminSessions = JSON.parse(localStorage.getItem('admin_sessions') || '{}');
        return adminSessions[adminId]?.privileges || null;
    },

    /**
     * Get all logged-in admins
     */
    getAllAdminSessions: function() {
        return JSON.parse(localStorage.getItem('admin_sessions') || '{}');
    },

    /**
     * Switch to a different admin (if multiple are logged in)
     */
    switchToAdmin: function(adminId) {
        const adminSessions = JSON.parse(localStorage.getItem('admin_sessions') || '{}');
        if (adminSessions[adminId]) {
            this.setCurrentAdminId(adminId);
            // Update the individual keys for backward compatibility
            localStorage.setItem('admin_data', JSON.stringify(adminSessions[adminId].user));
            localStorage.setItem('admin_role', adminSessions[adminId].user.role);
            localStorage.setItem('admin_privileges', JSON.stringify(adminSessions[adminId].privileges));
            console.log('Switched to admin:', adminId);
            return true;
        }
        return false;
    },

    /**
     * Get number of logged-in admins
     */
    getLoggedInAdminCount: function() {
        const adminSessions = JSON.parse(localStorage.getItem('admin_sessions') || '{}');
        return Object.keys(adminSessions).length;
    },

    /**
     * Get admin data by specific admin ID
     */
    getAdminDataById: function(adminId) {
        const adminSessions = JSON.parse(localStorage.getItem('admin_sessions') || '{}');
        return adminSessions[adminId] || null;
    },

    /**
     * Remove an admin session (logout)
     */
    removeAdminSession: function(adminId) {
        let adminSessions = JSON.parse(localStorage.getItem('admin_sessions') || '{}');
        delete adminSessions[adminId];
        localStorage.setItem('admin_sessions', JSON.stringify(adminSessions));
        
        // If this was the current admin, switch to another or clear
        if (this.getCurrentAdminId() === adminId) {
            const remainingAdmins = Object.keys(adminSessions);
            if (remainingAdmins.length > 0) {
                this.switchToAdmin(remainingAdmins[0]);
            } else {
                this.setCurrentAdminId(null);
                localStorage.removeItem('admin_data');
                localStorage.removeItem('admin_role');
                localStorage.removeItem('admin_privileges');
            }
        }
        console.log('Removed admin session:', adminId);
    },

    /**
     * Clear all admin sessions (logout all)
     */
    clearAllSessions: function() {
        localStorage.removeItem('admin_sessions');
        this.setCurrentAdminId(null);
        localStorage.removeItem('admin_data');
        localStorage.removeItem('user');
        localStorage.removeItem('admin_role');
        localStorage.removeItem('admin_privileges');
        console.log('All admin sessions cleared');
    }
};
