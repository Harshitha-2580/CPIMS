require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { authMiddleware, verifyToken } = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const opportunitiesRoutes = require('./routes/opportunities');
const facultyRoutes = require('./routes/faculty');
const studentRoutes = require('./routes/student');
const attendanceRoutes = require('./routes/attendance');

const app = express();
const PORT = process.env.PORT || 3000;

const PROTECTED_PAGE_ROUTES = [
    { prefix: 'admin-', login: '/login-admin.html', roles: ['admin', 'super', 'superadmin'] },
    { prefix: 'faculty-', login: '/login-faculty.html', roles: ['faculty'] },
    { prefix: 'student-', login: '/login-student.html', roles: ['student'] }
];

const PUBLIC_HTML_PAGES = new Set([
    '/index.html',
    '/contact.html',
    '/events.html',
    '/companies.html',
    '/login-admin.html',
    '/login-faculty.html',
    '/login-student.html',
    '/reset-password.html',
    '/admin-reset-password.html',
    '/faculty-reset-password.html'
]);

function getCookieValue(cookieHeader, name) {
    if (!cookieHeader) return null;

    const parts = cookieHeader.split(';');
    for (const part of parts) {
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

    return null;
}

function getProtectedPageConfig(requestPath) {
    const pageName = path.basename(requestPath || '').toLowerCase();

    if (!pageName.endsWith('.html') || PUBLIC_HTML_PAGES.has(`/${pageName}`)) {
        return null;
    }

    return PROTECTED_PAGE_ROUTES.find(route => pageName.startsWith(route.prefix)) || null;
}

function getRequestToken(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }

    return getCookieValue(req.headers.cookie, 'auth_token');
}

function isTokenAllowedForPage(token, allowedRoles) {
    if (!token) {
        return false;
    }

    try {
        const decoded = verifyToken(token);
        const tokenRole = String(decoded && decoded.role ? decoded.role : '').toLowerCase();
        return allowedRoles.includes(tokenRole);
    } catch (err) {
        return false;
    }
}

function protectedPageRedirectMiddleware(req, res, next) {
    if (req.method !== 'GET') {
        return next();
    }

    const protectedPage = getProtectedPageConfig(req.path);
    if (!protectedPage) {
        return next();
    }

    const token = getRequestToken(req);
    if (isTokenAllowedForPage(token, protectedPage.roles)) {
        return next();
    }

    return res.redirect(302, protectedPage.login);
}

function requireApiRoles(allowedRoles, options = {}) {
    const publicRoutes = options.publicRoutes || [];

    return function roleGuard(req, res, next) {
        const normalizedPath = req.path.replace(/\/+$/, '') || '/';
        const isPublic = publicRoutes.some(route => route.method === req.method && route.path === normalizedPath);

        if (isPublic) {
            return next();
        }

        const userRole = String(req.user && req.user.role ? req.user.role : '').toLowerCase();
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ success: false, message: 'Forbidden: insufficient privileges' });
        }

        return next();
    };
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Redirect direct requests to protected HTML pages before the static file is served.
app.use(protectedPageRedirectMiddleware);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));
// Serve uploaded files (resumes, profiles)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api', authMiddleware);
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/student', requireApiRoles(['student'], {
    publicRoutes: [
        { method: 'POST', path: '/signup' }
    ]
}), studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/attendance', attendanceRoutes);

// Cleanup rejected pending student requests older than 2 days
async function cleanupRejectedPendingStudents() {
    try {
        await db.query("DELETE FROM pending_students WHERE status = 'rejected' AND created_at < NOW() - INTERVAL 2 DAY");
        console.log('Cleanup: removed rejected pending students older than 2 days');
        await require('./db2').query("DELETE FROM pending_students WHERE status = 'rejected' AND created_at < NOW() - INTERVAL 2 DAY");
        console.log('Cleanup: removed rejected pending students older than 2 days (NECG)');
    } catch (err) {
        console.error('Cleanup error:', err);
    }
}

// Run at startup and then every hour
cleanupRejectedPendingStudents();
setInterval(cleanupRejectedPendingStudents, 60 * 60 * 1000);


// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Additional HTML pages (frontend routing)
app.get('/admin-faculty.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin-faculty.html'));
});

app.get('/admin-add-placement.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin-add-placement.html'));
});

app.get('/admin-opportunities.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin-opportunities.html'));
});

app.get('/student-attendance.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/student-attendance.html'));
});

app.get('/admin-attendance-scanner.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin-attendance-scanner.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('Server is running on http://localhost');
});







// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const path = require('path');
// const db = require('./db');
// const authRoutes = require('./routes/auth');
// const adminRoutes = require('./routes/admin');
// const opportunitiesRoutes = require('./routes/opportunities');








// const app = express();
// const PORT = 3000;

// // Middleware
// app.use(cors());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// // Serve static frontend files
// app.use(express.static(path.join(__dirname, '../frontend')));
// app.use('/api', authRoutes);
// //app.use(express.static(path.join(__dirname, '../frontend')));
// // Add this line after auth routes
// app.use('/api/admin', adminRoutes);

// app.use('/api/opportunities', opportunitiesRoutes);


// // Route for root - send index.html
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, '../frontend/index.html'));
// });

// app.get('/admin-faculty.html', (req, res) => {
//     res.sendFile(path.join(__dirname, '../frontend/admin-faculty.html'));
// });




// // Start server
// app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
// });
