# Implementation Details: Dynamic Faculty Profile

## What Was Changed

### Before (Static Data)
```javascript
// BEFORE: Hardcoded defaults with localStorage fallback
const profileData = {
    name: localStorage.getItem('faculty_name') || 'Dr. John Smith',
    email: localStorage.getItem('faculty_email') || 'john.smith@necn.ac.in',
    phone: localStorage.getItem('faculty_phone') || '+91 9876543210',
    designation: localStorage.getItem('faculty_designation') || 'Associate Professor',
    department: localStorage.getItem('faculty_department') || 'Computer Science & Engineering',
    qualification: localStorage.getItem('faculty_qualification') || 'Ph.D. in Computer Science',
    mentees: '60',      // HARDCODED
    placedCount: '18',  // HARDCODED
    eventsCount: '8'    // HARDCODED
};

// Profile save: Only to localStorage
localStorage.setItem('faculty_name', updatedData.name);
localStorage.setItem('faculty_email', updatedData.email);
// ... more localStorage saves
```

### After (Dynamic Data)
```javascript
// AFTER: Pure API-driven with no defaults
async function loadProfileData() {
    const facultyId = localStorage.getItem('faculty_id');
    
    // Fetch profile from database
    const profileRes = await fetch(`/api/faculty/profile/${facultyId}`);
    const profileData = await profileRes.json();
    const faculty = profileData.faculty; // Real DB data
    
    // Fetch stats from database
    const statsRes = await fetch(`/api/faculty/stats/${facultyId}`);
    const statsData = await statsRes.json();
    
    // Use real values - no defaults
    const mentees = statsData.mentees || '0';
    const placedCount = statsData.opportunities || '0';
    const eventsCount = statsData.events || '0';
    
    // Populate with real data
    document.getElementById('displayName').textContent = faculty.name;
    // ... update rest of UI
}

// Profile save: API + Database
const response = await fetch(`/api/faculty/profile/${facultyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData)
});
```

## Code Changes in Detail

### 1. HTML Placeholders Updated
**File:** `frontend/faculty-profile.html`

#### Profile Header Section
```html
<!-- BEFORE -->
<h2 id="profileName">Dr. John Smith</h2>
<p id="profileDesignation">Associate Professor</p>

<!-- AFTER -->
<h2 id="profileName">Loading...</h2>
<p id="profileDesignation">Loading...</p>
```

#### Personal Details Section
```html
<!-- BEFORE -->
<div class="profile-value" id="displayName">Dr. John Smith</div>
<div class="profile-value" id="displayEmail">john.smith@necn.ac.in</div>
<div class="profile-value" id="displayPhone">+91 9876543210</div>

<!-- AFTER -->
<div class="profile-value" id="displayName">Loading...</div>
<div class="profile-value" id="displayEmail">Loading...</div>
<div class="profile-value" id="displayPhone">Loading...</div>
```

#### Statistics Section
```html
<!-- BEFORE -->
<div class="stat-number" id="statMentees">60</div>
<div class="stat-number" id="statSelected">18</div>
<div class="stat-number" id="statEvents">8</div>

<!-- AFTER -->
<div class="stat-number" id="statMentees">-</div>
<div class="stat-number" id="statSelected">-</div>
<div class="stat-number" id="statEvents">-</div>
```

### 2. JavaScript Function Replacement

#### loadProfileData() - Complete Rewrite
```javascript
// OLD APPROACH: ~70 lines with localStorage and hardcoded defaults
// NEW APPROACH: ~50 lines with two API calls

async function loadProfileData() {
    const facultyId = localStorage.getItem('faculty_id');
    
    if (!facultyId) {
        console.warn('No faculty ID found. Redirecting to login...');
        window.location.href = 'login-faculty.html';
        return;
    }

    try {
        // Call 1: Get faculty profile
        const profileRes = await fetch(`/api/faculty/profile/${facultyId}`);
        const profileData = await profileRes.json();

        if (!profileData.success || !profileData.faculty) {
            throw new Error('Failed to load profile');
        }

        const faculty = profileData.faculty;

        // Call 2: Get faculty statistics
        const statsRes = await fetch(`/api/faculty/stats/${facultyId}`);
        const statsData = await statsRes.json();

        // Extract stats with safe defaults
        const mentees = statsData.success ? (statsData.mentees || 0).toString() : '0';
        const placedCount = statsData.success ? (statsData.opportunities || 0).toString() : '0';
        const eventsCount = statsData.success ? (statsData.events || 0).toString() : '0';

        // Update all display elements
        document.getElementById('profileName').textContent = faculty.name || 'Faculty';
        document.getElementById('profileDesignation').textContent = faculty.designation || 'Faculty Member';
        document.getElementById('displayName').textContent = faculty.name || 'N/A';
        document.getElementById('displayEmail').textContent = faculty.email || 'N/A';
        document.getElementById('displayPhone').textContent = faculty.phone || 'N/A';
        document.getElementById('displayDesignation').textContent = faculty.designation || 'N/A';
        document.getElementById('displayDepartment').textContent = faculty.department || 'N/A';
        document.getElementById('displayQualification').textContent = faculty.qualification || 'N/A';
        document.getElementById('displayMentees').textContent = mentees;
        document.getElementById('statMentees').textContent = mentees;
        document.getElementById('statSelected').textContent = placedCount;
        document.getElementById('statEvents').textContent = eventsCount;

        // Populate edit form with real data
        document.getElementById('editName').value = faculty.name || '';
        document.getElementById('editEmail').value = faculty.email || '';
        document.getElementById('editPhone').value = faculty.phone || '';
        document.getElementById('editDesignation').value = faculty.designation || '';
        document.getElementById('editDepartment').value = faculty.department || '';
        document.getElementById('editQualification').value = faculty.qualification || '';

    } catch (err) {
        console.error('Error loading profile data:', err);
        alert('Failed to load profile data. Please try again later.');
    }
}
```

#### Profile Save - Complete Rewrite
```javascript
// OLD: Save to localStorage only
document.getElementById('editProfileForm').addEventListener('submit', function(e) {
    e.preventDefault();
    localStorage.setItem('faculty_name', document.getElementById('editName').value);
    localStorage.setItem('faculty_email', document.getElementById('editEmail').value);
    // ... more saves
    loadProfileData();
});

