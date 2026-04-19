function getTokenFromLegacyAdminSession() {
    try {
        var currentAdminId = sessionStorage.getItem('current_admin_id') || localStorage.getItem('current_admin_id');
        var adminSessions = JSON.parse(localStorage.getItem('admin_sessions') || '{}');
        if (currentAdminId && adminSessions[currentAdminId] && adminSessions[currentAdminId].token) {
            return adminSessions[currentAdminId].token;
        }
    } catch (e) {
        console.warn('[AdminSidebar] Could not read legacy admin token:', e);
    }
    return null;
}

function isPrivilegeGranted(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
}

function canAccessPrivilege(requiredPrivilege, privileges, isSuper) {
    if (!requiredPrivilege) return true;
    if (isSuper) return true;
    return isPrivilegeGranted(privileges[requiredPrivilege]);
}

function ensureSidebarAccessDeniedStyles() {
    if (document.getElementById('sidebarAccessDeniedStyles')) {
        return;
    }

    var style = document.createElement('style');
    style.id = 'sidebarAccessDeniedStyles';
    style.textContent = '' +
        '.sidebar-access-denied-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:2500;padding:20px;}' +
        '.sidebar-access-denied-overlay.show{display:flex;}' +
        '.sidebar-access-denied-card{width:min(460px,100%);background:#fff;border-radius:14px;border:1px solid #dbe5f1;box-shadow:0 18px 42px rgba(0,30,67,.24);overflow:hidden;}' +
        '.sidebar-access-denied-head{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid #e9eef5;}' +
        '.sidebar-access-denied-icon{width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:20px;color:#fff;background:linear-gradient(135deg,#dc3545,#b02a37);}' +
        '.sidebar-access-denied-title{margin:0;color:#001e43;font-size:20px;font-weight:800;}' +
        '.sidebar-access-denied-body{padding:16px 18px 14px;color:#2f4460;font-size:15px;line-height:1.55;}' +
        '.sidebar-access-denied-actions{padding:0 18px 18px;display:flex;justify-content:flex-end;}' +
        '.sidebar-access-denied-btn{border:none;border-radius:10px;background:linear-gradient(135deg,#001e43,#0b4b98);color:#fff;padding:10px 22px;font-weight:700;min-width:96px;cursor:pointer;}' +
        '.sidebar-access-denied-btn:hover{filter:brightness(1.05);}';
    document.head.appendChild(style);
}

function showSidebarAccessDeniedModal(pageTitle) {
    ensureSidebarAccessDeniedStyles();

    var overlay = document.getElementById('sidebarAccessDeniedOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarAccessDeniedOverlay';
        overlay.className = 'sidebar-access-denied-overlay';
        overlay.innerHTML = '' +
            '<div class="sidebar-access-denied-card" role="dialog" aria-modal="true" aria-labelledby="sidebarAccessDeniedTitle">' +
                '<div class="sidebar-access-denied-head">' +
                    '<span class="sidebar-access-denied-icon"><i class="ri-close-line"></i></span>' +
                    '<h3 id="sidebarAccessDeniedTitle" class="sidebar-access-denied-title">Access Denied</h3>' +
                '</div>' +
                '<div class="sidebar-access-denied-body" id="sidebarAccessDeniedMessage"></div>' +
                '<div class="sidebar-access-denied-actions">' +
                    '<button type="button" class="sidebar-access-denied-btn" id="sidebarAccessDeniedOk">OK</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.classList.remove('show');
            }
        });

        var okBtn = document.getElementById('sidebarAccessDeniedOk');
        if (okBtn) {
            okBtn.addEventListener('click', function() {
                overlay.classList.remove('show');
            });
        }
    }

    var message = document.getElementById('sidebarAccessDeniedMessage');
    if (message) {
        message.textContent = 'You do not have permission to access ' + pageTitle + '. Please contact your superadmin to grant access.';
    }
    overlay.classList.add('show');
}

