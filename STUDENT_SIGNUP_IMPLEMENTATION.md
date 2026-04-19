# Student Signup & Approval System Implementation Guide

## Overview
This implementation adds a student self-registration system with admin approval workflow for the NEC Placement Portal.

## Features Implemented

### 1. Student Signup Form (Frontend)
**File:** `frontend/login-student.html`

**Changes:**
- Added dual-tab login/signup interface
- New tab switch functionality for seamless navigation
- Signup form fields:
  - Full Name
  - Email (college email)
  - Roll Number
  - Phone Number
  - Current Year (Dropdown: 1-4)
  - Department (Dropdown: CSE, ECE, EEE, MECH, CIVIL)
  - Campus Selection (NECN/NECG)

**Features:**
- Real-time form validation
- Campus-specific signup (NECN/NECG)
- Status messages for success/error feedback
- Auto-redirect to login tab after successful signup

---

### 2. Database Tables
**Files:** `create-pending-students-migration.sql` & `create-pending-students-table.sql`

**New Table:** `pending_students`
```sql
Columns:
- id (Primary Key)
- name VARCHAR(100)
- email VARCHAR(100) UNIQUE
- phone VARCHAR(20)
- roll_no VARCHAR(50) UNIQUE
- branch VARCHAR(50)
- year ENUM('1','2','3','4')
- status ENUM('pending', 'approved', 'rejected')
- created_at TIMESTAMP
- approved_at TIMESTAMP
- approved_by VARCHAR(100)
- rejection_reason TEXT
```

**Database Setup:**
- Table created in both `placement_portal2` (NECN) and `placement_portal3` (NECG)
- Each campus has independent pending students table
- Unique constraints on email and roll_no per campus

---

### 3. Backend API Endpoints

