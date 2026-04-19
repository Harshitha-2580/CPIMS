# Admin Access Control - Database Verification

## Overview
Admin privileges are now **verified against the database** on each page guard check. This prevents tampering with localStorage privileges.

## How It Works

### Before (Insecure)
- Privileges stored in localStorage only
- Frontend checks localStorage directly
- User could modify localStorage to gain unauthorized access

### After (Secure)
- Frontend checks localStorage (fallback)
- **Fetches latest privileges from backend**: `GET /api/admin/privileges/:adminId`
- Backend queries database for real privileges
- Frontend compares database privileges with localStorage
- Access is granted only if database verification passes

## Implementation

### 1. Use in Pages

Add this to your admin pages that need privilege checks:

```html
<script src="assets/js/admin-access-control.js"></script>
<script>
    // On page load, verify and guard access
    document.addEventListener('DOMContentLoaded', async () => {
        const accessGranted = await adminAccessControl.guardPage(
            'can_add_faculty',  // Required privilege
            'Faculty Management Page'
        );
        
        if (!accessGranted) {
            // User doesn't have permission, popup shown automatically
            // Page content should be hidden/disabled
        }
    });
</script>
```

### 2. Check Multiple Privileges

```javascript
// User must have ANY of these privileges
await adminAccessControl.guardPage(
    ['can_add_faculty', 'can_manage_admins'],
    'Admin Management'
);
```

### 3. Manual Privilege Check

```javascript
// Manually check if current admin has privilege
if (adminAccessControl.hasPrivilege('can_generate_reports')) {
    // Show report button
}

// Check multiple privileges
if (adminAccessControl.hasAnyPrivilege(['can_add_faculty', 'can_manage_admins'])) {
    // Show management options
}
```

### 4. Refresh Privileges

```javascript
// Force refresh privileges from database
const verified = await adminAccessControl.verifyPrivilegesFromDatabase();
if (verified) {
    console.log('Privileges refreshed from database');
}
```

## Backend Endpoint

### GET `/api/admin/privileges/:adminId`

**Request:**
```javascript
fetch(`/api/admin/privileges/${adminId}`)
```

**Response:**
```json
{
  "success": true,
  "privileges": {
    "can_add_faculty": 1,
    "can_generate_reports": 0,
    "can_post_opportunities": 1,
    "can_assign_students_opportunities": 0,
    "can_manage_admins": 0
  },
  "adminId": 5,
  "role": "admin",
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

## Important Notes

### 1. Privilege Changes Take Effect Immediately
If a superadmin changes another admin's privileges:
- On refresh, `verifyPrivilegesFromDatabase()` will fetch latest
- Old localStorage values will be overwritten with database truth

### 2. Superadmins Always Get All Privileges
Regardless of database flags, superadmins (`role='super'` or `role='superadmin'`) get all privileges automatically.

### 3. Fallback for Database Failures
If the database verification fails:
- Log warning to console
- Fall back to localStorage (less secure)
- User can still access but verify from database on next attempt

### 4. Error Handling
```javascript
async function guardPage(requiredPrivileges, pageTitle) {
    const isVerified = await this.verifyPrivilegesFromDatabase();
    
    if (!isVerified) {
        // Verification failed - could redirect to login
        // Or fallback to localStorage check
    }
    
    if (!this.hasAnyPrivilege(requiredPrivileges)) {
        this.showAccessDenied(pageTitle);
        return false;
    }
    return true;
}
```

## Security Flow

```
User Loads Page
    ↓
adminAccessControl.guardPage() called
    ↓
Fetch /api/admin/privileges/:adminId
    ↓
Backend Queries Database
    ↓
Return Database Privileges
    ↓
Frontend compares with localStorage
    ↓
Update localStorage with database truth
    ↓
Check if admin has required privilege
    ↓
If YES → Allow access
If NO → Show access denied popup & redirect to dashboard
```

## Best Practices

1. **Always use `guardPage()` on page load** - Don't just check localStorage
2. **Refresh after admin operations** - If you change privileges, refresh the page
3. **Show/hide UI elements based on privileges** - Use `hasPrivilege()` to control UI
4. **Log privilege verification** - Check console for verification attempts
5. **Test with database directly** - Modify database to test access control

## Testing

### Test 1: Tamper with localStorage
1. Login as admin
2. Open DevTools → Application → localStorage
3. Change `admin_privileges` to grant fake privilege
4. Reload page and call `guardPage()`
5. Should show access denied (database check overrides tampering)

### Test 2: Database Privilege Change
1. Login as admin with `can_add_faculty = 0`
2. Open page that requires this privilege
3. Via SQL: `UPDATE admins SET can_add_faculty = 1 WHERE id = X`
4. Reload page
5. Should now have access (database verification picked up change)

## Files Modified
- ✅ `admin-access-control.js` - Added `verifyPrivilegesFromDatabase()` method
- ✅ `backend/routes/admin.js` - Added `GET /api/admin/privileges/:adminId` endpoint