function showSidebarPrivilegeCheckErrorModal(pageTitle) {
    ensureSidebarAccessDeniedStyles();

    var overlay = document.getElementById('sidebarAccessDeniedOverlay');
    if (!overlay) {
        showSidebarAccessDeniedModal(pageTitle);
        return;
    }

    var message = document.getElementById('sidebarAccessDeniedMessage');
    if (message) {
        message.textContent = 'We could not verify your permission for ' + pageTitle + ' right now. Please try again, or contact your superadmin.';
    }
    overlay.classList.add('show');
}

function parseStoredJson(storage, key) {
    try {
        return JSON.parse(storage.getItem(key) || '{}');
    } catch (e) {
        return {};
    }
}

function getAdminDataFromSessionStorage() {
    try {
        var adminData = JSON.parse(sessionStorage.getItem('admin_data') || '{}');
        if (adminData && typeof adminData === 'object' && adminData.role) {
            return adminData;
        }
    } catch (e) {
        // Ignore parse errors and try other sources.
    }
    return null;
}

function getAdminDataFromAuthSessions() {
    try {
        var currentSessionId = sessionStorage.getItem('current_session_id');
        var sessions = parseStoredJson(localStorage, 'auth_sessions');

        if (currentSessionId && sessions[currentSessionId] && sessions[currentSessionId].user) {
            return sessions[currentSessionId].user;
        }

        var currentAdminData = getAdminDataFromSessionStorage();
        if (currentAdminData && currentAdminData.id) {
            var sessionKeys = Object.keys(sessions);
            for (var i = 0; i < sessionKeys.length; i++) {
                var session = sessions[sessionKeys[i]];
                if (session && session.user && String(session.user.id) === String(currentAdminData.id)) {
                    sessionStorage.setItem('current_session_id', sessionKeys[i]);
                    return session.user;
                }
            }
        }
    } catch (e) {
        console.warn('[AdminSidebar] Could not read auth session user:', e);
    }
    return null;
}

function resolveCurrentAdminData() {
    if (window.AuthSessionManager && AuthSessionManager.getCurrentUser) {
        var authUser = AuthSessionManager.getCurrentUser();
        if (authUser && authUser.role) return authUser;
    }

    if (window.AdminSessionManager && AdminSessionManager.getCurrentAdminData) {
        var managerUser = AdminSessionManager.getCurrentAdminData();
        if (managerUser && managerUser.role) return managerUser;
    }

    var tabAdminData = getAdminDataFromSessionStorage();
    if (tabAdminData) return tabAdminData;

    var authSessionUser = getAdminDataFromAuthSessions();
    if (authSessionUser && authSessionUser.role) return authSessionUser;

    var currentAdminId = sessionStorage.getItem('current_admin_id') || localStorage.getItem('current_admin_id');
    var adminSessions = parseStoredJson(localStorage, 'admin_sessions');
    if (currentAdminId && adminSessions[currentAdminId] && adminSessions[currentAdminId].user) {
        return adminSessions[currentAdminId].user;
    }

    try {
        return JSON.parse(localStorage.getItem('admin_data') || '{}');
    } catch (e) {
        return {};
    }
}

function getStoredAdminPrivileges() {
    try {
        if (window.AuthSessionManager && AuthSessionManager.getCurrentPrivileges) {
            var sessionPrivileges = AuthSessionManager.getCurrentPrivileges();
            if (sessionPrivileges && Object.keys(sessionPrivileges).length > 0) {
                return sessionPrivileges;
            }
        }

        var sessionStored = JSON.parse(sessionStorage.getItem('admin_privileges') || '{}');
        if (sessionStored && Object.keys(sessionStored).length > 0) {
            return sessionStored;
        }

        return JSON.parse(localStorage.getItem('admin_privileges') || '{}');
    } catch (e) {
        return {};
    }
}

function getCurrentAdminPrivilegesFromDatabase(adminData) {
    return new Promise(function(resolve) {
        try {
            if (!adminData || !adminData.id) {
                resolve(null);
                return;
            }

            var token = getAdminAuthToken();
            if (!token) {
                resolve(null);
                return;
            }

            fetch('http://localhost:3000/api/admin/privileges/' + encodeURIComponent(adminData.id), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            })
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('Failed to fetch admin privileges: ' + response.status);
                    }
                    return response.json();
                })
                .then(function(data) {
                    if (data && data.success && data.privileges) {
                        sessionStorage.setItem('admin_privileges', JSON.stringify(data.privileges));
                        localStorage.setItem('admin_privileges', JSON.stringify(data.privileges));
                        resolve(data.privileges);
                        return;
                    }
                    resolve(null);
                })
                .catch(function(err) {
                    console.warn('[AdminSidebar] Could not fetch admin privileges from DB:', err);
                    resolve(null);
                });
        } catch (err) {
            console.warn('[AdminSidebar] Privilege fetch failed:', err);
            resolve(null);
        }
    });
}

