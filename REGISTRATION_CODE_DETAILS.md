# Event Registration - Code Implementation Details

## 1. Backend API Endpoint

### Location: `backend/routes/student.js`

```javascript
// ✅ Register student for an event
router.post('/:id/register-event', async (req, res) => {
  const { id } = req.params;
  const { event_id } = req.body;

  if (!event_id) {
    return res.json({ success: false, message: 'Event ID is required' });
  }

  try {
    // Get student details
    const [[student]] = await db.query(
      'SELECT id, name, email FROM students WHERE id = ?',
      [id]
    );

    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    // Check if student already registered for this event
    const [existing] = await db.query(
      'SELECT id FROM faculty_event_registrations WHERE student_id = ? AND event_id = ?',
      [id, event_id]
    );

    if (existing.length > 0) {
      return res.json({ 
        success: false, 
        message: 'You have already registered for this event' 
      });
    }

    // Get event details
    const [[event]] = await db.query(
      'SELECT * FROM faculty_events WHERE id = ?',
      [event_id]
    );

    if (!event) {
      return res.json({ success: false, message: 'Event not found' });
    }

    // Insert registration
    const result = await db.query(
      'INSERT INTO faculty_event_registrations (student_id, event_id, status) VALUES (?, ?, "registered")',
      [id, event_id]
    );

    res.json({
      success: true,
      message: `Successfully registered for ${event.event_name}!`,
      registration: {
        student_id: student.id,
        student_name: student.name,
        student_email: student.email,
        event_id: event.id,
        event_name: event.event_name,
        registration_status: 'registered'
      }
    });

  } catch (err) {
    console.error('Error registering for event:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});
```

**Validation Logic:**
1. ✅ Check if event_id provided
2. ✅ Get student from database
3. ✅ Prevent duplicate registrations
4. ✅ Get event details
5. ✅ Insert into database with status='registered'
6. ✅ Return success response with all details

---

## 2. Frontend Modal HTML

### Location: `frontend/student-events-workshops.html`

```html
<!-- Registration Modal -->
<div class="registration-modal-overlay" id="registrationModal">
    <div class="registration-modal">
        <div class="registration-modal-header">
            <h2>Register for Event</h2>
            <p>Confirm your participation</p>
        </div>

        <div class="success-message" id="successMessage">
            <i class="ri-check-line"></i>
            <strong>Successfully registered!</strong> You will receive a confirmation email shortly.
        </div>

        <div id="registrationContent">
            <div class="event-info-box">
                <div class="event-title" id="modalEventName">Workshop Name</div>
                <div class="event-details">
                    <div class="detail-item">
                        <i class="ri-calendar-event-line"></i>
                        <span id="modalEventDate">Jan 28, 2026</span>
                    </div>
                    <div class="detail-item">
                        <i class="ri-map-pin-line"></i>
                        <span id="modalEventLocation">Location</span>
                    </div>
                </div>
            </div>

            <div class="registration-form">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="studentName" disabled>
                </div>
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="studentEmail" disabled>
                </div>
            </div>

            <div class="registration-modal-footer">
                <button type="button" class="btn-cancel" onclick="closeRegistrationModal()">
                    Cancel
                </button>
                <button type="button" class="btn-register" id="confirmRegisterBtn" onclick="submitRegistration()">
                    <span class="loading-spinner" id="loadingSpinner"></span>
                    Yes, Register Me
                </button>
            </div>
        </div>
    </div>
</div>
```

---

## 3. CSS Animations & Styling

### Key Animations:

```css
/* Overlay fade-in animation */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* Modal slide-up animation */
@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(50px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Gradient border color shift */
@keyframes gradientShift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}

/* Loading spinner rotation */
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
```

### Modal Classes:

```css
.registration-modal-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 9999;
    justify-content: center;
    align-items: center;
}

.registration-modal-overlay.show {
    display: flex;
    animation: fadeIn 0.3s ease forwards;
}

.registration-modal {
    background: white;
    border-radius: 15px;
    padding: 40px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
```

---

## 4. JavaScript Functions

### Function 1: registerEvent(eventId)

