const db = require('./db');

async function addSampleOpportunities() {
  try {
    console.log('Adding sample placements and internships...\n');

    // Add sample placements
    const placements = [
      {
        company_name: 'Google India',
        job_role: 'Software Engineer',
        salary_package: '15 LPA',
        eligible_branches: 'CSE,ECE',
        min_cgpa: 7.5,
        due_date: '2026-02-28',
        description: 'Google is hiring Software Engineers for their Bangalore office.',
        apply_link: 'https://careers.google.com'
      },
      {
        company_name: 'Microsoft India',
        job_role: 'Data Engineer',
        salary_package: '18 LPA',
        eligible_branches: 'CSE',
        min_cgpa: 8.0,
        due_date: '2026-03-15',
        description: 'Microsoft is seeking Data Engineers for cloud solutions.',
        apply_link: 'https://careers.microsoft.com'
      },
      {
        company_name: 'Amazon India',
        job_role: 'Full Stack Developer',
        salary_package: '16 LPA',
        eligible_branches: 'CSE,ECE',
        min_cgpa: 7.0,
        due_date: '2026-02-20',
        description: 'Amazon is recruiting Full Stack Developers.',
        apply_link: 'https://amazon.jobs'
      },
      {
        company_name: 'TCS',
        job_role: 'Software Developer',
        salary_package: '6 LPA',
        eligible_branches: 'CSE,ECE,CIVIL,EEE,MECH',
        min_cgpa: 6.0,
        due_date: '2026-03-01',
        description: 'TCS is hiring for various IT profiles.',
        apply_link: 'https://tcs.com/careers'
      }
    ];

    for (const placement of placements) {
      await db.query(
        'INSERT INTO placements (company_name, job_role, salary_package, eligible_branches, min_cgpa, due_date, description, apply_link, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)',
        [placement.company_name, placement.job_role, placement.salary_package, placement.eligible_branches, placement.min_cgpa, placement.due_date, placement.description, placement.apply_link]
      );
      console.log('✓ Added placement:', placement.company_name);
    }

    // Add sample internships
    const internships = [
      {
        company_name: 'Flipkart',
        role: 'Product Engineering Intern',
        internship_type: 'paid',
        stipend: '50000',
        duration: '6 months',
        eligible_branches: 'CSE,ECE',
        min_cgpa: 7.0,
        due_date: '2026-02-25',
        description: 'Flipkart is offering internship in product engineering.',
        apply_link: 'https://flipkart.com/careers'
      },
      {
        company_name: 'HackerRank',
        role: 'Full Stack Developer Intern',
        internship_type: 'paid',
        stipend: '45000',
        duration: '3 months',
        eligible_branches: 'CSE',
        min_cgpa: 7.5,
        due_date: '2026-03-10',
        description: 'HackerRank is hiring interns for full stack development.',
        apply_link: 'https://hackerrank.com/careers'
      },
      {
        company_name: 'Accenture',
        role: 'Technology Analyst Intern',
        internship_type: 'paid',
        stipend: '35000',
        duration: '4 months',
        eligible_branches: 'CSE,ECE,EEE',
        min_cgpa: 6.5,
        due_date: '2026-02-28',
        description: 'Accenture is recruiting for Technology Analyst internship.',
        apply_link: 'https://accenture.com/careers'
      },
      {
        company_name: 'Cisco',
        role: 'Network Engineering Intern',
        internship_type: 'unpaid',
        stipend: null,
        duration: '2 months',
        eligible_branches: 'ECE,EEE',
        min_cgpa: 7.0,
        due_date: '2026-03-05',
        description: 'Cisco is offering network engineering internship.',
        apply_link: 'https://cisco.com/careers'
      }
    ];

    for (const internship of internships) {
      await db.query(
        'INSERT INTO internships (company_name, role, internship_type, stipend, duration, eligible_branches, min_cgpa, due_date, description, apply_link, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)',
        [internship.company_name, internship.role, internship.internship_type, internship.stipend, internship.duration, internship.eligible_branches, internship.min_cgpa, internship.due_date, internship.description, internship.apply_link]
      );
      console.log('✓ Added internship:', internship.company_name);
    }

    console.log('\n✅ All sample opportunities added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample data:', error.message);
    process.exit(1);
  }
}

addSampleOpportunities();
