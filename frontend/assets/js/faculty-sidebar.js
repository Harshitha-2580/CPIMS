(function () {
    'use strict';

    if (document.querySelector('.faculty-sidebar')) {
        return;
    }

    var currentPage = (window.location.pathname.split('/').pop() || '').toLowerCase();

    var navItems = [
        {
            href: 'faculty-dashboard.html',
            icon: 'ri-dashboard-line',
            label: 'Dashboard',
            activeOn: ['faculty-dashboard.html', 'faculty-assigned-drives.html']
        },
        {
            href: 'faculty-events.html',
            icon: 'ri-calendar-event-line',
            label: 'Add Events',
            requiredPrivileges: ['postEvents', 'can_post_events'],
            activeOn: ['faculty-events.html']
        },
        {
            href: 'faculty-applications.html',
            icon: 'ri-file-list-3-line',
            label: 'Internships',
            requiredPrivileges: ['monitorAssignedDrives', 'can_monitor_assigned_drives', 'postInternships', 'can_post_internships'],
            activeOn: ['faculty-applications.html']
        },
        {
            href: 'faculty-materials.html',
            icon: 'ri-book-open-line',
            label: 'Materials',
            requiredPrivileges: ['uploadResources', 'can_upload_resources'],
            activeOn: ['faculty-materials.html']
        },
        {
            href: 'faculty-profile.html',
            icon: 'ri-user-3-line',
            label: 'My Profile',
            activeOn: ['faculty-profile.html', 'faculty-reset-password.html']
        }
    ];

    function buildSidebar() {
        var aside = document.createElement('aside');
        aside.className = 'faculty-sidebar';
        aside.id = 'facultySidebar';

        var facultyData = (window.AuthSessionManager && AuthSessionManager.getCurrentUser && AuthSessionManager.getCurrentUser()) || {};
        var facultyName = facultyData.name || (sessionStorage.getItem('faculty_name') || localStorage.getItem('faculty_name')) || localStorage.getItem('user_name') || '';
        var facultyNameHtml = facultyName ? '<span class="sidebar-role">' + facultyName + '</span>' : '';

        var campusType = (facultyData.campusType || (sessionStorage.getItem('faculty_campus_type') || localStorage.getItem('faculty_campus_type')) || localStorage.getItem('campus_type') || '').toUpperCase();
        if (campusType !== 'NECN' && campusType !== 'NECG') {
            campusType = 'NECN';
        }
        var brandText = campusType + ' Faculty';

        var navLinks = navItems.map(function (item) {
            var activeClass = item.activeOn.indexOf(currentPage) >= 0 ? ' active' : '';
            var privilegeAttr = item.requiredPrivileges && item.requiredPrivileges.length
                ? ' data-required-privileges="' + item.requiredPrivileges.join(',') + '"'
                : '';
            var labelAttr = ' data-nav-label="' + item.label + '"';
            return (
                '<a href="' + item.href + '" class="sidebar-nav-item' + activeClass + '"' + privilegeAttr + labelAttr + '>' +
                    '<i class="' + item.icon + '"></i>' +
                    '<span class="nav-label">' + item.label + '</span>' +
                '</a>'
            );
        }).join('');

        aside.innerHTML = '' +
            '<div class="sidebar-header">' +
                '<div class="sidebar-header-content">' +
                    '<span class="sidebar-brand">' + brandText + '</span>' +
                    facultyNameHtml +
                '</div>' +
            '</div>' +
            '<button class="sidebar-toggle-btn" id="facultySidebarToggle" title="Toggle Sidebar">' +
                '<i class="ri-menu-fold-line" id="facultySidebarToggleIcon"></i>' +
            '</button>' +
            '<nav class="sidebar-nav">' + navLinks + '</nav>' +
            '<div class="sidebar-footer">' +
                '<a href="index.html" class="sidebar-nav-item logout-item">' +
                    '<i class="ri-logout-box-line"></i>' +
                    '<span class="nav-label">Logout</span>' +
                '</a>' +
            '</div>';

        return aside;
    }

    function injectStyles() {
        var style = document.createElement('style');
        style.textContent = '' +
            '.faculty-sidebar{position:fixed;top:0;left:0;width:240px;height:100vh;background:#fff;border-right:1px solid #fff;z-index:1100;display:flex;flex-direction:column;box-shadow:4px 0 24px rgba(0,30,67,.12);transition:width .3s cubic-bezier(.4,0,.2,1);overflow:hidden;}' +
            '.faculty-sidebar.collapsed{width:68px;}' +
            '.sidebar-header{display:flex;align-items:center;padding:12px 16px;min-height:74px;background:linear-gradient(135deg,#001e43,#002a5c);overflow:hidden;white-space:nowrap;flex-shrink:0;}' +
            '.sidebar-brand{font-size:15px;font-weight:700;color:#fff;letter-spacing:.3px;opacity:1;transition:opacity .2s ease;white-space:nowrap;}' +
            '.faculty-sidebar.collapsed .sidebar-brand{opacity:0;pointer-events:none;}' +
            '.sidebar-toggle-btn{background:none;border:none;color:rgba(0,30,67,.75);font-size:20px;padding:10px 22px 10px;cursor:pointer;transition:color .2s ease;align-self:flex-end;flex-shrink:0;}' +
            '.sidebar-toggle-btn:hover{color:#001e43;}' +
            '.sidebar-nav{flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 0;scrollbar-width:none;}' +
            '.sidebar-nav::-webkit-scrollbar{display:none;}' +
            '.sidebar-nav-item{display:flex;align-items:center;gap:14px;padding:13px 20px;color:#001e43;text-decoration:none;font-size:14px;font-weight:500;white-space:nowrap;transition:all .25s ease;border-left:3px solid transparent;overflow:hidden;}' +
            '.sidebar-nav-item i{font-size:20px;flex-shrink:0;width:24px;text-align:center;}' +
            '.nav-label{opacity:1;transition:opacity .2s ease;}' +
            '.faculty-sidebar.collapsed .nav-label{opacity:0;pointer-events:none;}' +
            '.sidebar-header-content{display:flex;flex-direction:column;gap:4px;}' +
            '.sidebar-role{color:#ffffffb3;font-size:13px;font-weight:400;}' +
            '.faculty-sidebar.collapsed .sidebar-role{display:none !important;}' +
            '.sidebar-nav-item:hover,.sidebar-nav-item.active{background:#001e43;color:#fff;border-left-color:#001e43;text-decoration:none;}' +
            '.sidebar-footer{border-top:1px solid rgba(0,30,67,.12);padding:8px 0;flex-shrink:0;}' +
            '.logout-item{background:#ffe8e8;color:#b4232c !important;}' +
            '.logout-item:hover{background:#ffd4d4 !important;color:#8f111c !important;border-left-color:#c62828 !important;}' +
            '.faculty-page-overview-wrap{padding:20px 0 10px;}' +
            '.faculty-page-overview-box{background:linear-gradient(135deg,#001e43,#002a5c);padding:34px 30px;border-radius:12px;color:#fff;position:relative;overflow:hidden;box-shadow:0 10px 34px rgba(0,30,67,.14);}' +
            '.faculty-page-overview-box::before{content:"";position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);animation:facultyPageBoxShimmer 4s infinite;}' +
            '.faculty-page-overview-content{position:relative;z-index:2;}' +
            '.faculty-page-overview-title{font-size:40px;line-height:1.15;font-weight:800;margin:0 0 10px;color:#fff;letter-spacing:-.8px;}' +
            '.faculty-page-overview-subtitle{font-size:18px;color:rgba(255,255,255,.95);margin:0 0 10px;}' +
            '.faculty-page-overview-list{margin:0;padding-left:18px;color:rgba(255,255,255,.92);font-size:14px;}' +
            '.faculty-page-overview-icon{position:relative;z-index:2;font-size:74px;color:#fff;opacity:.95;animation:facultyPageBoxFloat 3s ease-in-out infinite;display:inline-block;}' +
            '@keyframes facultyPageBoxShimmer{0%{left:-100%;}100%{left:100%;}}' +
            '@keyframes facultyPageBoxFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-12px);}}' +
            '.top-header-area,.header-welcome-gap,.navbar,.admin-wrapper,.profile-header,.profile-wrapper,.page-title,.overview-area,.application-area,.reset-container,.faculty-main-content,.footer-area,.copyright-area,.container.pt-100,.container.pt-100.pb-75,.faculty-dashboard-main,.faculty-page-overview-wrap{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);}' +
            'body.faculty-sidebar-collapsed .top-header-area,body.faculty-sidebar-collapsed .header-welcome-gap,body.faculty-sidebar-collapsed .navbar,body.faculty-sidebar-collapsed .admin-wrapper,body.faculty-sidebar-collapsed .profile-header,body.faculty-sidebar-collapsed .profile-wrapper,body.faculty-sidebar-collapsed .page-title,body.faculty-sidebar-collapsed .overview-area,body.faculty-sidebar-collapsed .application-area,body.faculty-sidebar-collapsed .reset-container,body.faculty-sidebar-collapsed .faculty-main-content,body.faculty-sidebar-collapsed .footer-area,body.faculty-sidebar-collapsed .copyright-area,body.faculty-sidebar-collapsed .container.pt-100,body.faculty-sidebar-collapsed .container.pt-100.pb-75,body.faculty-sidebar-collapsed .faculty-dashboard-main,body.faculty-sidebar-collapsed .faculty-page-overview-wrap{margin-left:68px;}' +
            '@media (max-width:991.98px){.faculty-page-overview-title{font-size:32px;}.faculty-page-overview-subtitle{font-size:16px;}.faculty-page-overview-icon{font-size:58px;margin-top:12px;}}' +
            '@media (max-width:900px){.top-header-area,.header-welcome-gap,.navbar,.admin-wrapper,.profile-header,.profile-wrapper,.page-title,.overview-area,.application-area,.reset-container,.faculty-main-content,.footer-area,.copyright-area,.container.pt-100,.container.pt-100.pb-75,.faculty-dashboard-main,.faculty-page-overview-wrap{margin-left:68px;}.faculty-sidebar{width:68px;}.faculty-sidebar .sidebar-brand,.faculty-sidebar .nav-label{opacity:0;pointer-events:none;}}';  

        document.head.appendChild(style);
    }

    function removeLegacyNavbar() {
        var legacyNav = document.getElementById('navbar');
        if (legacyNav) {
            legacyNav.remove();
        }

        var navbars = document.querySelectorAll('nav.navbar');
        navbars.forEach(function (nav) {
            if (nav.querySelector('a[href="faculty-dashboard.html"]')) {
                nav.remove();
            }
        });
    }

    function initSidebarToggle() {
        var sidebar = document.getElementById('facultySidebar');
        var toggle = document.getElementById('facultySidebarToggle');
        var icon = document.getElementById('facultySidebarToggleIcon');

        if (!sidebar || !toggle || !icon) {
            return;
        }

        toggle.addEventListener('click', function () {
            sidebar.classList.toggle('collapsed');
            document.body.classList.toggle('faculty-sidebar-collapsed', sidebar.classList.contains('collapsed'));
            if (sidebar.classList.contains('collapsed')) {
                icon.classList.replace('ri-menu-fold-line', 'ri-menu-unfold-line');
            } else {
                icon.classList.replace('ri-menu-unfold-line', 'ri-menu-fold-line');
            }
        });
    }

    function parseStoredPrivileges() {
        try {
            if (window.AuthSessionManager && AuthSessionManager.getCurrentPrivileges) {
                return AuthSessionManager.getCurrentPrivileges();
            }
            return JSON.parse((sessionStorage.getItem('faculty_privileges') || localStorage.getItem('faculty_privileges')) || '{}');
        } catch (e) {
            return {};
        }
    }

    function isGranted(value) {
        return value === true || value === 1 || value === '1' || value === 'true';
    }

    function hasAnyRequiredPrivilege(privileges, requiredList) {
        return requiredList.some(function (key) {
            return isGranted(privileges[key]);
        });
    }

    function initPrivilegeGuards() {
        var links = document.querySelectorAll('.sidebar-nav-item[data-required-privileges]');
        links.forEach(function (link) {
            link.addEventListener('click', function (event) {
                var requiredAttr = link.getAttribute('data-required-privileges') || '';
                var navLabel = link.getAttribute('data-nav-label') || 'this page';
                var requiredList = requiredAttr.split(',').map(function (s) { return s.trim(); }).filter(Boolean);

                if (!requiredList.length) {
                    return;
                }

                var privileges = parseStoredPrivileges();
                if (!hasAnyRequiredPrivilege(privileges, requiredList)) {
                    event.preventDefault();
                    alert('Access denied: You do not have permission to open ' + navLabel + '. Please contact admin.');
                }
            });
        });
    }

    injectStyles();
    removeLegacyNavbar();
    var sidebarElement = buildSidebar();
    document.body.insertBefore(sidebarElement, document.body.firstChild);
    initSidebarToggle();
    initPrivilegeGuards();
})();


