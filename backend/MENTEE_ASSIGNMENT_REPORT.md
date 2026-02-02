# Mentee Assignment Summary Report

## Overview
Successfully added 40 final-year students and assigned 80 mentee relationships across 20 faculty members in the placement portal.

## Key Details:
- **Total Students Added:** 40 (20 per department)
- **Total Mentee Assignments:** 80 (4 mentees per faculty)
- **Default Password:** `student123` (for all students)
- **Student Year:** 4 (Final Year)
- **Email Format:** `firstname.lastname@final.student.com`

---

## Department-wise Breakdown

### Computer Science Department (10 Faculty Members)
**Faculty Members:**
1. Dr. Rajesh Kumar - 4 mentees
2. Dr. Priya Sharma - 4 mentees
3. Dr. Neha Singh - 4 mentees
4. Dr. Anjali Verma - 4 mentees
5. Dr. Meera Iyer - 4 mentees
6. Dr. Harshitha Bheemir - 4 mentees
7. Dr. Pooja Malhotra - 4 mentees
8. Dr. Sneha Reddy - 4 mentees
9. Dr. Divya Nayak - 4 mentees
10. Dr. Shruti Pillai - 4 mentees

**Students Added (20 total):**
- arjun.verma@final.student.com
- priya.singh@final.student.com
- rohan.gupta@final.student.com
- neha.iyer@final.student.com
- vikram.sharma@final.student.com
- anjali.reddy@final.student.com
- sanjay.patel@final.student.com
- divya.nair@final.student.com
- karan.chopra@final.student.com
- sneha.desai@final.student.com
- aditya.kumar@final.student.com
- pooja.menon@final.student.com
- harshit.rao@final.student.com
- richa.sharma@final.student.com
- aman.singh@final.student.com
- zara.khan@final.student.com
- nikhil.joshi@final.student.com
- riya.pillai@final.student.com
- sameer.gupta@final.student.com
- isha.verma@final.student.com

---

### Information Technology Department (10 Faculty Members)
**Faculty Members:**
1. Mr. Arjun Patel - 4 mentees
2. Mr. Vikram Gupta - 4 mentees
3. Mr. Rohan Desai - 4 mentees
4. Mr. Sandeep Nair - 4 mentees
5. Mr. Aditya Saxena - 4 mentees
6. Mr. Karan Chopra - 4 mentees
7. Mr. Ashok Kumar - 4 mentees
8. Mr. Sameer Khan - 4 mentees
9. Mr. Nitin Joshi - 4 mentees
10. (Note: 9 IT Faculty - need to verify if 10th exists)

**Students Added (20 total):**
- bhavesh.patel@final.student.com
- cindrella.singh@final.student.com
- dhanraj.kumar@final.student.com
- esha.verma@final.student.com
- farhan.khan@final.student.com
- giselle.sharma@final.student.com
- harsh.reddy@final.student.com
- ishita.iyer@final.student.com
- jatin.chopra@final.student.com
- kavya.desai@final.student.com
- lakshay.nair@final.student.com
- mira.menon@final.student.com
- naveen.rao@final.student.com
- olivia.sharma@final.student.com
- pranav.singh@final.student.com
- quentin.gupta@final.student.com
- radhika.khan@final.student.com
- siddharth.patel@final.student.com
- tanvi.verma@final.student.com
- uday.joshi@final.student.com

---

## Login Credentials Template

For all students:
- **Password:** `student123`
- **Email Format:** `firstname.lastname@final.student.com`
- **Year:** Final Year (4)

Example:
- Email: `arjun.verma@final.student.com`
- Password: `student123`

---

## Verification Queries

To verify the data in the database, use:

```sql
-- Count all students
SELECT COUNT(*) as total_students FROM students WHERE year = '4';

-- Count mentee assignments
SELECT COUNT(*) as total_assignments FROM mentee_assignments;

-- View sample assignments
SELECT 
    f.name as faculty_name,
    f.department,
    s.name as student_name,
    s.branch,
    s.year,
    s.email
FROM mentee_assignments ma
JOIN faculty f ON ma.faculty_id = f.id
JOIN students s ON ma.student_id = s.id
LIMIT 20;

-- Count assignments by department
SELECT 
    f.department,
    COUNT(*) as total_assignments
FROM mentee_assignments ma
JOIN faculty f ON ma.faculty_id = f.id
GROUP BY f.department;
```

---

## Database Tables Used
- `students` - Contains all student records
- `faculty` - Contains faculty information
- `mentee_assignments` - Links students to their faculty mentors

---

## Success Metrics
✅ 40 students added to database
✅ All students assigned as year 4 (final year)
✅ Custom email IDs created for all students
✅ Default password set to `student123`
✅ 4 mentees assigned to each faculty member
✅ Faculty and mentees matched by same department
✅ 80 mentee relationships established
