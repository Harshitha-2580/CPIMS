# Faculty Applications Module - Documentation

## Overview
The faculty applications module allows faculty members to monitor their mentees' activities including:
- **Drive Applications**: Track which mentees applied for placement/internship opportunities
- **Event Registrations**: See which mentees registered for technical events or workshops

## Features Implemented

### 1. **Filter Section**
The application uses a comprehensive filter system that allows faculty to filter by:

#### Available Filters:
- **Select Mentee**: Dropdown to filter by specific mentee
- **Activity Type**: 
  - All Activities (default)
  - Drive Applications
  - Event Registrations
- **Status**: 
  - Applied, Shortlisted, Selected, Rejected (for applications)
  - Registered, Attended, Cancelled (for events)
- **Date Range**: 
  - From Date
  - To Date

#### Filter Actions:
- **Apply Filters**: Applies selected filters to the data
- **Reset**: Clears all filters and shows all activities

### 2. **View Modes**

#### Card View (Default)
- Displays activities as individual cards
- Shows key information in an organized layout:
  - Type (Drive Application or Event Registration)
  - Mentee Name
  - Email
  - Company/Event Name
  - Date of Activity
  - Status Badge (color-coded)
- Clean, modern UI with hover effects

#### Table View
- Displays activities in a tabular format
- Columns: Type, Mentee Name, Title, Company/Event, Date, Status
- Easy to scan and compare multiple records
- Responsive design for mobile devices

### 3. **Status Badges**
Color-coded status indicators:
- **Applied/Registered**: Blue (#e3f2fd)
- **Shortlisted**: Green (#e8f5e9)
- **Selected/Attended**: Green (#4caf50)
- **Rejected/Cancelled**: Red (#ffebee)

### 4. **Mentee Dropdown**
- Automatically populated from the database
- Shows mentee name and email for easy identification
- "All Mentees" option to view all activities

## Backend API Endpoints

### 1. **Get Mentees**
```
GET /api/faculty/mentees/:faculty_id
```
**Response:**
```json
{
  "success": true,
  "mentees": [
    {
      "id": 1,
      "name": "Arjun Verma",
      "email": "arjun.verma@final.student.com",
      "branch": "CSE",
      "year": "4"
    }
  ],
  "count": 4
}
```

### 2. **Get Mentees Activities**
```
GET /api/faculty/mentees-activities/:faculty_id
```
**Response:**
```json
{
  "success": true,
  "activities": [
    {
      "type": "application",
      "id": 1,
      "student_id": 101,
      "student_name": "Arjun Verma",
      "student_email": "arjun.verma@final.student.com",
      "title": "TCS Ninja Program",
      "company_name": "TCS",
      "status": "applied",
      "date": "2026-01-20T10:30:00Z"
    },
    {
      "type": "event",
      "id": 1,
      "student_id": 103,
      "student_name": "Rohan Gupta",
      "student_email": "rohan.gupta@final.student.com",
      "title": "Smart India Hackathon",
      "event_name": "Smart India Hackathon",
      "status": "registered",
      "date": "2026-01-15T14:20:00Z"
    }
  ],
  "count": {
    "applications": 2,
    "eventRegistrations": 1,
    "total": 3
  }
}
```

### 3. **Filter Mentees Activities**
```
POST /api/faculty/mentees-activities/:faculty_id/filter
```
**Request Body:**
```json
{
  "mentee_id": 101,
  "activity_type": "application",
  "status": "applied",
  "from_date": "2026-01-01",
  "to_date": "2026-01-31"
}
```

### 4. **Get Mentee Statistics**
```
GET /api/faculty/mentee/:mentee_id/stats
```
**Response:**
```json
{
  "success": true,
  "student": {
    "id": 101,
    "name": "Arjun Verma",
    "email": "arjun.verma@final.student.com",
    "branch": "CSE",
    "year": "4"
  },
  "applicationStats": [
    { "status": "applied", "count": 5 },
    { "status": "shortlisted", "count": 2 }
  ],
  "eventStats": [
    { "status": "registered", "count": 3 }
  ],
  "recentActivities": []
}
```

## Frontend Implementation

### File Location
`frontend/faculty-applications.html`

### Key Functions

#### 1. **initializePage()**
- Checks if faculty is logged in
- Loads mentees and activities on page load

#### 2. **loadMentees()**
- Fetches mentees from backend
- Populates dropdown filter

#### 3. **loadAllActivities()**
- Fetches all activities for the faculty's mentees
- Falls back to sample data if API fails
- Populates status filter

#### 4. **applyFilters()**
- Filters data based on selected criteria
- Updates both card and table views

#### 5. **displayCardView() / displayTableView()**
- Renders data in card or table format
- Updates result count

## Sample Data Structure

### Application Record
```javascript
{
  type: 'application',
  id: 1,
  student_id: 101,
  student_name: 'Arjun Verma',
  student_email: 'arjun.verma@final.student.com',
  title: 'TCS Ninja Program',
  company_name: 'TCS',
  status: 'applied',
  date: '2026-01-20'
}
```

### Event Registration Record
```javascript
{
  type: 'event',
  id: 1,
  student_id: 103,
  student_name: 'Rohan Gupta',
  student_email: 'rohan.gupta@final.student.com',
  title: 'Smart India Hackathon',
  event_name: 'Smart India Hackathon',
  status: 'registered',
  date: '2026-01-15'
}
```

## User Workflow

1. **Faculty Login** → Navigates to Dashboard
2. **Click Applications** → Opens Applications Module
3. **View All Activities** → Card view shows all mentees' activities
4. **Apply Filters** → Select specific criteria
5. **Switch Views** → Toggle between card and table view
6. **Reset Filters** → View all data again

## Responsive Design
- Mobile-optimized filters (stacked layout)
- Touch-friendly buttons
- Responsive tables with horizontal scroll
- Adaptive card layouts

## Error Handling
- Graceful fallback to sample data if API fails
- "No results found" message with helpful icon
- Console logging for debugging
- Session validation (redirects to login if not authenticated)

## Future Enhancements
1. Export to CSV/PDF
2. Email notifications for status changes
3. Direct messaging with mentees
4. Bulk actions (e.g., bulk status update)
5. Analytics dashboard for mentee performance
6. Integration with calendar for event tracking
