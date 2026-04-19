/**
 * Admin Access Control Module
 * Handles privilege-based access to admin pages
 * Verifies privileges against the database for security
 */

class AdminAccessControl {
    constructor() {
        this.adminPrivileges = this.loadPrivileges();
        this.isAccessDeniedShown = false;
        this.privilegesVerified = false;
    }

    getCurrentAdminUser() {
        if (window.AuthSessionManager && AuthSessionManager.getCurrentUser) {
            const user = AuthSessionManager.getCurrentUser();
            if (user && user.id) return user;
        }

        try {
            const currentAdminId = sessionStorage.getItem('current_admin_id') || localStorage.getItem('current_admin_id');
            const adminSessions = JSON.parse(localStorage.getItem('admin_sessions') || '{}');
            if (currentAdminId && adminSessions[currentAdminId] && adminSessions[currentAdminId].user) {
                return adminSessions[currentAdminId].user;
            }
        } catch (e) {
            console.warn('Could not resolve current admin from admin_sessions:', e);
        }

        try {
            return JSON.parse(localStorage.getItem('admin_data') || '{}');
        } catch (e) {
            return {};
        }
    }

    getCurrentAuthToken() {
        if (window.AuthSessionManager && AuthSessionManager.getAuthToken) {
            const token = AuthSessionManager.getAuthToken();
            if (token) return token;
        }

        const directToken = sessionStorage.getItem('authToken');
        if (directToken) return directToken;

        try {
            const currentSessionId = sessionStorage.getItem('current_session_id');
            const authSessions = JSON.parse(localStorage.getItem('auth_sessions') || '{}');
            if (currentSessionId && authSessions[currentSessionId] && authSessions[currentSessionId].token) {
                return authSessions[currentSessionId].token;
            }
        } catch (e) {
            console.warn('Could not resolve auth token from auth_sessions:', e);
        }

        try {
            const currentAdminId = sessionStorage.getItem('current_admin_id') || localStorage.getItem('current_admin_id');
            const adminSessions = JSON.parse(localStorage.getItem('admin_sessions') || '{}');
            if (currentAdminId && adminSessions[currentAdminId] && adminSessions[currentAdminId].token) {
                return adminSessions[currentAdminId].token;
            }
        } catch (e) {
            console.warn('Could not resolve auth token from admin_sessions:', e);
        }

        return null;
    }

    /**
     * Load admin privileges from localStorage (as fallback)
     */
    loadPrivileges() {
        try {
            if (window.AuthSessionManager && AuthSessionManager.getCurrentPrivileges) {
                return AuthSessionManager.getCurrentPrivileges();
            }
            const stored = localStorage.getItem('admin_privileges');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.warn('Could not parse admin privileges:', e);
            return {};
        }
    }

    /**
     * Fetch and verify admin privileges from database
     */
    async verifyPrivilegesFromDatabase() {
        try {
            const currentAdmin = this.getCurrentAdminUser();
            const adminId = currentAdmin && currentAdmin.id ? currentAdmin.id : null;
            const authToken = this.getCurrentAuthToken();

            if (!adminId || !authToken) {
                console.warn('No valid admin session token found for privilege verification.');
                return false;
            }

            // Fetch privileges from backend
            const response = await fetch(`http://localhost:3000/api/admin/privileges/${adminId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('Session appears expired or invalid during privilege verification.');
                    return false;
                }
                throw new Error(`Failed to verify privileges: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.privileges) {
                // Update localStorage with verified privileges from database
                this.adminPrivileges = {
                    can_add_faculty: data.privileges.can_add_faculty || 0,
                    can_generate_reports: data.privileges.can_generate_reports || 0,
                    can_post_opportunities: data.privileges.can_post_opportunities || 0,
                    can_assign_students_opportunities: data.privileges.can_assign_students_opportunities || 0,
                    can_approve_students: data.privileges.can_approve_students || 0,
                    can_manage_admins: data.privileges.can_manage_admins || 0
                };
                
                // Update localStorage with database-verified privileges
                localStorage.setItem('admin_privileges', JSON.stringify(this.adminPrivileges));
                sessionStorage.setItem('admin_privileges', JSON.stringify(this.adminPrivileges));
                this.privilegesVerified = true;
                console.log('✓ Privileges verified from database:', this.adminPrivileges);
                return true;
            } else {
                console.warn('No privileges found in response');
                return false;
            }
        } catch (error) {
            console.error('Error verifying privileges from database:', error);
            // Keep using localStorage as fallback, but this is less secure
            return false;
        }
    }

    /**
     * Check if a privilege is granted
     */
    hasPrivilege(privilegeKey) {
        const value = this.adminPrivileges[privilegeKey];
        return value === true || value === 1 || value === '1' || value === 'true';
    }

    /**
     * Check if admin has any of the required privileges
     */
    hasAnyPrivilege(requiredPrivileges) {
        if (!Array.isArray(requiredPrivileges)) {
            requiredPrivileges = [requiredPrivileges];
        }
        return requiredPrivileges.some(priv => this.hasPrivilege(priv));
    }