function getTokenFromAuthSessions() {
    try {
        var currentSessionId = sessionStorage.getItem('current_session_id');
        var sessions = parseStoredJson(localStorage, 'auth_sessions');

        if (currentSessionId && sessions[currentSessionId] && sessions[currentSessionId].token) {
            return sessions[currentSessionId].token;
        }

        var currentAdminData = getAdminDataFromSessionStorage();
        if (currentAdminData && currentAdminData.id) {
            var keyedSessionIds = Object.keys(sessions);
            for (var j = 0; j < keyedSessionIds.length; j++) {
                var keyedSession = sessions[keyedSessionIds[j]];
                if (keyedSession && keyedSession.user && String(keyedSession.user.id) === String(currentAdminData.id) && keyedSession.token) {
                    sessionStorage.setItem('current_session_id', keyedSessionIds[j]);
                    return keyedSession.token;
                }
            }
        }

        var sessionKeys = Object.keys(sessions);
        for (var i = 0; i < sessionKeys.length; i++) {
            var session = sessions[sessionKeys[i]];
            var role = session && session.role;
            if ((role === 'super' || role === 'superadmin' || role === 'admin') && session.token) {
                sessionStorage.setItem('current_session_id', sessionKeys[i]);
                return session.token;
            }
        }
    } catch (e) {
        console.warn('[AdminSidebar] Could not read auth sessions token:', e);
    }
    return null;
}

function getAdminAuthToken() {
    if (window.AuthSessionManager && AuthSessionManager.getAuthToken) {
        var managerToken = AuthSessionManager.getAuthToken();
        if (managerToken) return managerToken;
    }

    return (
        sessionStorage.getItem('authToken') ||
        getTokenFromAuthSessions() ||
        getTokenFromLegacyAdminSession() ||
        null
    );
}

function installAdminFetchInterceptor() {
    if (window.__adminAuthFetchInterceptorInstalled) {
        return;
    }

    var originalFetch = window.fetch.bind(window);
    window.fetch = function(input, init) {
        var nextInit = init || {};
        try {
            var rawUrl = typeof input === 'string' ? input : (input && input.url ? input.url : '');
            var isApiRequest = rawUrl.indexOf('/api/') !== -1;

            if (!isApiRequest) {
                return originalFetch(input, nextInit);
            }

            var token = getAdminAuthToken();
            if (!token) {
                return originalFetch(input, nextInit);
            }

            var headers = new Headers(nextInit.headers || {});
            if (!headers.has('Authorization')) {
                headers.set('Authorization', 'Bearer ' + token);
            }

            nextInit = Object.assign({}, nextInit, { headers: headers });
            return originalFetch(input, nextInit);
        } catch (e) {
            console.warn('[AdminSidebar] Auth fetch interceptor fallback:', e);
            return originalFetch(input, nextInit);
        }
    };

    window.__adminAuthFetchInterceptorInstalled = true;
}

installAdminFetchInterceptor();

