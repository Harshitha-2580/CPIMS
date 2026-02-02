const db = require('./db');
const fs = require('fs');

async function generateDetailedReport() {
    try {
        console.log('Generating detailed mentee assignment report...\n');

        const query = `
            SELECT 
                f.id as faculty_id,
                f.name as faculty_name,
                f.department,
                s.id as student_id,
                s.name as student_name,
                s.email,
                s.year
            FROM mentee_assignments ma
            JOIN faculty f ON ma.faculty_id = f.id
            JOIN students s ON ma.student_id = s.id
            ORDER BY f.department, f.id, s.name
        `;
        
        const [data] = await db.query(query);
        
        let report = '# DETAILED MENTEE ASSIGNMENT REPORT\n\n';
        report += `Generated on: ${new Date().toISOString()}\n\n`;
        report += `**Total Assignments: ${data.length}**\n\n`;

        let currentFacultyId = null;
        let currentDept = null;
        let menteeCount = 0;

        data.forEach((row, idx) => {
            if (row.faculty_id !== currentFacultyId) {
                if (currentFacultyId !== null) {
                    report += '\n';
                }
                if (row.department !== currentDept) {
                    report += `\n## ${row.department} Department\n\n`;
                    currentDept = row.department;
                }
                report += `### ${row.faculty_name}\n`;
                menteeCount = 0;
                currentFacultyId = row.faculty_id;
            }
            
            menteeCount++;
            report += `${menteeCount}. **${row.student_name}**\n`;
            report += `   - Email: ${row.email}\n`;
            report += `   - Year: ${row.year}\n\n`;
        });

        // Write to file
        fs.writeFileSync('MENTEE_ASSIGNMENTS_DETAILED.md', report);
        
        console.log('✅ Report generated: MENTEE_ASSIGNMENTS_DETAILED.md');
        console.log(`\nTotal assignments: ${data.length}`);
        
        // Also print to console
        const [deptStats] = await db.query(`
            SELECT 
                f.department,
                COUNT(DISTINCT f.id) as faculty_count,
                COUNT(*) as assignment_count
            FROM mentee_assignments ma
            JOIN faculty f ON ma.faculty_id = f.id
            GROUP BY f.department
        `);

        console.log('\nDepartment Statistics:');
        deptStats.forEach(stat => {
            console.log(`  ${stat.department}: ${stat.faculty_count} faculty × ${stat.assignment_count / stat.faculty_count} mentees = ${stat.assignment_count} total assignments`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

generateDetailedReport();
