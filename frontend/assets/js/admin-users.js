document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // Get current admin data from session manager (preferred) or fallback
    var adminData = {};
    var adminPrivileges = {};
    var loadedAdmins = [];

    if (window.AdminSessionManager && AdminSessionManager.getCurrentAdminData()) {
        adminData = AdminSessionManager.getCurrentAdminData();
    } else {
        var currentAdminId = sessionStorage.getItem('current_admin_id') || localStorage.getItem('current_admin_id');
        var adminSessions = JSON.parse(localStorage.getItem('admin_sessions') || '{}');
        if (currentAdminId && adminSessions[currentAdminId]) {
            adminData = adminSessions[currentAdminId].user || {};
            adminPrivileges = adminSessions[currentAdminId].privileges || {};
        } else {
            adminData = JSON.parse(localStorage.getItem('admin_data') || '{}');
            adminPrivileges = JSON.parse(localStorage.getItem('admin_privileges') || '{}');
        }
    }

    if (!adminPrivileges || Object.keys(adminPrivileges).length === 0) {
        adminPrivileges = (window.AdminSessionManager && AdminSessionManager.getCurrentAdminPrivileges()) ? AdminSessionManager.getCurrentAdminPrivileges() : adminPrivileges;
    }

    // DOM Elements
    var usersTableBody = document.getElementById('usersTableBody');
    var messageBox = document.getElementById('messageBox');
    var modalMessageBox = document.getElementById('modalMessageBox');
    var editModal = document.getElementById('editModal');
    var editAdminForm = document.getElementById('editAdminForm');
    var closeModalBtn = document.getElementById('closeModal');
    var cancelBtn = document.getElementById('cancelBtn');
    var deleteConfirmModal = document.getElementById('deleteConfirmModal');
    var deleteConfirmMessage = document.getElementById('deleteConfirmMessage');
    var deleteConfirmClose = document.getElementById('deleteConfirmClose');
    var deleteConfirmCancel = document.getElementById('deleteConfirmCancel');
    var deleteConfirmOk = document.getElementById('deleteConfirmOk');

    var currentEditingAdminId = null;

    // Load all admins on page load
    loadAllAdmins();

    // Modal controls
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    editAdminForm.addEventListener('submit', function(e) {
        e.preventDefault();
        saveAdminChanges();
    });

    // Close modal when clicking outside
    editModal.addEventListener('click', function(e) {
        if (e.target === editModal) {
            closeModal();
        }
    });

    function showDeleteConfirm(name) {
        if (!deleteConfirmModal || !deleteConfirmMessage || !deleteConfirmClose || !deleteConfirmCancel || !deleteConfirmOk) {
            return Promise.resolve(confirm('Are you sure you want to delete admin "' + name + '"? This action cannot be undone.'));
        }

        deleteConfirmMessage.textContent = 'Are you sure you want to delete admin "' + name + '"? This action cannot be undone.';
        deleteConfirmModal.classList.add('show');

        return new Promise(function(resolve) {
            function cleanup() {
                deleteConfirmOk.removeEventListener('click', onConfirm);
                deleteConfirmCancel.removeEventListener('click', onCancel);
                deleteConfirmClose.removeEventListener('click', onCancel);
                deleteConfirmModal.removeEventListener('click', onOverlayClick);
                document.removeEventListener('keydown', onEsc);
            }

            function close(result) {
                deleteConfirmModal.classList.remove('show');
                cleanup();
                resolve(result);
            }

            function onConfirm() {
                close(true);
            }

            function onCancel() {
                close(false);
            }

            function onOverlayClick(e) {
                if (e.target === deleteConfirmModal) {
                    close(false);
                }
            }

            function onEsc(e) {
                if (e.key === 'Escape') {
                    close(false);
                }
            }

            deleteConfirmOk.addEventListener('click', onConfirm);
            deleteConfirmCancel.addEventListener('click', onCancel);
            deleteConfirmClose.addEventListener('click', onCancel);
            deleteConfirmModal.addEventListener('click', onOverlayClick);
            document.addEventListener('keydown', onEsc);
        });
    }

    function showMessage(message, type, targetBox) {
        targetBox = targetBox || messageBox;
        targetBox.textContent = message;
        targetBox.className = 'message-box message-' + type;
        
        if (type === 'success') {
            setTimeout(function() {
                targetBox.className = 'message-box';
            }, 3000);
        }
    }

    function loadAllAdmins() {
        usersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;"><i class="ri-loader-4-line" style="font-size: 24px; animation: spin 0.6s linear infinite;"></i><p style="margin-top: 10px;">Loading users...</p></td></tr>';

        fetch('/api/admin/get-all-admins', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-user-role': adminData.role || 'super'
            }
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Failed to fetch admins: ' + response.statusText);
            }
            return response.json();
        })
        .then(function(data) {
            if (data.success && data.admins && data.admins.length > 0) {
                loadedAdmins = data.admins;
                displayAdmins(data.admins);
            } else if (data.admins && data.admins.length === 0) {
                usersTableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="ri-user-line"></i><p>No admin users found. Create your first admin user.</p></div></td></tr>';
            } else {
                showMessage('Error: ' + (data.message || 'Failed to load admins'), 'error');
                usersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Error loading admins. Please try again.</td></tr>';
            }
        })
        .catch(function(error) {
            console.error('Error:', error);
            showMessage('Error loading admins: ' + error.message, 'error');
            usersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Error loading admins. Please try again.</td></tr>';
        });
    }

    function displayAdmins(admins) {
        usersTableBody.innerHTML = '';

        // Filter out superadmins - only show regular admins
        var regularAdmins = admins.filter(function(admin) {
            return admin.role !== 'super' && admin.role !== 'superadmin';
        });

        // Check if there are any regular admins to display
        if (regularAdmins.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="ri-user-line"></i><p>No regular admin users found. Create your first admin user.</p></div></td></tr>';
            return;
        }

        regularAdmins.forEach(function(admin) {
            var privilegesList = '';
            
            if (admin.can_add_faculty) privilegesList += '<span class="privilege-badge privilege-granted">Faculty</span>';
            if (admin.can_generate_reports) privilegesList += '<span class="privilege-badge privilege-granted">Reports</span>';
            if (admin.can_post_opportunities) privilegesList += '<span class="privilege-badge privilege-granted">Opportunities</span>';
            if (admin.can_assign_students_opportunities) privilegesList += '<span class="privilege-badge privilege-granted">Assign</span>';
            if (admin.can_approve_students) privilegesList += '<span class="privilege-badge privilege-granted">Approve Students</span>';
            
            if (!privilegesList) {
                privilegesList = '<span class="privilege-badge privilege-denied">None</span>';
            }

            var row = document.createElement('tr');
            row.innerHTML = '' +
                '<td><div class="admin-name">' + escapeHtml(admin.name) + '</div></td>' +
                '<td>' + escapeHtml(admin.email) + '</td>' +
                '<td>' + escapeHtml(admin.phone || 'N/A') + '</td>' +
                '<td><span style="text-transform: capitalize; font-weight: 600; color: #001e43;">' + (admin.role === 'super' ? 'Superadmin' : 'Admin') + '</span></td>' +
                '<td>' + privilegesList + '</td>' +
                '<td><div class="action-buttons">' +
                    '<button type="button" class="btn-edit">' +
                        '<i class="ri-edit-line"></i>Edit' +
                    '</button>' +
                    '<button type="button" class="btn-delete">' +
                        '<i class="ri-delete-bin-line"></i>Delete' +
                    '</button>' +
                '</div></td>';

            row.querySelector('.btn-edit').addEventListener('click', function() {
                editAdmin(admin.id);
            });

            row.querySelector('.btn-delete').addEventListener('click', function() {
                deleteAdmin(admin.id, admin.name);
            });
            
            usersTableBody.appendChild(row);
        });
    }

    window.editAdmin = function(id) {
        var admin = loadedAdmins.find(function(item) { return item.id === id || item.id == id; });
        if (!admin) {
            console.warn('[EditAdmin] Admin not found for id:', id);
            return;
        }

        currentEditingAdminId = admin.id;

        document.getElementById('editName').value = admin.name || '';
        document.getElementById('editEmail').value = admin.email || '';
        document.getElementById('editPhone').value = admin.phone || '';
        document.getElementById('editDesignation').value = admin.designation || '';

        // Clear all checkboxes first
        document.querySelectorAll('#editModal input[type="checkbox"]').forEach(function(checkbox) {
            checkbox.checked = false;
        });

        document.getElementById('priv_faculty').checked = !!admin.can_add_faculty;
        document.getElementById('priv_reports').checked = !!admin.can_generate_reports;
        document.getElementById('priv_opportunities').checked = !!admin.can_post_opportunities;
        document.getElementById('priv_assign').checked = !!admin.can_assign_students_opportunities;
        document.getElementById('priv_approve').checked = !!admin.can_approve_students;

        modalMessageBox.className = 'message-box';
        editModal.classList.add('show');
        console.log('[EditAdmin] Modal opened successfully');
    };

    window.deleteAdmin = function(id, name) {
        showDeleteConfirm(name).then(function(confirmed) {
            if (!confirmed) {
                return;
            }

            fetch('/api/admin/delete-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-role': adminData.role || 'super'
                },
                body: JSON.stringify({
                    adminId: id
                })
            })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Failed to delete admin: ' + response.statusText);
                }
                return response.json();
            })
            .then(function(data) {
                if (data.success) {
                    showMessage('Admin deleted successfully', 'success');
                    setTimeout(loadAllAdmins, 900);
                } else {
                    showMessage('Error: ' + (data.message || 'Failed to delete admin'), 'error');
                }
            })
            .catch(function(error) {
                console.error('Error:', error);
                showMessage('Error deleting admin: ' + error.message, 'error');
            });
        });
    };

    function saveAdminChanges() {
        var name = document.getElementById('editName').value.trim();
        var phone = document.getElementById('editPhone').value.trim();
        var designation = document.getElementById('editDesignation').value.trim();

        console.log('[SaveAdmin] Starting save process:', { adminId: currentEditingAdminId, name, phone, designation });

        if (!name) {
            showMessage('Please enter admin name', 'error', modalMessageBox);
            return;
        }

        var privileges = {
            can_add_faculty: document.getElementById('priv_faculty').checked ? 1 : 0,
            can_generate_reports: document.getElementById('priv_reports').checked ? 1 : 0,
            can_post_opportunities: document.getElementById('priv_opportunities').checked ? 1 : 0,
            can_assign_students_opportunities: document.getElementById('priv_assign').checked ? 1 : 0,
            can_approve_students: document.getElementById('priv_approve').checked ? 1 : 0
        };

        console.log('[SaveAdmin] Privileges:', privileges);

        var saveBtn = editAdminForm.querySelector('.btn-modal-save');
        var originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="loading-spinner"></span>&nbsp;Saving...';

        console.log('[SaveAdmin] Sending request to /api/admin/update-admin');

        fetch('/api/admin/update-admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-role': adminData.role || 'super'
            },
            body: JSON.stringify({
                adminId: currentEditingAdminId,
                name: name,
                phone: phone,
                designation: designation,
                privileges: privileges
            })
        })
        .then(function(response) {
            console.log('[SaveAdmin] Response status:', response.status);
            if (!response.ok) {
                throw new Error('Failed to update admin: ' + response.statusText);
            }
            return response.json();
        })
        .then(function(data) {
            console.log('[SaveAdmin] Response data:', data);
            if (data.success) {
                showMessage('Admin updated successfully', 'success', modalMessageBox);
                setTimeout(function() {
                    closeModal();
                    loadAllAdmins();
                }, 900);
            } else {
                showMessage('Error: ' + (data.message || 'Failed to update admin'), 'error', modalMessageBox);
            }
        })
        .catch(function(error) {
            console.error('[SaveAdmin] Error:', error);
            showMessage('Error updating admin: ' + error.message, 'error', modalMessageBox);
        })
        .finally(function() {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        });
    }

    function closeModal() {
        editModal.classList.remove('show');
        editAdminForm.reset();
        currentEditingAdminId = null;
        modalMessageBox.className = 'message-box';
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