```javascript
function registerEvent(eventId) {
    const studentId = localStorage.getItem('student_id');
    const studentName = localStorage.getItem('student_name');
    const studentEmail = localStorage.getItem('student_email');

    if (!studentId) {
        alert('Please log in to register for events.');
        return;
    }

    // Fetch event details
    fetch(`http://localhost:3000/api/student/${studentId}/events`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.events) {
                const event = data.events.find(e => e.id === eventId);
                if (event) {
                    // Store registration data
                    window.currentRegistration = {
                        eventId: event.id,
                        studentId: studentId,
                        eventName: event.event_name,
                        eventDate: new Date(event.event_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }),
                        eventLocation: event.location
                    };

                    // Populate modal
                    document.getElementById('modalEventName').textContent = event.event_name;
                    document.getElementById('modalEventDate').textContent = window.currentRegistration.eventDate;
                    document.getElementById('modalEventLocation').textContent = event.location;
                    document.getElementById('studentName').value = studentName || '';
                    document.getElementById('studentEmail').value = studentEmail || '';

                    // Show modal
                    document.getElementById('registrationModal').classList.add('show');
                    document.getElementById('successMessage').classList.remove('show');
                    document.getElementById('registrationContent').style.display = 'block';
                }
            }
        })
        .catch(err => console.error('Error fetching event:', err));
}
```

**Flow:**
1. Get student info from localStorage
2. Verify student is logged in
3. Fetch all events for the student
4. Find the selected event
5. Store event data in `window.currentRegistration`
6. Populate modal fields with event info
7. Show modal with animation

---

### Function 2: submitRegistration()

```javascript
function submitRegistration() {
    const studentId = localStorage.getItem('student_id');
    const btn = document.getElementById('confirmRegisterBtn');
    const spinner = document.getElementById('loadingSpinner');

    if (!window.currentRegistration) {
        alert('Error: Event details not found');
        return;
    }

    // Show loading state
    btn.disabled = true;
    spinner.style.display = 'inline-block';
    btn.textContent = 'Registering...';

    // Submit to backend
    fetch(`http://localhost:3000/api/student/${studentId}/register-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: window.currentRegistration.eventId })
    })
    .then(res => res.json())
    .then(data => {
        spinner.style.display = 'none';
        btn.textContent = 'Yes, Register Me';
        btn.disabled = false;

        if (data.success) {
            // Show success message
            document.getElementById('registrationContent').style.display = 'none';
            document.getElementById('successMessage').classList.add('show');

            // Auto-close after 2.5 seconds
            setTimeout(() => {
                closeRegistrationModal();
                loadWorkshops();
            }, 2500);
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(err => {
        spinner.style.display = 'none';
        btn.textContent = 'Yes, Register Me';
        btn.disabled = false;
        console.error('Registration error:', err);
        alert('Error registering for event. Please try again.');
    });
}
```

**Flow:**
1. Get student ID from localStorage
2. Disable button and show spinner
3. Send POST request to backend
4. Wait for response
5. If success:
   - Hide form
   - Show success message
   - Auto-close after 2.5 seconds
   - Reload workshop list
6. If error:
   - Show error message
   - Re-enable button

---

### Function 3: closeRegistrationModal()

```javascript
function closeRegistrationModal() {
    document.getElementById('registrationModal').classList.remove('show');
    window.currentRegistration = null;
}
```

**Flow:**
1. Remove 'show' class from modal (hides it)
2. Clear stored registration data

---

## 5. Database Table Creation

### Location: `backend/setup-registrations.js`

```javascript
CREATE TABLE IF NOT EXISTS faculty_event_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    event_id INT NOT NULL,
    status ENUM('registered','attended','cancelled') DEFAULT 'registered',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES faculty_events(id) ON DELETE CASCADE,
    UNIQUE KEY unique_registration (student_id, event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
```

**Features:**
- ✅ Auto-incrementing ID
- ✅ Foreign key to students table
- ✅ Foreign key to faculty_events table
- ✅ Status tracking (registered/attended/cancelled)
- ✅ Automatic timestamp
- ✅ Optional notes field
- ✅ UNIQUE constraint prevents duplicate registrations

---

## 6. Data Flow Diagram

```
Student clicks "Register Now"
    ↓
registerEvent(eventId) function triggered
    ↓
Check if student logged in (localStorage)
    ↓
Fetch event details from /api/student/:id/events
    ↓
Find event in response
    ↓
Store in window.currentRegistration
    ↓
Populate modal fields:
  - Event name, date, location
  - Student name, email (read-only)
    ↓
Show modal with slide-up animation
    ↓
User clicks "Yes, Register Me"
    ↓
submitRegistration() function triggered
    ↓
Show loading spinner
    ↓
Send POST /api/student/:id/register-event
    ↓
Backend validates and inserts into DB:
    ↓
INSERT INTO faculty_event_registrations
  (student_id, event_id, status)
  VALUES (5, 1, 'registered')
    ↓
Return success response with details
    ↓
Hide form, show success message
    ↓
Auto-close modal after 2.5 seconds
    ↓
Reload workshop list
```

---

## 7. Error Handling

### Frontend Errors:
- ✅ Not logged in → "Please log in to register"
- ✅ Network error → "Error registering for event"
- ✅ API error → Shows error message from backend

### Backend Errors:
- ✅ Missing event_id → "Event ID is required"
- ✅ Student not found → "Student not found"
- ✅ Duplicate registration → "You have already registered"
- ✅ Event not found → "Event not found"
- ✅ Database error → "Server error" + error message

---

## 8. Query Examples

### Check student registrations:
```sql
SELECT * FROM faculty_event_registrations 
WHERE student_id = 5;
```

### Check event registrations:
```sql
SELECT s.name, s.email, fer.registered_at
FROM faculty_event_registrations fer
JOIN students s ON fer.student_id = s.id
WHERE fer.event_id = 1;
```

### Count registrations:
```sql
SELECT COUNT(*) as total_registrations
FROM faculty_event_registrations
WHERE status = 'registered';
```