#### 3.1 Student Signup Endpoint
**Route:** `POST /api/student/signup`
**File:** `backend/routes/student.js`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@college.edu",
  "rollNo": "20CS001",
  "phone": "9876543210",
  "year": "3",
  "branch": "CSE",
  "college": "necn"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful! Your request is pending admin approval.",
  "student_id": 1
}
```

**Validation:**
- All fields required
- Email format validation
- Phone number minimum 10 digits
- Duplicate email/roll number check
- Campus-specific database routing

---

#### 3.2 Get Pending Students Endpoint
**Route:** `GET /api/admin/pending-students?campus=NECN`
**File:** `backend/routes/admin.js`

**Query Parameters:**
- `campus`: NECN or NECG (default: NECN)

**Response:**
```json
{
  "success": true,
  "students": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@college.edu",
      "phone": "9876543210",
      "roll_no": "20CS001",
      "branch": "CSE",
      "year": "3",
      "status": "pending",
      "created_at": "2026-04-01 10:30:00",
      "approved_at": null,
      "approved_by": null,
      "rejection_reason": null
    }
  ]
}
```

---

#### 3.3 Approve Student Endpoint
**Route:** `POST /api/admin/approve-student/:studentId`
**File:** `backend/routes/admin.js`

**Request Body:**
```json
{
  "campus": "NECN",
  "approvedBy": "Admin Name"
}
```

**Process:**
1. Retrieves pending student from pending_students table
2. Generates temporary password (8 characters)
3. Creates student account in students table with:
   - Hashed password
   - All signup information
4. Updates pending_students status to "approved"
5. Notes approval timestamp and admin name

**Response:**
```json
{
  "success": true,
  "message": "Student approved successfully!",
  "studentId": 15,
  "tempPassword": "abc123xyz"
}
```

---

#### 3.4 Reject Student Endpoint
**Route:** `POST /api/admin/reject-student/:studentId`
**File:** `backend/routes/admin.js`

**Request Body:**
```json
{
  "reason": "Invalid roll number format",
  "campus": "NECN"
}
```

**Process:**
1. Locates pending student record
2. Updates status to "rejected"
3. Stores rejection reason in database
4. Does NOT create student account

**Response:**
```json
{
  "success": true,
  "message": "Student request rejected"
}
```

---

### 4. Admin Approval Dashboard
**File:** `frontend/admin-approve-students.html`

**Features:**
- Displays all pending student registration requests
- Campus selection (NECN/NECG)
- Status filtering (All/Pending/Approved/Rejected)
- Detailed student information display:
  - Name, Email, Roll Number, Phone
  - Department, Year, Application Date
- Approve/Reject action buttons
- Optional rejection reason input
- Rejection reason display for rejected students
- Real-time list updates after action
- Empty state message when no students to display

**UI Elements:**
- Filter buttons for status (Pending, Approved, Rejected)
- Campus toggle (NECN/NECG)
- Student cards with comprehensive information
- Action buttons with hover effects
- Rejection modal dialog

---

### 5. Admin Sidebar Navigation
**File:** `frontend/admin-dashboard.html`

**Changes:**
- Added "Approve Students" link in admin sidebar
- Position: Between "Students" and "Opportunities"
- Icon: `ri-user-check-line`
- Path: `admin-approve-students.html`

**Sidebar Order:**
1. Dashboard
2. Students
3. **Approve Students** (NEW)
4. Opportunities
5. Placement Drives
6. Faculty
7. Reports
8. Add Admin

---

## Database Migration

### Execute SQL Scripts:

**1. For NECN Campus (placement_portal2):**
```bash
mysql -u root -p placement_portal2 < create-pending-students-migration.sql
```

**2. For NECG Campus (placement_portal3):**
```bash
mysql -u root -p placement_portal3 < create-pending-students-migration.sql
```

Or run the CREATE TABLE statements directly in MySQL client.

---

## User Flow

### Student Registration Flow
1. Student visits login page
2. Clicks "Sign Up" tab
3. Selects campus (NECN/NECG)
4. Fills signup form with details
5. Submits form
6. Data saved to `pending_students` table
7. Status: "PENDING" - awaiting admin approval
8. Student receives confirmation message
9. Redirected to login tab

### Admin Approval Flow
1. Admin logs in
2. Navigates to "Approve Students"
3. Selects campus filter
4. Reviews pending student requests
5. Can filter by status
6. For each student:
   - **Approve:** Creates account in `students` table with temporary password
   - **Reject:** Marks as rejected with optional reason
7. Approved students can now login with temporary password
8. Rejected students' data remains in pending_students for reference

---

## Field Mappings

### Signup Form → Database
| Frontend Field | Database Column | Type | Notes |
|---|---|---|---|
| Full Name | name | VARCHAR(100) | Required |
| Email | email | VARCHAR(100) | Unique, required |
| Roll Number | roll_no | VARCHAR(50) | Unique, required |
| Phone | phone | VARCHAR(20) | Required |
| Year | year | ENUM | 1-4, required |
| Department | branch | VARCHAR(50) | Required |
| Campus | N/A | N/A | Determines DB routing |

---

## Error Handling

### Student Signup Validation
- Empty field check: "All fields are required"
- Duplicate email: "Email or Roll Number already registered"
- Invalid email: "Please enter a valid email"
- Short phone: "Phone number must be at least 10 digits"
- Database error: "Email or Roll Number already exists"

### Admin Approval Errors
- Student not found: "Student not found or already processed"
- Duplicate on approval: "Email or Roll Number already exists"
- Database errors: "Server error: [error message]"

---

## API Response Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Bad request / validation error |
| 404 | Endpoint not found |
| 413 | File upload too large |
| 500 | Server error |

---

## Security Considerations

1. **Password Hashing:** All passwords are bcrypt hashed (10 rounds)
2. **Database Routing:** Campus-specific DB routing prevents cross-campus data access
3. **Unique Constraints:** Roll number and email unique per campus
4. **Admin Tracking:** All approvals logged with admin name and timestamp
5. **Temporary Passwords:** Generated for approved students, must change on first login

---

## Testing Checklist

- [ ] Test signup form validation (all fields required)
- [ ] Test email validation (format check)
- [ ] Test phone number validation (minimum 10 digits)
- [ ] Test duplicate email rejection
- [ ] Test duplicate roll number rejection
- [ ] Test signup for NECN campus
- [ ] Test signup for NECG campus
- [ ] Test data insertion into correct database
- [ ] Test admin approve functionality
- [ ] Test admin reject functionality
- [ ] Test rejection reason storage
- [ ] Test status filtering in admin dashboard
- [ ] Test campus switching in admin dashboard
- [ ] Test approved student login
- [ ] Test database isolation between campuses

---

## Future Enhancements

1. Email verification before approval
2. Automated emails to students (approval/rejection)
3. Bulk approval/rejection
4. Student documents verification (ID, enrollment certificate)
5. Auto-population of some fields from college database
6. SMS notifications
7. Approval analytics and reports
8. Multiple rejection feedback reasons (dropdown)
9. Pending requests expiry (auto-reject after 30 days)
10. Department-based routing/approval

---

## Support & Troubleshooting

### Issue: Pendingstudents table not found
**Solution:** Run the migration SQL script in both databases

### Issue: Signup fails with "Server error"
**Solution:** Check backend server logs, verify database connection

### Issue: Admin cannot see pending students
**Solution:** Verify admin is logged in, check campus selection matches signup campus

### Issue: Approved student cannot login
**Solution:** Verify student data exists in students table, check temporary password

---

## Files Modified/Created

### New Files
1. `frontend/admin-approve-students.html` - Admin approval dashboard
2. `create-pending-students-migration.sql` - Database migration script
3. `create-pending-students-table.sql` - Table creation script

### Modified Files
1. `frontend/login-student.html` - Added signup form and logic
2. `frontend/admin-dashboard.html` - Added sidebar link
3. `backend/routes/student.js` - Added signup endpoint
4. `backend/routes/admin.js` - Added approval endpoints

### No Changes Required
1. `backend/server.js` - Routes already configured
2. `backend/db.js` - Connection already available
3. `backend/db2.js` - Connection already available

---

## Endpoints Summary

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/student/signup` | Student self-registration |
| GET | `/api/admin/pending-students` | Get pending students list |
| POST | `/api/admin/approve-student/:id` | Approve student |
| POST | `/api/admin/reject-student/:id` | Reject student |
