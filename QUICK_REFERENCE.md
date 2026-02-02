# Faculty Applications Module - Quick Reference Guide

## 🎯 What Faculty Can Do Now

### View Mentees' Activities
Faculty can now track:
1. **Which mentees applied for drives** (with application status)
2. **Which mentees registered for events** (with registration status)

### Filter Options (No Direct Display - Filter First!)
The module doesn't show data directly. Faculty must:
1. Select filters from the filter panel
2. Click "Apply Filters" button
3. Then view the filtered results

### Available Filters:
1. **Select Mentee** - Choose one mentee or all
2. **Activity Type** - Applications, Events, or All
3. **Status** - Applied, Shortlisted, Selected, Rejected (for apps) or Registered, Attended, Cancelled (for events)
4. **Date Range** - From Date to To Date

---

## 📊 Filter Examples

### Example 1: See All Applications
```
Mentee: All Mentees
Activity Type: Drive Applications
Status: (any)
Date: (any)
→ Shows all mentees' drive applications
```

### Example 2: Check Specific Mentee's Activity
```
Mentee: Arjun Verma
Activity Type: All Activities
Status: (any)
Date: (any)
→ Shows everything Arjun applied for and registered for
```

### Example 3: Find All Selected Candidates
```
Mentee: All Mentees
Activity Type: Drive Applications
Status: Selected
Date: (any)
→ Shows all mentees who got selected
```

### Example 4: See Event Registrations This Month
```
Mentee: All Mentees
Activity Type: Event Registrations
Status: (any)
Date Range: 2026-01-01 to 2026-01-31
→ Shows all mentees who registered for events this month
```

---

## 🖼️ View Modes

### Card View (Default)
```
┌─────────────────────────────┐
│ 📋 Drive Application        │
│ TCS Ninja Program           │
├─────────────────────────────┤
│ Mentee Name: Arjun Verma    │
│ Email: arjun.verma@...      │
│ Company: TCS                │
│ Date: 1/20/2026             │
│ Status: [Applied]           │
└─────────────────────────────┘
```

### Table View
```
Type | Mentee | Title | Company | Date | Status
-----|--------|-------|---------|------|--------
App  | Arjun  | Prog  | TCS     | 1/20 | Applied
Event| Rohan  | Hack  | Event   | 1/15 | Reg
```

---

## 🔄 Filter Workflow

```
┌─────────────────────────────────────────┐
│ 1. LOAD PAGE                            │
│ - Check if logged in ✓                  │
│ - Load all mentees ✓                    │
│ - Load all activities ✓                 │
│ - Display all in Card View ✓            │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 2. APPLY FILTERS                        │
│ - Select Mentee (optional)              │
│ - Select Activity Type (optional)       │
│ - Select Status (optional)              │
│ - Select Date Range (optional)          │
│ - Click "Apply Filters"                 │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 3. VIEW RESULTS                         │
│ - Results update instantly              │
│ - Shows result count                    │
│ - Switch Card ↔ Table view              │
│ - Results are sorted by date            │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 4. RESET OR ADJUST FILTERS              │
│ - Click "Reset" to clear all            │
│ - Or adjust and apply again             │
└─────────────────────────────────────────┘
```

---

## 📋 Status Indicators

### Application Statuses (Color Codes):
- **Applied** 🔵 Blue - Just applied, waiting for updates
- **Shortlisted** 🟢 Green - Moved to next round
- **Selected** 🟢 Green (darker) - Got the job/internship
- **Rejected** 🔴 Red - Application rejected

### Event Statuses (Color Codes):
- **Registered** 🔵 Blue - Registered for event
- **Attended** 🟢 Green - Attended the event
- **Cancelled** 🔴 Red - Registration cancelled

---

## 🎨 UI Features

### Header
```
Mentees Applications & Events
Track your mentees' drive applications and event registrations
```

### Filter Section
- Clean white background
- Organized grid layout
- All filters visible at once
- Apply and Reset buttons

### Results Section
- Shows total count of results
- Toggle between Card and Table views
- No results message with helpful icon
- Responsive design

### Status Badges
- Color-coded for quick identification
- Uppercase text for clarity
- Padding and rounded corners for polish

---

## 💾 Data Behind the Scenes

### When You Load:
Backend fetches:
1. List of mentees assigned to you from `mentee_assignments` table
2. Their applications from `applications` table + `opportunities` table
3. Their event registrations from `faculty_event_registrations` table + `faculty_events` table

### When You Apply Filters:
Frontend filters are applied instantly:
1. Mentee filter checks `student_id`
2. Activity type filter checks `type` field
3. Status filter checks `status` field
4. Date filters check `date` field

---

## 🚀 Key Differences from Previous Version

| Feature | Before | Now |
|---------|--------|-----|
| **Filters** | Basic search only | 5 advanced filters |
| **Mentee Filter** | None | Dropdown list |
| **Activity Types** | All mixed | Separated (app vs event) |
| **Date Filtering** | None | From/To date range |
| **View Modes** | Table only | Card + Table |
| **Status Colors** | None | Color-coded |
| **Visual Design** | Basic | Modern, professional |
| **Mobile Support** | Limited | Full responsive |

---

## 🎓 Common Tasks

### Task: "Show me all my mentees' recent applications"
1. Activity Type: Drive Applications
2. Click Apply Filters
3. Done! ✓

### Task: "Which mentee got selected?"
1. Activity Type: Drive Applications
2. Status: Selected
3. Click Apply Filters
4. Done! ✓

### Task: "Check Arjun's progress"
1. Select Mentee: Arjun Verma
2. Click Apply Filters
3. Switch to Table View for comparison
4. Done! ✓

### Task: "Events this month"
1. Activity Type: Event Registrations
2. From Date: Start of month
3. To Date: End of month
4. Click Apply Filters
5. Done! ✓

---

## ⚙️ Technical Details

### Frontend Files
- Location: `frontend/faculty-applications.html`
- Framework: Vanilla JavaScript + Bootstrap 5
- No external dependencies needed
- Responsive CSS with media queries

### Backend API Endpoints
1. `GET /api/faculty/mentees/:faculty_id`
2. `GET /api/faculty/mentees-activities/:faculty_id`
3. `POST /api/faculty/mentees-activities/:faculty_id/filter`
4. `GET /api/faculty/mentee/:mentee_id/stats`

### Database Tables Used
- `mentee_assignments` - Faculty-Student mapping
- `students` - Student info
- `applications` - Drive applications
- `opportunities` - Drive details
- `faculty_event_registrations` - Event registrations
- `faculty_events` - Event details

---

## 🔐 Security Features

✅ Faculty can only see their own mentees
✅ Faculty ID fetched from localStorage (session-based)
✅ Backend validates faculty ownership before returning data
✅ Logout clears session

---

## 📱 Responsive Design

### Desktop
- Full filter panel visible
- Side-by-side layout
- Multiple columns in table

### Tablet
- Stacked filters
- Optimized spacing
- Single column table

### Mobile
- Vertical filter stack
- Full-width buttons
- Vertical table scroll
- Touch-friendly interface

---

## 🎯 Success Indicators

✅ Faculty can view all mentees' applications
✅ Faculty can view all mentees' event registrations  
✅ Faculty can filter by mentee name
✅ Faculty can filter by activity type
✅ Faculty can filter by status
✅ Faculty can filter by date range
✅ Faculty can switch between card and table views
✅ Faculty can reset filters
✅ Results update instantly
✅ Mobile responsive
✅ Graceful error handling

---

**Ready to Use!** Navigate to `faculty-applications.html` after logging in as faculty.
