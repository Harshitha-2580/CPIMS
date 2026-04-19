(function () {
    'use strict';

    if (document.querySelector('.student-sidebar')) {
        return;
    }

    var currentPage = (window.location.pathname.split('/').pop() || '').toLowerCase();

    // Only inject the hero title/subtitle banner for dashboard/profile pages.
    // Other pages should manage their own banner markup inside their HTML.
    var injectHero = currentPage === 'student-dashboard.html' || currentPage.startsWith('student-profile');

    var navItems = [
        {
            href: 'student-dashboard.html',
            icon: 'ri-dashboard-line',
            label: 'Dashboard',
            activeOn: ['student-dashboard.html']
        },
        {
            href: 'student-announcements.html',
            icon: 'ri-megaphone-line',
            label: 'Announcements',
            activeOn: ['student-announcements.html']
        },
        {
            href: 'student-events.html',
            icon: 'ri-calendar-event-line',
            label: 'Events',
            activeOn: [
                'student-events.html',
                'student-events-seminars.html',
                'student-events-workshops.html',
                'student-events-hackathons.html',
                'student-events-career.html'
            ]
        },
        {
            href: 'student-resources.html',
            icon: 'ri-book-open-line',
            label: 'Resources',
            activeOn: ['student-resources.html']
        },
        {
            href: 'student-internships.html',
            icon: 'ri-medal-line',
            label: 'Internships',
            activeOn: ['student-internships.html']
        },
        {
            href: 'student-jobs.html',
            icon: 'ri-briefcase-3-line',
            label: 'Job Opportunities',
            activeOn: ['student-jobs.html', 'student-assigned-opportunities.html']
        },
        {
            href: 'student-my-applications.html',
            icon: 'ri-file-list-3-line',
            label: 'My Applications',
            activeOn: ['student-my-applications.html']
        },
        {
            href: 'student-attendance.html',
            icon: 'ri-qr-code-line',
            label: 'Attendance QR',
            activeOn: ['student-attendance.html']
        },
        {
            href: 'student-profile.html',
            icon: 'ri-user-3-line',
            label: 'My Profile',
            activeOn: [
                'student-profile.html',
                'student-profile-edit.html',
                'student-profile-fixed.html',
                'student-academic-edit.html'
            ]
        }
    ];

    function buildSidebar() {
        var aside = document.createElement('aside');
        aside.className = 'student-sidebar';
        aside.id = 'studentSidebar';

        var campusType = ((sessionStorage.getItem('student_college') || localStorage.getItem('student_college')) || localStorage.getItem('campus_type') || '').toUpperCase();
        if (campusType !== 'NECN' && campusType !== 'NECG') {
            campusType = 'NECN';
        }
        var brandText = campusType + ' Student';
        var studentName = (sessionStorage.getItem('student_name') || localStorage.getItem('student_name')) || '';
        var studentNameHtml = studentName ? '<span class="sidebar-role">' + studentName + '</span>' : '';

        var navLinks = navItems.map(function (item) {
            var activeClass = item.activeOn.indexOf(currentPage) >= 0 ? ' active' : '';
            return (
                '<a href="' + item.href + '" class="sidebar-nav-item' + activeClass + '">' +
                    '<i class="' + item.icon + '"></i>' +
                    '<span class="nav-label">' + item.label + '</span>' +
                '</a>'
            );
        }).join('');

        aside.innerHTML = '' +
            '<div class="sidebar-header">' +
                '<div class="sidebar-header-content">' +
                    '<span class="sidebar-brand">' + brandText + '</span>' +
                    studentNameHtml +
                '</div>' +
            '</div>' +
            '<button class="sidebar-toggle-btn" id="studentSidebarToggle" title="Toggle Sidebar">' +
                '<i class="ri-menu-fold-line" id="studentSidebarToggleIcon"></i>' +
            '</button>' +
            '<nav class="sidebar-nav">' + navLinks + '</nav>' +
            '<div class="sidebar-footer">' +
                '<a href="index.html" class="sidebar-nav-item logout-item" id="studentSidebarLogout">' +
                    '<i class="ri-logout-box-line"></i>' +
                    '<span class="nav-label">Logout</span>' +
                '</a>' +
            '</div>';

        return aside;
    }

    function injectStyles() {
        var style = document.createElement('style');
        style.textContent = '' +
            '.student-sidebar{position:fixed;top:0;left:0;width:240px;height:100vh;background:#fff;border-right:1px solid #fff;z-index:1100;display:flex;flex-direction:column;box-shadow:4px 0 24px rgba(0,30,67,.12);transition:width .3s cubic-bezier(.4,0,.2,1);overflow:hidden;}' +
            '.student-sidebar.collapsed{width:68px;}' +
            '.sidebar-header{display:flex;align-items:center;gap:8px;padding:12px 16px;min-height:74px;background:linear-gradient(135deg,#001e43,#002a5c);overflow:hidden;white-space:nowrap;flex-shrink:0;}' +
            '.sidebar-brand{font-size:15px;font-weight:700;color:#fff;letter-spacing:.3px;opacity:1;transition:opacity .2s ease;white-space:nowrap;}' +
            '.student-sidebar.collapsed .sidebar-brand{opacity:0;pointer-events:none;}' +
            '.sidebar-toggle-btn{background:none;border:none;color:rgba(0,30,67,.75);font-size:20px;padding:10px 22px 10px;cursor:pointer;transition:color .2s ease;align-self:flex-end;flex-shrink:0;}' +
            '.sidebar-toggle-btn:hover{color:#001e43;}' +
            '.sidebar-nav{flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 0;scrollbar-width:thin;}' +
            '.sidebar-nav::-webkit-scrollbar{width:6px;}' +
            '.sidebar-nav::-webkit-scrollbar-track{background:#f1f1f1;}' +
            '.sidebar-nav::-webkit-scrollbar-thumb{background:#001e43;border-radius:3px;}' +
            '.sidebar-nav-item{display:flex;align-items:center;gap:14px;padding:13px 20px;color:#001e43;text-decoration:none;font-size:14px;font-weight:500;white-space:nowrap;transition:all .25s ease;border-left:3px solid transparent;overflow:hidden;}' +
            '.sidebar-nav-item i{font-size:20px;flex-shrink:0;width:24px;text-align:center;}' +
            '.nav-label{opacity:1;transition:opacity .2s ease;}' +
            '.student-sidebar.collapsed .nav-label{opacity:0;pointer-events:none;}' +
            '.sidebar-header-content{display:flex;flex-direction:column;gap:4px;}' +
            '.sidebar-role{color:#ffffffb3;font-size:13px;font-weight:400;}' +
            '.student-sidebar.collapsed .sidebar-role{display:none !important;}' +
            '.sidebar-nav-item:hover,.sidebar-nav-item.active{background:#001e43;color:#fff;border-left-color:#001e43;text-decoration:none;}' +
            '.sidebar-footer{border-top:1px solid rgba(0,30,67,.12);padding:8px 0;flex-shrink:0;}' +
            '.logout-item{background:#ffe8e8;color:#b4232c !important;}' +
            '.logout-item:hover{background:#ffd4d4 !important;color:#8f111c !important;border-left-color:#c62828 !important;}' +
        'body.student-sidebar-enabled{padding-left:0;transition:padding-left .3s cubic-bezier(.4,0,.2,1);}' +
        '.main-content-wrapper{margin-left:240px;transition:margin-left .3s cubic-bezier(.4,0,.2,1);min-height:100vh;}' +
        '.student-sidebar.collapsed ~ .main-content-wrapper, body.student-sidebar-collapsed .main-content-wrapper{margin-left:68px !important;}' +
        'body.student-sidebar-collapsed .top-header-area, body.student-sidebar-collapsed .navbar, body.student-sidebar-collapsed .header-welcome-gap, body.student-sidebar-collapsed .student-page-hero, body.student-sidebar-collapsed .admin-welcome-banner{margin-left:0 !important;}' +
        '@media (max-width:900px){body.student-sidebar-enabled{padding-left:0;}.top-header-area,.navbar,.header-welcome-gap,.student-page-hero,.admin-welcome-banner,.main-content-wrapper{margin-left:68px;}.student-sidebar{width:68px;}.student-sidebar .sidebar-brand,.student-sidebar .nav-label{opacity:0;pointer-events:none;}.sidebar-toggle-btn{display:none;}}';
        document.head.appendChild(style);
    }

    function removeLegacyNavbar() {
        // Remove the legacy Bootstrap navbar used by the older student pages.
        // This ensures all student pages use the same sidebar / top-header base layout.
        var legacyNav = document.getElementById('navbar');
        if (legacyNav) {
            legacyNav.remove();
        }

        // Remove any remaining top-level navbars (typically inserted at the top of student pages).
        // This targets the site-wide navigation bar, not inline or section-specific nav elements.
        var topNavs = Array.from(document.querySelectorAll('body > nav.navbar'));
        topNavs.forEach(function (nav) {
            nav.remove();
        });

        // Remove the legacy page banner section (used by student feature pages) only when
        // we are injecting the hero banner ourselves (dashboard/profile pages).
        // Other pages should manage their own banner markup in their HTML.
        if (injectHero) {
            var pageBanner = document.querySelector('.pages-banner-area');
            if (pageBanner && pageBanner.parentNode) {
                pageBanner.parentNode.removeChild(pageBanner);
            }
        }

        // Remove any existing student hero/banner instances to avoid duplicates only when
        // we plan to inject our own dashboard-style hero (dashboard/profile pages).
        if (injectHero) {
            var existingHeroes = document.querySelectorAll('.student-page-hero, .my-apps-hero');
            existingHeroes.forEach(function (hero) {
                if (hero && hero.parentNode) {
                    hero.parentNode.removeChild(hero);
                }
            });
        }
    }

    function initSidebarToggle() {
        var sidebar = document.getElementById('studentSidebar');
        var toggle = document.getElementById('studentSidebarToggle');
        var icon = document.getElementById('studentSidebarToggleIcon');

        if (!sidebar || !toggle || !icon) {
            return;
        }

        toggle.addEventListener('click', function () {
            var isCollapsed = !sidebar.classList.contains('collapsed');
            sidebar.classList.toggle('collapsed');
            document.body.classList.toggle('student-sidebar-collapsed', isCollapsed);

            // Keep the main wrapper aligned with the sidebar
            var wrapper = document.getElementById('mainContentWrapper');
            if (wrapper) {
                wrapper.style.marginLeft = isCollapsed ? '68px' : '240px';
            }

            if (isCollapsed) {
                icon.classList.replace('ri-menu-fold-line', 'ri-menu-unfold-line');
            } else {
                icon.classList.replace('ri-menu-unfold-line', 'ri-menu-fold-line');
            }
        });
    }

    function initLogoutHandler() {
        var logoutLink = document.getElementById('studentSidebarLogout');
        if (!logoutLink) return;

        logoutLink.addEventListener('click', function () {
            localStorage.removeItem('student_id');
            localStorage.removeItem('student_name');
            localStorage.removeItem('student_branch');
        });
    }

    injectStyles();
    removeLegacyNavbar();

    document.body.classList.add('student-sidebar-enabled');

    var sidebarElement = buildSidebar();
    document.body.insertBefore(sidebarElement, document.body.firstChild);

    // If the HTML already provides a main content wrapper (as in newer layouts), use that.
    // Also support the case where a wrapper exists with class only (older markup).
    var mainWrapper = document.getElementById('mainContentWrapper') || document.querySelector('.main-content-wrapper');
    if (!mainWrapper) {
        // Wrap the remaining page content in a main content wrapper (like the admin layout)
        // so the fixed sidebar and main content align consistently.
        mainWrapper = document.createElement('div');
        mainWrapper.className = 'main-content-wrapper';
        mainWrapper.id = 'mainContentWrapper';

        // Apply fallback styles in case injected CSS doesn't load immediately
        mainWrapper.style.marginLeft = '240px';
        mainWrapper.style.transition = 'margin-left .3s cubic-bezier(.4,0,.2,1)';
        mainWrapper.style.minHeight = '100vh';

        var nodesToMove = [];
        Array.from(document.body.childNodes).forEach(function (node) {
            // Avoid moving the sidebar itself into the wrapper
            if (node !== sidebarElement) {
                nodesToMove.push(node);
            }
        });

        nodesToMove.forEach(function (node) {
            mainWrapper.appendChild(node);
        });

        document.body.appendChild(mainWrapper);
    } else {
        // If a wrapper exists by class only, assign the official ID for consistency.
        if (!mainWrapper.id) {
            mainWrapper.id = 'mainContentWrapper';
        }

        // Ensure layout alignment if wrapper already exists
        mainWrapper.style.marginLeft = '240px';
        mainWrapper.style.transition = 'margin-left .3s cubic-bezier(.4,0,.2,1)';
        mainWrapper.style.minHeight = '100vh';
    }

    // Ensure every student page has a consistent header + hero layout.
    // This removes any legacy/duplicate headers (including those inserted by pages themselves)
    // and reconstructs a single header + hero layout that matches the dashboard style.
    (function ensureStudentBaseLayout() {
        var mainWrapper = document.getElementById('mainContentWrapper');
        if (!mainWrapper) return;

        // Remove any existing legacy/student headers/hero to prevent duplicates.
        var existingHeader = document.querySelector('.top-header-area');
        if (existingHeader) existingHeader.remove();
        var existingGap = document.querySelector('.header-welcome-gap');
        if (existingGap) existingGap.remove();
        // Only remove existing hero if we are injecting the dashboard-style hero.
        if (injectHero) {
            var existingHero = mainWrapper.querySelector('.student-page-hero');
            if (existingHero) existingHero.remove();
        }

        // 1) Top header (NEC Central Placement title)
        var topHeader = document.createElement('div');
        topHeader.className = 'top-header-area style-2';
        topHeader.innerHTML =
            '<div class="container-fluid">' +
                '<div class="row align-items-center">' +
                    '<div class="col-12 text-center">' +
                        '<h3 class="mb-0" style="color: #fff; font-weight: 700; letter-spacing: 1px; line-height: 1.4; font-size: 26px;">' +
                            '<span style="font-family: \'Poppins\'; font-size: 36px; font-weight: 700;">NEC</span> - Central Placement Information and Management Center' +
                        '</h3>' +
                    '</div>' +
                '</div>' +
            '</div>';
        mainWrapper.insertBefore(topHeader, mainWrapper.firstChild);

        // 2) Spacer gap should appear for all student pages (like admin) to separate header from the content.
        var gap = document.createElement('div');
        gap.className = 'header-welcome-gap';
        gap.setAttribute('aria-hidden', 'true');
        mainWrapper.insertBefore(gap, topHeader.nextSibling);

        // 3) Hero banner is injected only for dashboard/profile pages. Other pages keep their own hero section.
        if (injectHero) {
            var pageTitle = (document.title || '').replace(/^\s*NEC\s*-\s*/i, '').trim() || 'Dashboard';
            var subtitleMap = {
                'Student Dashboard': 'Your Personalized Placement Hub - Explore Opportunities & Track Your Progress',
                'Announcements': 'Stay updated with the latest notices and placement announcements',
                'Seminars': 'Register for upcoming seminars and stay informed',
                'Workshops': 'Browse workshops to build skills and grow your network',
                'Hackathons': 'Find hackathons and coding events to participate in',
                'Career Guidance': 'Access career guidance sessions and resources',
                'Resources': 'Browse learning materials, documents and resources',
                'Internships': 'View available internship opportunities and apply',
                'Job Opportunities': 'Explore job opportunities and apply directly',
                'My Applications': 'Track your application status and history',
                'Attendance QR': 'View your QR codes for placement drive attendance',
                'My Profile': 'Update your profile and personal information'
            };

            var subtitle = subtitleMap[pageTitle] || 'Manage your placement and career activities here.';

            var hero = document.createElement('div');
            hero.className = 'student-page-hero';
            hero.innerHTML =
                '<div class="container">' +
                    '<div class="student-page-hero-content">' +
                        '<h1 class="student-page-hero-title">' + pageTitle + '</h1>' +
                        '<p class="student-page-hero-subtitle">' + subtitle + '</p>' +
                    '</div>' +
                '</div>';

            mainWrapper.insertBefore(hero, gap.nextSibling);
        }
    })();

    initSidebarToggle();
    initLogoutHandler();
})();


