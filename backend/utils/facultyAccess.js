const db = require('../db');
const db2 = require('../db2');

const ACCESS_DENIED_MESSAGE = 'Access denied contact the admin';

const CAMPUS_CONNECTIONS = {
    NECN: {
        db,
        dbName: process.env.DB_NAME || 'placement_portal2'
    },
    NECG: {
        db: db2,
        dbName: process.env.DB_NAME_NEW || 'placement_portal3'
    }
};

const PRIVILEGE_COLUMN_MAP = {
    postEvents: 'can_post_events',
    uploadResources: 'can_upload_resources',
    postInternships: 'can_post_internships',
    monitorAssignedDrives: 'can_monitor_assigned_drives'
};

function normalizeCampusType(campusType) {
    return campusType === 'NECG' ? 'NECG' : 'NECN';
}

function normalizePrivileges(input = {}) {
    if (Array.isArray(input)) {
        return {
            postEvents: input.includes('postEvents'),
            uploadResources: input.includes('uploadResources'),
            postInternships: input.includes('postInternships'),
            monitorAssignedDrives: input.includes('monitorAssignedDrives')
        };
    }

    return {
        postEvents: Boolean(input.postEvents || input.canPostEvents || input.can_post_events),
        uploadResources: Boolean(input.uploadResources || input.canUploadResources || input.can_upload_resources),
        postInternships: Boolean(input.postInternships || input.canPostInternships || input.can_post_internships),
        monitorAssignedDrives: Boolean(
            input.monitorAssignedDrives ||
            input.canMonitorAssignedDrives ||
            input.can_monitor_assigned_drives
        )
    };
}

async function ensureFacultySchema(connection, dbName, campusType) {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS faculty (
            id INT AUTO_INCREMENT PRIMARY KEY,
            faculty_id VARCHAR(20) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(20) NOT NULL,
            department VARCHAR(100) NOT NULL,
            designation VARCHAR(100) NOT NULL,
            campus_type VARCHAR(10) NOT NULL DEFAULT '${campusType}',
            can_post_events BOOLEAN DEFAULT 0,
            can_upload_resources BOOLEAN DEFAULT 0,
            can_post_internships BOOLEAN DEFAULT 0,
            can_monitor_assigned_drives BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_faculty_id (faculty_id),
            INDEX idx_email (email)
        )
    `);

    const [facultyColumns] = await connection.query(
        `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'faculty'`,
        [dbName]
    );

    const facultyColumnNames = new Set(facultyColumns.map(column => column.COLUMN_NAME));

    if (!facultyColumnNames.has('campus_type')) {
        await connection.query(`ALTER TABLE faculty ADD COLUMN campus_type VARCHAR(10) NOT NULL DEFAULT '${campusType}'`);
    }
    if (!facultyColumnNames.has('phone')) {
        await connection.query('ALTER TABLE faculty ADD COLUMN phone VARCHAR(20) NULL');
    }
    if (!facultyColumnNames.has('designation')) {
        await connection.query('ALTER TABLE faculty ADD COLUMN designation VARCHAR(100) NULL');
    }
    if (!facultyColumnNames.has('can_post_events')) {
        await connection.query('ALTER TABLE faculty ADD COLUMN can_post_events BOOLEAN DEFAULT 0');
    }
    if (!facultyColumnNames.has('can_upload_resources')) {
        await connection.query('ALTER TABLE faculty ADD COLUMN can_upload_resources BOOLEAN DEFAULT 0');
    }
    if (!facultyColumnNames.has('can_post_internships')) {
        await connection.query('ALTER TABLE faculty ADD COLUMN can_post_internships BOOLEAN DEFAULT 0');
    }
    if (!facultyColumnNames.has('can_monitor_assigned_drives')) {
        await connection.query('ALTER TABLE faculty ADD COLUMN can_monitor_assigned_drives BOOLEAN DEFAULT 0');
    }
    await connection.query(`UPDATE faculty SET campus_type = COALESCE(NULLIF(campus_type, ''), ?)`, [campusType]);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS faculty_auth (
            id INT AUTO_INCREMENT PRIMARY KEY,
            faculty_id VARCHAR(20) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255),
            password_reset_required BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_faculty_auth_id (faculty_id),
            INDEX idx_faculty_auth_email (email),
            CONSTRAINT fk_faculty_auth_faculty
                FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
        )
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS faculty_password_resets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            faculty_id INT NOT NULL,
            reset_token VARCHAR(255) UNIQUE NOT NULL,
            token_expires DATETIME NOT NULL,
            is_used BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_faculty_password_reset_faculty
                FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
        )
    `);

    const [resourceColumns] = await connection.query(
        `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'faculty_resources'`,
        [dbName]
    );

    const resourceColumnNames = new Set(resourceColumns.map(column => column.COLUMN_NAME));
    if (resourceColumnNames.size > 0) {
        if (!resourceColumnNames.has('title')) {
            await connection.query('ALTER TABLE faculty_resources ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT ""');
        }
        if (!resourceColumnNames.has('category')) {
            await connection.query('ALTER TABLE faculty_resources ADD COLUMN category VARCHAR(100) NULL');
        }
        if (!resourceColumnNames.has('uploaded_file_path')) {
            await connection.query('ALTER TABLE faculty_resources ADD COLUMN uploaded_file_path VARCHAR(255) NULL');
        }
        if (!resourceColumnNames.has('file_size')) {
            await connection.query('ALTER TABLE faculty_resources ADD COLUMN file_size INT NULL');
        }
        if (!resourceColumnNames.has('file_type')) {
            await connection.query('ALTER TABLE faculty_resources ADD COLUMN file_type VARCHAR(50) NULL');
        }
        if (!resourceColumnNames.has('description')) {
            await connection.query('ALTER TABLE faculty_resources ADD COLUMN description TEXT NULL');
        }
        if (!resourceColumnNames.has('file_path')) {
            await connection.query('ALTER TABLE faculty_resources ADD COLUMN file_path VARCHAR(255) NULL');
        }
    }
}

