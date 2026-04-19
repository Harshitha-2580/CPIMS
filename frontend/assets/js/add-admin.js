// Check access and load user privileges when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAccessAndLoadPrivileges();
});

async function checkAccessAndLoadPrivileges() {
    // Get current active admin from session manager fallbacks
    const adminDataFromSession = (window.AdminSessionManager && AdminSessionManager.getCurrentAdminData()) ? AdminSessionManager.getCurrentAdminData() : {};
    const adminPrivilegesFromSession = (window.AdminSessionManager && AdminSessionManager.getCurrentAdminPrivileges()) ? AdminSessionManager.getCurrentAdminPrivileges() : {};

    // Legacy fallbacks
    const adminData = Object.keys(adminDataFromSession).length > 0 ? adminDataFromSession : JSON.parse(localStorage.getItem('admin_data') || '{}');
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const userDataFromStorage = Object.keys(adminData).length > 0 ? adminData : userData;
    const adminPrivileges = Object.keys(adminPrivilegesFromSession).length > 0 ? adminPrivilegesFromSession : JSON.parse(localStorage.getItem('admin_privileges') || '{}');
    
    console.log('Admin Data:', adminData);
    console.log('User Data:', userData);
    console.log('Combined User Data:', userDataFromStorage);
    console.log('Admin Privileges from localStorage:', adminPrivileges);
    console.log('User Role:', userDataFromStorage.role);
    
    // Normalize role to lowercase and trim
    const userRole = (userDataFromStorage.role || '').toLowerCase().trim();
    console.log('Normalized User Role:', userRole);
    
    // Check if user is superadmin by role
    const isSuperadmin = userRole === 'superadmin' || userRole === 'super';
    console.log('Is Superadmin:', isSuperadmin);
    
    // If superadmin, they always have full access
    if (isSuperadmin) {
        console.log('User is superadmin - granting full access');
        enableAllPrivileges();
        return;
    }
    
    // For non-superadmins, check if they have can_manage_admins privilege
    const canManageAdmins = adminPrivileges.can_manage_admins === 1 || adminPrivileges.can_manage_admins === true;
    console.log('Can Manage Admins:', canManageAdmins);
    
    if (!canManageAdmins) {
        console.log('User does not have can_manage_admins privilege - showing access denied');
        adminAccessControl.showAccessDenied('"Admin Management"');
        // Hide the form
        const gridElement = document.querySelector('.dashboard-grid');
        if (gridElement) {
            gridElement.style.display = 'none';
        }
        return;
    }
    
    // For regular admins with can_manage_admins privilege, disable checkboxes they don't have
    disableUnavailablePrivileges(adminPrivileges);
}

function enableAllPrivileges() {
    // Enable all privilege checkboxes for superadmin
    const superadminCheckbox = document.getElementById('privSuperadmin');
    if (superadminCheckbox) {
        superadminCheckbox.disabled = false;
    }
    document.querySelectorAll('.privilege-checkbox').forEach(cb => cb.disabled = false);
}

function disableUnavailablePrivileges(adminPrivileges) {
    const privilegeMap = {
        'privAddFaculty': 'can_add_faculty',
        'privGenerateReports': 'can_generate_reports',
        'privPostOpportunities': 'can_post_opportunities',
        'privAssignStudentsOpportunities': 'can_assign_students_opportunities',
        'privApproveStudents': 'can_approve_students'
    };
    
    Object.entries(privilegeMap).forEach(([elementId, privilegeKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            if (adminPrivileges[privilegeKey] !== 1 && adminPrivileges[privilegeKey] !== true) {
                element.disabled = true;
                element.parentElement.style.opacity = '0.6';
                element.parentElement.style.pointerEvents = 'none';
            }
        }
    });
    
    // Disable superadmin checkbox for non-superadmins
    document.getElementById('privSuperadmin').disabled = true;
    document.getElementById('privSuperadmin').parentElement.style.opacity = '0.6';
}

document.getElementById('addAdminForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('adminName').value.trim();
    const email = document.getElementById('adminEmail').value.trim();
    const phone = document.getElementById('adminPhone').value.trim();
    const designation = document.getElementById('adminDesignation').value.trim();
    const role = 'admin'; // Hardcoded as admin
    
    // Validate form
    if (!name || !email || !phone || !designation) {
        showMessage('All fields are required', 'error');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }
    
    // Collect checked privileges
    const privilegeCheckboxes = document.querySelectorAll('.privilege-checkbox');
    let privileges = [];
    privilegeCheckboxes.forEach(cb => {
        if (cb.checked) privileges.push(cb.value);
    });
    
    // If superadmin is checked, set all privileges
    if (document.getElementById('privSuperadmin').checked) {
        privileges = ['can_add_faculty', 'can_generate_reports', 'can_post_opportunities', 'can_assign_students_opportunities', 'can_approve_students'];
    }
    
    // Get current active admin info using session manager or storage
    const adminDataFromSession = (window.AdminSessionManager && AdminSessionManager.getCurrentAdminData()) ? AdminSessionManager.getCurrentAdminData() : {};
    const adminPrivilegesFromSession = (window.AdminSessionManager && AdminSessionManager.getCurrentAdminPrivileges()) ? AdminSessionManager.getCurrentAdminPrivileges() : {};
    const adminData = Object.keys(adminDataFromSession).length > 0 ? adminDataFromSession : JSON.parse(localStorage.getItem('admin_data') || '{}');
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const userDataFromStorage = Object.keys(adminData).length > 0 ? adminData : userData;
    const currentAdminPrivileges = Object.keys(adminPrivilegesFromSession).length > 0 ? adminPrivilegesFromSession : JSON.parse(localStorage.getItem('admin_privileges') || '{}');

    console.log('Current Admin Privileges (add-admin):', currentAdminPrivileges);
    
    // Show loading state
    const submitBtn = document.querySelector('#addAdminForm .btn-primary');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="ri-loader-4-line" style="animation: spin 1s linear infinite; margin-right: 6px;"></i>Adding Admin...';
    
    try {
        const response = await fetch('/api/admin/add-admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-role': userDataFromStorage.role || 'super',
                'x-user-email': userDataFromStorage.email || ''
            },
            body: JSON.stringify({ 
                name, 
                email, 
                phone, 
                designation, 
                role, 
                privileges,
                userRole: userDataFromStorage.role || 'super',
                userEmail: userDataFromStorage.email
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('✅ ' + data.message, 'success');
            // Reset form
            document.getElementById('addAdminForm').reset();
            // Reset privilege checkboxes
            privilegeCheckboxes.forEach(cb => cb.checked = false);
            document.getElementById('privSuperadmin').checked = false;
            // Clear message after 5 seconds
            setTimeout(() => {
                document.getElementById('addAdminMsg').innerHTML = '';
            }, 5000);
        } else {
            showMessage('❌ ' + (data.message || 'Failed to add admin'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('❌ Network error: ' + error.message, 'error');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

function showMessage(message, type) {
    const msgDiv = document.getElementById('addAdminMsg');
    msgDiv.className = type;
    msgDiv.innerHTML = message;
    msgDiv.style.display = 'block';
    
    // Scroll to message
    msgDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Add CSS for spinner animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
if (!document.querySelector('style[data-spin-animation]')) {
    style.setAttribute('data-spin-animation', 'true');
    document.head.appendChild(style);
}
