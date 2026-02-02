require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./db');

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const opportunitiesRoutes = require('./routes/opportunities');
const facultyRoutes = require('./routes/faculty');
const studentRoutes = require('./routes/student');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));
// Serve uploaded files (resumes, profiles)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/faculty', facultyRoutes);


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

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
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
