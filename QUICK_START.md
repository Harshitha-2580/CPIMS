# QUICK START GUIDE

## 🚀 Implementation Steps (5 minutes)

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Add DOB and Phone Columns to Students Table
```bash
node add-dob-phone-columns.js
```

**Expected Output:**
```
Adding DOB and Phone columns to students table...

✓ Added dob column
✓ Added phone column

✓ Students table columns:
  - id (int)
  - name (varchar)
  - email (varchar)
  - password (varchar)
  - branch (varchar)
  - year (enum)
  - cgpa (decimal)
  - backlogs (int)
  - dob (date)
  - phone (varchar)
  - created_at (timestamp)

✅ Done!
```

### Step 3: Create Resumes Table
```bash
node create-resumes-table.js
```

**Expected Output:**
```
Creating resumes table...

✓ Resumes table created

✓ Resumes table columns:
  - id (int)
  - student_id (int)
  - resume_path (varchar)
  - version (int)
  - upload_date (timestamp)
  - is_latest (tinyint)

✅ Done!
```

### Step 4: Verify Upload Directory (Already Created)
```bash
# Directory already exists at:
uploads/resumes/
```

### Step 5: Restart Server
```bash
npm start
```

Output should show:
```
Server is running on http://localhost:3000
✅ Connected to MySQL database.
```

---

## ✅ Verification Checklist

After completing the steps above, verify:

- [ ] Database columns added (dob, phone)
- [ ] Resumes table created
- [ ] Server running on port 3000
- [ ] No errors in console

Test in browser:
- [ ] Visit student profile page
- [ ] See student icon instead of profile pic
- [ ] See DOB and Phone fields in Personal Info
- [ ] Click "Edit Personal Info" → edit DOB & Phone
- [ ] Click "Update Academic Info" → edit CGPA & upload resume

---

## 📁 Files Created/Modified

### NEW FILES:
```
✨ backend/add-dob-phone-columns.js
✨ backend/create-resumes-table.js
✨ frontend/student-academic-edit.html
✨ uploads/resumes/ (directory)
```

### MODIFIED FILES:
```
📝 frontend/student-profile.html
📝 frontend/student-profile-edit.html
📝 backend/routes/student.js
```

---

## 🎯 Key Features Implemented

### ✅ Personal Information
- ✨ Added DOB field
- ✨ Added Phone field
- 👤 Student icon instead of profile photo
- 📝 Dedicated edit form

### ✅ Academic Information
- 📊 CGPA management
- 📚 Backlogs tracking
- 📄 Resume upload & versioning
- 📁 Separate dedicated form

### ✅ Resume Management
- 📦 Resume storage in database
- 🔢 Version tracking (v1, v2, v3...)
- ✅ Latest resume flag
- 📅 Upload timestamp
- 🔒 5MB file size limit
- 📄 PDF only validation

---

## 🔗 User Navigation Flow

```
Student Profile (student-profile.html)
├── [Edit Personal Info] 
│   └─→ Edit Form (student-profile-edit.html)
│       ├── Name
│       ├── Email (readonly)
│       ├── Phone (NEW)
│       └── DOB (NEW)
│
└── [Update Academic Info] (NEW)
    └─→ Academic Form (student-academic-edit.html)
        ├── CGPA
        ├── Backlogs
        └── Resume Upload (NEW)
```

---

## 📊 Database Schema Summary

### Students Table (11 columns)
```sql
id, name, email, password, branch, year, 
cgpa, backlogs, dob (NEW), phone (NEW), created_at
```

### Resumes Table (NEW - 6 columns)
```sql
id, student_id, resume_path, version, 
upload_date, is_latest
```

---

## 🔌 API Endpoints

### New Endpoints:
- `POST /api/student/:id/update-academic` - Update academic info & upload resume
- `GET /api/student/:id/resume` - Get latest resume
- `GET /api/student/:id/resumes` - Get all resume versions

### Updated Endpoints:
- `GET /api/student/:id` - Now returns phone, dob, cgpa, backlogs

---

## 🚨 Troubleshooting

### Database Error: "Column not found"
```
Solution: Run add-dob-phone-columns.js again
```

### Upload Directory Missing
```
Solution: mkdir -p uploads/resumes
```

### Resume Upload Fails
```
Check:
1. File is PDF format
2. File size < 5MB
3. Directory exists and has write permissions
```

### "Cannot POST /api/student/:id/update-academic"
```
Check:
1. Server is running (npm start)
2. Backend routes loaded correctly
3. Check console for errors
```

---

## 📱 Mobile Compatibility

All forms are fully responsive:
- ✅ Mobile phones (320px+)
- ✅ Tablets (768px+)
- ✅ Desktop (1024px+)

---

## 🔐 Security Features

- ✅ PDF validation (file type & size)
- ✅ File size limit (5MB max)
- ✅ Database constraints (foreign keys)
- ✅ Resume version history (audit trail)
- ✅ Database type validation

---

## ✨ What Changed for Users

### Before:
```
❌ No DOB field
❌ No Phone field
❌ Profile photo circle
❌ Resume under "Placement Docs"
❌ No resume versioning
```

### After:
```
✅ DOB field added
✅ Phone field added
✅ Student icon (no photo)
✅ Resume under "Academic"
✅ Resume versioning (v1, v2, v3...)
✅ Dedicated academic info form
```

---

## 📞 Support

If you encounter any issues:

1. Check console logs in browser (F12)
2. Check server console for errors
3. Verify database migrations ran
4. Ensure directories exist and are writable
5. Check file permissions on upload directories

---

**Status**: ✅ Ready to Deploy
**Time to Setup**: ~5 minutes
**Restart Required**: Yes (npm start)

---

For detailed documentation, see:
- `STUDENT_PROFILE_UPDATE_SUMMARY.md` - Full technical details
- `VISUAL_CHANGES_GUIDE.md` - Before/after comparisons
