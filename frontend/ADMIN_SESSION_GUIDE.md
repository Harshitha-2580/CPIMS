# Admin Session Manager - Usage Guide

## Overview
The new Admin Session Manager supports **multiple admins logged in from the same browser** without overwriting each other's data.

## How It Works

### Storage Structure
```javascript
// Stores all logged-in admins keyed by their ID
localStorage.admin_sessions = {
  "admin1": { user: {...}, privileges: {...}, loginTime: "..." },
  "admin2": { user: {...}, privileges: {...}, loginTime: "..." },
  ...
}

// Tracks the currently active admin
localStorage.current_admin_id = "admin1"
```

## Usage

### 1. Include the Manager
Add this to your HTML files:
```html
<script src="assets/js/admin-session-manager.js"></script>
```

### 2. Get Current Admin Data
```javascript
// Get current active admin's data
const adminData = AdminSessionManager.getCurrentAdminData();
console.log(adminData.name, adminData.role);

// Get current active admin's privileges
const privileges = AdminSessionManager.getCurrentAdminPrivileges();
console.log(privileges.can_add_faculty);
```

### 3. Get All Logged-In Admins
```javascript
// See how many admins are logged in
const count = AdminSessionManager.getLoggedInAdminCount();
console.log(`${count} admins logged in`);

// Get all admin sessions
const allAdmins = AdminSessionManager.getAllAdminSessions();
Object.keys(allAdmins).forEach(adminId => {
    console.log(`Admin ${adminId}:`, allAdmins[adminId].user.name);
});
```

### 4. Switch Between Admins
```javascript
// If 2 admins logged in, switch to the other one
AdminSessionManager.switchToAdmin("admin2_id");
// Now auth checks will use admin2's privileges
```

### 5. Logout Specific Admin
```javascript
// Logout one admin (keeps others logged in)
AdminSessionManager.removeAdminSession("admin1_id");

// Logout all admins
AdminSessionManager.clearAllSessions();
```

## Backward Compatibility

The system **maintains these keys for backward compatibility**:
- `localStorage.admin_data` - Current active admin's user data
- `localStorage.admin_role` - Current active admin's role
- `localStorage.admin_privileges` - Current active admin's privileges

Existing code will continue to work unchanged.

## Example: Admin Switcher Interface

```html
<!-- Add this to show all logged-in admins -->
<div id="admin-switcher">
    <select id="adminSelect" onchange="switchAdmin()">
        <!-- Options populated by JS -->
    </select>
</div>

<script>
    function populateAdminSwitcher() {
        const allAdmins = AdminSessionManager.getAllAdminSessions();
        const select = document.getElementById('adminSelect');
        const currentAdminId = AdminSessionManager.getCurrentAdminId();
        
        select.innerHTML = '';
        Object.entries(allAdmins).forEach(([adminId, session]) => {
            const option = document.createElement('option');
            option.value = adminId;
            option.textContent = session.user.name;
            if (adminId === currentAdminId) option.selected = true;
            select.appendChild(option);
        });
    }
    
    function switchAdmin() {
        const adminId = document.getElementById('adminSelect').value;
        AdminSessionManager.switchToAdmin(adminId);
        window.location.reload(); // Reload to apply new admin's privileges
    }
    
    // Run on page load
    populateAdminSwitcher();
</script>
```

## Now Each Admin Has Separate Data

- **Admin 1** logs in → stored as `admin_sessions["admin1"]`
- **Admin 2** logs in → stored as `admin_sessions["admin2"]` (Admin 1's data NOT overwritten)
- Active admin is tracked by `current_admin_id`
- Switch between them without losing data

## Files Modified/Created
- ✅ `login-admin.html` - Updated to store per-admin instead of overwriting
- ✅ `admin-session-manager.js` - New helper utility (created)