// NEW: Save to database via API
document.getElementById('editProfileForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const facultyId = localStorage.getItem('faculty_id');
    
    if (!facultyId) {
        alert('Faculty ID not found. Please log in again.');
        return;
    }

    const updatedData = {
        name: document.getElementById('editName').value,
        phone: document.getElementById('editPhone').value,
        designation: document.getElementById('editDesignation').value,
        department: document.getElementById('editDepartment').value,
        qualification: document.getElementById('editQualification').value
    };

    try {
        // Send to backend API
        const response = await fetch(`/api/faculty/profile/${facultyId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        const result = await response.json();

        if (result.success) {
            // Reload from database
            await loadProfileData();
            toggleEditMode();
            alert('Profile updated successfully!');
        } else {
            alert('Failed to update profile: ' + (result.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error updating profile:', err);
        alert('Error updating profile. Please try again.');
    }
});
```

## Removed Code Sections

### localStorage-based profile defaults
- 30+ lines of localStorage.getItem() with hardcoded fallbacks
- All "Dr. John Smith" type defaults
- localStorage save/update logic

### Mock data handling
- No more fallback data when API unavailable
- Proper error handling instead

## No Changes to These Files

✅ `frontend/faculty-applications.html` - Already fully dynamic
✅ `frontend/faculty-dashboard.html` - Already fully dynamic
✅ `frontend/faculty-events.html` - No static data
✅ `frontend/faculty-materials.html` - No static data
✅ `backend/routes/faculty.js` - API endpoints already in place
✅ Database schema - No changes needed

## API Contract

### Request: GET /api/faculty/profile/:facultyId
```javascript
fetch('/api/faculty/profile/1')
```

### Response: Faculty Profile
```json
{
    "success": true,
    "faculty": {
        "id": 1,
        "faculty_id": "NECN_FAC_001",
        "name": "Dr. Priya Sharma",
        "email": "priya@necn.ac.in",
        "phone": "9876543211",
        "designation": "Associate Professor",
        "department": "Computer Science",
        "qualification": "Ph.D. in CS",
        "profile_image": null,
        "created_at": "2024-01-01T10:00:00Z",
        "last_active": "2024-01-27T15:30:00Z"
    }
}
```

### Request: PUT /api/faculty/profile/:facultyId
```javascript
fetch('/api/faculty/profile/1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        name: "Dr. Priya Sharma",
        phone: "9876543211",
        designation: "Associate Professor",
        department: "Computer Science",
        qualification: "Ph.D. in CS"
    })
})
```

### Response: Update Confirmation
```json
{
    "success": true,
    "message": "Profile updated successfully"
}
```

## Error Handling

Added proper error handling:
```javascript
try {
    const response = await fetch(`/api/faculty/profile/${facultyId}`);
    const data = await response.json();
    
    if (!data.success || !data.faculty) {
        throw new Error('Failed to load profile');
    }
    
    // Process data
} catch (err) {
    console.error('Error:', err);
    alert('Failed to load profile data. Please try again later.');
    // Could redirect to login or show offline mode
}
```

## Benefits of This Change

1. **Real-time Data**: Always shows current database values
2. **Data Integrity**: No duplication or sync issues
3. **Scalability**: Works for any faculty data without code changes
4. **Maintainability**: Clear separation between API calls and UI updates
5. **Debugging**: Can easily trace data flow from database to UI
6. **Security**: No sensitive data hardcoded in frontend

## Future Enhancements

Potential improvements:
- [ ] Add loading spinner during API calls
- [ ] Implement data caching
- [ ] Add retry logic for failed API calls
- [ ] Show last sync timestamp
- [ ] Add optimistic updates (update UI before API completes)
- [ ] Implement debouncing for rapid edits