    /**
     * Inject nice popup styles if not already present
     */
    injectPopupStyles() {
        if (document.getElementById('adminAccessControlStyles')) {
            return;
        }

        const styles = document.createElement('style');
        styles.id = 'adminAccessControlStyles';
        styles.innerHTML = `
            .access-denied-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.45);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                padding: 20px;
            }

            .access-denied-overlay.show {
                display: flex;
            }

            .access-denied-card {
                width: min(460px, 100%);
                background: #fff;
                border-radius: 16px;
                border: 1px solid #dbe5f1;
                box-shadow: 0 22px 52px rgba(0, 30, 67, 0.24);
                overflow: hidden;
                animation: accessDeniedPopupIn 0.22s ease-out;
            }

            .access-denied-head {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px 18px;
                border-bottom: 1px solid #e9eef5;
            }

            .access-denied-icon {
                width: 38px;
                height: 38px;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                color: #fff;
                flex-shrink: 0;
                background: linear-gradient(135deg, #dc3545, #b02a37);
            }

            .access-denied-title {
                margin: 0;
                color: #001e43;
                font-size: 20px;
                font-weight: 800;
            }

            .access-denied-body {
                padding: 16px 18px 12px;
                color: #2f4460;
                font-size: 15px;
                line-height: 1.55;
            }

            .access-denied-actions {
                padding: 0 18px 18px;
                display: flex;
                justify-content: flex-end;
            }

            .access-denied-btn {
                border: none;
                border-radius: 10px;
                background: linear-gradient(135deg, #001e43, #0b4b98);
                color: #fff;
                padding: 10px 22px;
                font-weight: 700;
                min-width: 96px;
                cursor: pointer;
                transition: filter 0.3s ease;
            }

            .access-denied-btn:hover {
                filter: brightness(1.05);
            }

            @keyframes accessDeniedPopupIn {
                from {
                    transform: translateY(8px) scale(0.98);
                    opacity: 0;
                }
                to {
                    transform: translateY(0) scale(1);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Create and show the access denied popup
     */
    showAccessDenied(pageTitle = 'this page') {
        if (this.isAccessDeniedShown) return;
        
        this.injectPopupStyles();

        // Hide all main page content
        const mainContent = document.querySelector('main') || 
                           document.querySelector('.admin-wrapper') || 
                           document.querySelector('.container-fluid') ||
                           document.body.querySelector('[class*="content"]');
        
        if (mainContent) {
            mainContent.style.display = 'none';
        }

        // Disable all interactive elements
        document.querySelectorAll('a, button, input, select, textarea, [onclick]').forEach(el => {
            el.style.pointerEvents = 'none';
            el.style.opacity = '0.5';
        });

        // Hide page-level modals/overlays that may still be visible
        const pageModal = document.getElementById('modalOverlay');
        if (pageModal) {
            pageModal.classList.remove('show');
            pageModal.style.display = 'none';
        }
        const successModal = document.getElementById('successOverlay');
        if (successModal) {
            successModal.classList.remove('show');
            successModal.style.display = 'none';
        }

        // Create popup overlay
        let overlay = document.getElementById('accessDeniedOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'accessDeniedOverlay';
            overlay.className = 'access-denied-overlay show';
            overlay.innerHTML = `
                <div class="access-denied-card">
                    <div class="access-denied-head">
                        <span class="access-denied-icon">
                            <i class="ri-close-line"></i>
                        </span>
                        <h3 class="access-denied-title">Access Denied</h3>
                    </div>
                    <div class="access-denied-body">
                        You do not have permission to access ${pageTitle}. Please contact your superadmin to grant access.
                    </div>
                    <div class="access-denied-actions">
                        <button type="button" class="access-denied-btn" onclick="window.location.href='admin-dashboard.html';">Go Back</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            overlay.classList.add('show');
        }

        this.isAccessDeniedShown = true;
    }

    /**
     * Guard a page - check if admin has access, otherwise show popup
     * Now verifies privileges against database first
     */
    async guardPage(requiredPrivileges, pageTitle = 'this page') {
        console.log('🔒 Guarding page:', pageTitle, 'Required privileges:', requiredPrivileges);
        
        // First verify privileges from database
        const isVerified = await this.verifyPrivilegesFromDatabase();
        
        if (!isVerified) {
            console.warn('⚠️ Could not verify privileges from database, using localStorage fallback');
        }

        console.log('✓ Current privileges:', this.adminPrivileges);
        console.log('✓ Has required privilege:', this.hasAnyPrivilege(requiredPrivileges));

        if (!this.hasAnyPrivilege(requiredPrivileges)) {
            console.error('❌ ACCESS DENIED for page:', pageTitle);
            this.showAccessDenied(pageTitle);
            return false;
        }
        
        console.log('✅ ACCESS GRANTED for page:', pageTitle);
        return true;
    }

    /**
     * Reset the access denied flag (useful after showing popup)
     */
    resetAccessDeniedFlag() {
        this.isAccessDeniedShown = false;
    }
}

// Create global instance
const adminAccessControl = new AdminAccessControl();