async function ensureAllFacultySchemas() {
    await Promise.all(
        Object.entries(CAMPUS_CONNECTIONS).map(([campusType, config]) =>
            ensureFacultySchema(config.db, config.dbName, campusType)
        )
    );
}

async function generateNextFacultyId(connection, campusType) {
    const [[row]] = await connection.query('SELECT MAX(id) AS maxId FROM faculty');
    const nextNumber = (row.maxId || 0) + 1;
    return `${campusType}_FAC_${String(nextNumber).padStart(3, '0')}`;
}

async function queryFacultyRecord(connection, params) {
    const conditions = [];
    const values = [];

    if (params.facultyId !== undefined && params.facultyId !== null && params.facultyId !== '') {
        if (typeof params.facultyId === 'string' && Number.isNaN(Number(params.facultyId))) {
            conditions.push('UPPER(f.faculty_id) = UPPER(?)');
            values.push(params.facultyId);
        } else {
            conditions.push('f.id = ?');
            values.push(Number(params.facultyId));
        }
    }

    if (params.email) {
        conditions.push('(LOWER(f.email) = LOWER(?) OR LOWER(COALESCE(fa.email, "")) = LOWER(?))');
        values.push(params.email, params.email);
    }

    if (params.identifier) {
        if (params.identifier.includes('@')) {
            conditions.push('(LOWER(f.email) = LOWER(?) OR LOWER(COALESCE(fa.email, "")) = LOWER(?))');
            values.push(params.identifier, params.identifier);
        } else if (Number.isNaN(Number(params.identifier))) {
            conditions.push('UPPER(f.faculty_id) = UPPER(?)');
            values.push(params.identifier);
        } else {
            conditions.push('f.id = ?');
            values.push(Number(params.identifier));
        }
    }

    if (conditions.length === 0) {
        return null;
    }

    const [rows] = await connection.query(
        `SELECT f.*, fa.email AS auth_email, fa.password AS auth_password
         FROM faculty f
         LEFT JOIN faculty_auth fa ON fa.faculty_id = f.faculty_id
         WHERE ${conditions.join(' OR ')}
         LIMIT 1`,
        values
    );

    return rows[0] || null;
}

async function resolveFacultyContext({ facultyId, email, identifier, campusType }) {
    const normalizedCampus = campusType ? normalizeCampusType(campusType) : null;
    const searchOrder = normalizedCampus
        ? [normalizedCampus]
        : Object.keys(CAMPUS_CONNECTIONS);

    for (const campus of searchOrder) {
        const config = CAMPUS_CONNECTIONS[campus];
        const faculty = await queryFacultyRecord(config.db, { facultyId, email, identifier });
        if (faculty) {
            return {
                campusType: campus,
                connection: config.db,
                dbName: config.dbName,
                faculty
            };
        }
    }

    return null;
}

function facultyPrivilegesFromRow(faculty) {
    return {
        postEvents: Boolean(faculty.can_post_events),
        uploadResources: Boolean(faculty.can_upload_resources),
        postInternships: Boolean(faculty.can_post_internships),
        monitorAssignedDrives: Boolean(faculty.can_monitor_assigned_drives)
    };
}

function hasFacultyPrivilege(faculty, privilegeKey) {
    const columnName = PRIVILEGE_COLUMN_MAP[privilegeKey];
    return columnName ? Boolean(faculty[columnName]) : false;
}

module.exports = {
    ACCESS_DENIED_MESSAGE,
    CAMPUS_CONNECTIONS,
    PRIVILEGE_COLUMN_MAP,
    normalizeCampusType,
    normalizePrivileges,
    ensureFacultySchema,
    ensureAllFacultySchemas,
    generateNextFacultyId,
    resolveFacultyContext,
    facultyPrivilegesFromRow,
    hasFacultyPrivilege
};