function buildAndInsertSidebar(adminData, adminPrivileges) {
    // Remove existing sidebar if present
    var oldSidebar = document.getElementById('adminSidebar');
    if (oldSidebar) oldSidebar.remove();

    var currentPage = (window.location.pathname.split('/').pop() || '').toLowerCase();

    var resolvedAdminData = adminData || resolveCurrentAdminData() || {};
    var resolvedPrivileges = adminPrivileges || getStoredAdminPrivileges() || {};

    var isSuper = resolvedAdminData.role === 'super' || resolvedAdminData.role === 'superadmin';
    var roleDisplay = resolvedAdminData.role ? (isSuper ? 'Superadmin' : 'Admin') : 'Admin';
    var navItems = [
        {
            href: 'admin-dashboard.html',
            icon: 'ri-dashboard-line',
            label: 'Dashboard',
            activeOn: ['admin-dashboard.html', 'admin-assign-students.html', 'admin-recent-activity.html']
        },
        {
            href: 'admin-students.html',
            icon: 'ri-user-line',
            label: 'Students',
            activeOn: ['admin-students.html'],
            requiredPrivilege: 'can_approve_students',
            pageTitle: 'Students'
        },
        {
            href: 'admin-opportunities.html',
            icon: 'ri-briefcase-line',
            label: 'Opportunities',
            activeOn: ['admin-opportunities.html', 'admin-add-placement.html'],
            requiredPrivilege: 'can_post_opportunities',
            pageTitle: 'Opportunities'
        },
        {
            href: 'admin-placement-drives.html',
            icon: 'ri-calendar-event-line',
            label: 'Placement Drives',
            activeOn: ['admin-placement-drives.html', 'admin-drive-timeline.html']
        },
        {
            href: 'admin-attendance-scanner.html',
            icon: 'ri-qr-scan-line',
            label: 'QR Attendance',
            activeOn: ['admin-attendance-scanner.html']
        },
        {
            href: 'admin-faculty.html',
            icon: 'ri-team-line',
            label: 'Faculty',
            activeOn: ['admin-faculty.html', 'admin-faculty-detail.html'],
            requiredPrivilege: 'can_add_faculty',
            pageTitle: 'Faculty'
        },
        {
            href: 'admin-reports.html',
            icon: 'ri-bar-chart-line',
            label: 'Reports',
            activeOn: ['admin-reports.html'],
            requiredPrivilege: 'can_generate_reports',
            pageTitle: 'Generate Reports'
        }
    ];

    // Only add Manage option for superadmin
    if (isSuper) {
        navItems.push({
            icon: 'ri-settings-line',
            label: 'Manage',
            submenu: true,
            submenuItems: [
                {
                    href: 'admin-add-admin.html',
                    icon: 'ri-user-add-line',
                    label: 'Add Admin',
                    activeOn: ['admin-add-admin.html']
                },
                {
                    href: 'admin-users.html',
                    icon: 'ri-team-line',
                    label: 'Users',
                    activeOn: ['admin-users.html']
                }
            ],
            activeOn: ['admin-add-admin.html', 'admin-users.html']
        });
    }


    var aside = document.createElement('aside');
    aside.className = 'admin-sidebar';
    aside.id = 'adminSidebar';

    var navLinks = navItems.map(function (item, index) {
        if (item.submenu) {
            var activeClass = item.activeOn && item.activeOn.indexOf(currentPage) >= 0 ? ' active' : '';
            var submenuContent = item.submenuItems.map(function (submenuItem) {
                var submenuActiveClass = submenuItem.activeOn.indexOf(currentPage) >= 0 ? ' active' : '';
                return (
                    '<a href="' + submenuItem.href + '" class="sidebar-submenu-item' + submenuActiveClass + '">' +
                        '<i class="' + submenuItem.icon + '"></i>' +
                        '<span class="nav-label">' + submenuItem.label + '</span>' +
                    '</a>'
                );
            }).join('');

            return (
                '<div class="sidebar-nav-group' + activeClass + '">' +
                    '<button class="sidebar-nav-item submenu-toggle" data-submenu="submenu-' + index + '">' +
                        '<i class="' + item.icon + '"></i>' +
                        '<span class="nav-label">' + item.label + '</span>' +
                        '<i class="ri-arrow-down-s-line submenu-icon"></i>' +
                    '</button>' +
                    '<div class="sidebar-submenu" id="submenu-' + index + '">' +
                        submenuContent +
                    '</div>' +
                '</div>'
            );
        } else {
            var activeClass = item.activeOn.indexOf(currentPage) >= 0 ? ' active' : '';
            var requiredAttr = item.requiredPrivilege ? ' data-required-privilege="' + item.requiredPrivilege + '"' : '';
            var titleAttr = item.pageTitle ? ' data-page-title="' + item.pageTitle + '"' : '';
            return (
                '<a href="' + item.href + '" class="sidebar-nav-item' + activeClass + '"' + requiredAttr + titleAttr + '>' +
                    '<i class="' + item.icon + '"></i>' +
                    '<span class="nav-label">' + item.label + '</span>' +
                '</a>'
            );
        }
    }).join('');

    aside.innerHTML = '' +
        '<div class="sidebar-header">' +
            '<div class="sidebar-header-content">' +
                '<span class="sidebar-brand">NEC Admin</span>' +
                '<span class="sidebar-role">' + roleDisplay + '</span>' +
            '</div>' +
        '</div>' +
        '<button class="sidebar-toggle-btn" id="sidebarToggle" title="Toggle Sidebar">' +
            '<i class="ri-menu-fold-line" id="sidebarToggleIcon"></i>' +
        '</button>' +
        '<nav class="sidebar-nav">' + navLinks + '</nav>' +
        '<div class="sidebar-footer">' +
            '<a href="index.html" class="sidebar-nav-item logout-item">' +
                '<i class="ri-logout-box-line"></i>' +
                '<span class="nav-label">Logout</span>' +
            '</a>' +
        '</div>';

    document.body.insertBefore(aside, document.body.firstChild);
    injectStyles();
    removeLegacyNavbar();
    initSidebarToggle();
    initPrivilegeGuards(resolvedPrivileges, isSuper);
    console.log('[AdminSidebar] Sidebar (re)built.');
}

function initPrivilegeGuards(privileges, isSuper) {
    var protectedLinks = document.querySelectorAll('#adminSidebar .sidebar-nav-item[data-required-privilege]');
    protectedLinks.forEach(function(link) {
        link.addEventListener('click', async function(e) {
            var requiredPrivilege = link.getAttribute('data-required-privilege');
            var pageTitle = link.getAttribute('data-page-title') || 'this page';

            if (isSuper || !requiredPrivilege) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            var adminData = resolveCurrentAdminData() || {};
            var dbPrivileges = await getCurrentAdminPrivilegesFromDatabase(adminData);
            var latestPrivileges = dbPrivileges || getStoredAdminPrivileges() || privileges || {};

            if (!dbPrivileges) {
                showSidebarPrivilegeCheckErrorModal(pageTitle);
                return;
            }

            if (!canAccessPrivilege(requiredPrivilege, latestPrivileges, isSuper)) {
                showSidebarAccessDeniedModal(pageTitle);
                return;
            }

            var href = link.getAttribute('href');
            if (href) {
                window.location.href = href;
            }
        });
    });
}

function refreshSidebarWithVerifiedPrivileges() {
    var adminData = resolveCurrentAdminData() || {};
    var storedPrivileges = getStoredAdminPrivileges() || {};

    // Render immediately with current in-memory/storage state.
    buildAndInsertSidebar(adminData, storedPrivileges);

    // Then fetch and re-render with database-verified privileges.
    getCurrentAdminPrivilegesFromDatabase(adminData).then(function(dbPrivileges) {
        if (dbPrivileges) {
            buildAndInsertSidebar(adminData, dbPrivileges);
        }
    });
}

    function injectStyles() {
        var style = document.createElement('style');
        style.textContent = '' +
            '.admin-sidebar{position:fixed;top:0;left:0;width:240px;height:100vh;background:#fff;border-right:1px solid #fff;z-index:1100;display:flex;flex-direction:column;box-shadow:4px 0 24px rgba(0,30,67,.12);transition:width .3s cubic-bezier(.4,0,.2,1);overflow:hidden;}' +
            '.admin-sidebar.collapsed{width:68px;}' +
            '.sidebar-header{display:flex;align-items:center;padding:12px 16px;min-height:74px;background:linear-gradient(135deg,#001e43,#002a5c);overflow:hidden;white-space:nowrap;flex-shrink:0;}' +
            '.sidebar-header-content{display:flex;flex-direction:column;gap:4px;width:100%;}' +
            '.sidebar-brand{font-size:15px;font-weight:700;color:#fff;letter-spacing:.3px;opacity:1;transition:opacity .2s ease;white-space:nowrap;}' +
            '.sidebar-role{font-size:11px;font-weight:600;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:.5px;opacity:1;transition:opacity .2s ease;}' +
            '.admin-sidebar.collapsed .sidebar-brand,.admin-sidebar.collapsed .sidebar-role{opacity:0;pointer-events:none;}' +
            '.sidebar-toggle-btn{background:none;border:none;color:rgba(0,30,67,.75);font-size:20px;padding:10px 22px 10px;cursor:pointer;transition:color .2s ease;align-self:flex-end;flex-shrink:0;}' +
            '.sidebar-toggle-btn:hover{color:#001e43;}' +
            '.sidebar-nav{flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 0;scrollbar-width:thin;}' +
            '.sidebar-nav::-webkit-scrollbar{width:6px;}' +
            '.sidebar-nav::-webkit-scrollbar-track{background:#f1f1f1;}' +
            '.sidebar-nav::-webkit-scrollbar-thumb{background:#001e43;border-radius:3px;}' +
            '.sidebar-nav-item{display:flex;align-items:center;gap:14px;padding:13px 20px;color:#001e43;text-decoration:none;font-size:14px;font-weight:500;white-space:nowrap;transition:all .25s ease;border-left:3px solid transparent;overflow:hidden;cursor:pointer;background:none;border:none;width:100%;text-align:left;}' +
            '.sidebar-nav-item i{font-size:20px;flex-shrink:0;width:24px;text-align:center;}' +
            '.nav-label{opacity:1;transition:opacity .2s ease;}' +
            '.admin-sidebar.collapsed .nav-label{opacity:0;pointer-events:none;}' +
            '.sidebar-nav-item:hover,.sidebar-nav-item.active{background:#001e43;color:#fff;border-left-color:#001e43;text-decoration:none;}' +
            '.sidebar-nav-group.active>.submenu-toggle{background:#001e43;color:#fff;border-left-color:#001e43;}' +
            '.sidebar-nav-group.active>.submenu-toggle .submenu-icon{transform:rotate(180deg);}' +
            '.submenu-toggle .submenu-icon{margin-left:auto;font-size:18px;transition:transform .25s ease;flex-shrink:0;}' +
            '.sidebar-submenu{display:none;flex-direction:column;background:rgba(0,30,67,.04);max-height:0;overflow:hidden;transition:max-height .25s ease;}' +
            '.sidebar-submenu.show{display:flex;max-height:500px;}' +
            '.sidebar-submenu-item{display:flex;align-items:center;gap:14px;padding:13px 20px 13px 60px;color:#001e43;text-decoration:none;font-size:13px;font-weight:500;white-space:nowrap;transition:all .25s ease;border-left:3px solid transparent;overflow:hidden;}' +
            '.sidebar-submenu-item i{font-size:18px;flex-shrink:0;width:20px;text-align:center;}' +
            '.sidebar-submenu-item:hover,.sidebar-submenu-item.active{background:#001e43;color:#fff;border-left-color:#001e43;text-decoration:none;}' +
            '.admin-sidebar.collapsed .sidebar-submenu{display:none !important;}' +
            '.sidebar-footer{border-top:1px solid rgba(0,30,67,.12);padding:8px 0;flex-shrink:0;}' +
            '.logout-item{background:#ffe8e8;color:#b4232c !important;}' +
            '.logout-item:hover{background:#ffd4d4 !important;color:#8f111c !important;border-left-color:#c62828 !important;}' +
            '.top-header-area{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.admin-page-hero{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.admin-wrapper{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.admin-stats-wrapper{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.timeline-page{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.main-content-wrapper{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.reports-welcome-banner{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.reports-section{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.header-welcome-gap{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.navbar{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            'body.admin-sidebar-collapsed .top-header-area{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .admin-page-hero{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .admin-wrapper{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .admin-stats-wrapper{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .timeline-page{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .main-content-wrapper{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .reports-welcome-banner{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .reports-section{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .header-welcome-gap{margin-left:68px;}' +
            '.admin-sidebar.collapsed .sidebar-submenu{display:none !important;}' +
            '.sidebar-footer{border-top:1px solid rgba(0,30,67,.12);padding:8px 0;flex-shrink:0;}' +
            '.logout-item{background:#ffe8e8;color:#b4232c !important;}' +
            '.logout-item:hover{background:#ffd4d4 !important;color:#8f111c !important;border-left-color:#c62828 !important;}' +
            '.top-header-area{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.admin-page-hero{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.admin-wrapper{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.admin-stats-wrapper{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.timeline-page{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.main-content-wrapper{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.reports-welcome-banner{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.reports-section{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.header-welcome-gap{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            '.navbar{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            'body.admin-sidebar-collapsed .top-header-area{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .admin-page-hero{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .admin-wrapper{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .admin-stats-wrapper{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .timeline-page{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .main-content-wrapper{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .reports-welcome-banner{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .reports-section{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .header-welcome-gap{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .navbar{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .admin-welcome-banner{margin-left:68px;}' +
            'body.admin-sidebar-collapsed .header-welcome-gap{margin-left:68px;}' +
            '@media (max-width:900px){.top-header-area,.admin-page-hero,.admin-wrapper,.admin-stats-wrapper,.timeline-page,.main-content-wrapper,.reports-welcome-banner,.reports-section,.header-welcome-gap,.navbar{margin-left:68px;}.admin-sidebar{width:68px;}.admin-sidebar .sidebar-brand,.admin-sidebar .nav-label{opacity:0;pointer-events:none;}}';

        document.head.appendChild(style);
    }

    function removeLegacyNavbar() {
        var legacyNav = document.getElementById('navbar');
        if (legacyNav) {
            legacyNav.remove();
        }

        var navbars = document.querySelectorAll('nav.navbar');
        navbars.forEach(function (nav) {
            if (nav.querySelector('a[href="admin-dashboard.html"]')) {
                nav.remove();
            }
        });
    }

    function initSidebarToggle() {
        var adminSidebar = document.getElementById('adminSidebar');
        var sidebarToggle = document.getElementById('sidebarToggle');
        var sidebarToggleIcon = document.getElementById('sidebarToggleIcon');

        if (!adminSidebar || !sidebarToggle || !sidebarToggleIcon) {
            return;
        }

        sidebarToggle.addEventListener('click', function () {
            adminSidebar.classList.toggle('collapsed');
            document.body.classList.toggle('admin-sidebar-collapsed', adminSidebar.classList.contains('collapsed'));
            if (adminSidebar.classList.contains('collapsed')) {
                sidebarToggleIcon.classList.replace('ri-menu-fold-line', 'ri-menu-unfold-line');
            } else {
                sidebarToggleIcon.classList.replace('ri-menu-unfold-line', 'ri-menu-fold-line');
            }
        });

        // Initialize submenu toggles
        var submenuToggles = document.querySelectorAll('.submenu-toggle');
        submenuToggles.forEach(function (toggle) {
            toggle.addEventListener('click', function (e) {
                e.preventDefault();
                var submenuId = toggle.getAttribute('data-submenu');
                var submenu = document.getElementById(submenuId);
                var navGroup = toggle.closest('.sidebar-nav-group');

                if (submenu) {
                    submenu.classList.toggle('show');
                    navGroup.classList.toggle('active');
                }
            });
        });
    }


// Initial sidebar build
refreshSidebarWithVerifiedPrivileges();

// Listen for changes to localStorage (from other tabs/windows)
window.addEventListener('storage', function(e) {
    if (e.key === 'admin_data' || e.key === 'auth_sessions' || e.key === 'admin_sessions') {
        refreshSidebarWithVerifiedPrivileges();
    }
});

// Listen for changes to localStorage in this tab (monkey-patch setItem/removeItem)
(function() {
    var origSetItem = localStorage.setItem;
    var origRemoveItem = localStorage.removeItem;
    localStorage.setItem = function(key, value) {
        origSetItem.apply(this, arguments);
        if (key === 'admin_data' || key === 'auth_sessions' || key === 'admin_sessions') refreshSidebarWithVerifiedPrivileges();
    };
    localStorage.removeItem = function(key) {
        origRemoveItem.apply(this, arguments);
        if (key === 'admin_data' || key === 'auth_sessions' || key === 'admin_sessions') refreshSidebarWithVerifiedPrivileges();
    };
})();
