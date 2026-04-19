document.addEventListener('DOMContentLoaded', function () {
    const pagesList = document.getElementById('pagesList');
    const pageMessage = document.getElementById('pageMessage');
    const editorPanel = document.getElementById('editorPanel');
    const editorTitle = document.getElementById('editorTitle');
    const editorSubtitle = document.getElementById('editorSubtitle');
    const editorFilename = document.getElementById('editorFilename');
    const savePageBtn = document.getElementById('savePageBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const pagePreviewIframe = document.getElementById('pagePreviewIframe');
    const previewPanel = document.getElementById('previewPanel');
    const togglePreviewBtn = document.getElementById('togglePreviewBtn');
    const imageEditorPanel = document.getElementById('imageEditorPanel');
    const closeImageEditorBtn = document.getElementById('closeImageEditor');
    const updateImageBtn = document.getElementById('updateImageBtn');
    const deleteImageBtn = document.getElementById('deleteImageBtn');
    const imageFileInput = document.getElementById('imageFileInput');
    const imageSourcePath = document.getElementById('imageSourcePath');
    const selectedImageThumb = document.getElementById('selectedImageThumb');

    let currentPage = null;
    let lastContent = '';
    let selectedImageElement = null;

    async function initialize() {
        const hasAccess = await adminAccessControl.guardPage('can_edit_public_pages', 'Public Pages');
        if (!hasAccess) {
            return;
        }
        loadPublicPages();
    }

    function showMessage(message, type) {
        pageMessage.textContent = message;
        pageMessage.className = 'message-box';
        pageMessage.style.display = 'block';
        if (type === 'error') {
            pageMessage.style.background = '#ffe8e8';
            pageMessage.style.borderColor = '#f5c2c7';
            pageMessage.style.color = '#811d1f';
        } else {
            pageMessage.style.background = '#e6f3ea';
            pageMessage.style.borderColor = '#b7dfc7';
            pageMessage.style.color = '#1f5f3c';
        }
    }

    function clearMessage() {
        pageMessage.style.display = 'none';
    }

    async function loadPublicPages() {
        try {
            const response = await fetch('/api/admin/public-pages');
            const data = await response.json();
            if (!data.success) {
                showMessage(data.message || 'Failed to load public pages', 'error');
                return;
            }

            pagesList.innerHTML = '';
            data.pages.forEach(page => {
                const card = document.createElement('div');
                card.className = 'col-12 col-lg-6';
                card.innerHTML = `
                    <div class="page-card">
                        <h5>${escapeHtml(page.label)}</h5>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-muted">${escapeHtml(page.filename)}</span>
                            <button class="btn btn-outline-primary btn-edit-page" data-filename="${escapeHtml(page.filename)}">Edit</button>
                        </div>
                    </div>
                `;
                pagesList.appendChild(card);
            });
        } catch (error) {
            console.error(error);
            showMessage('Network error loading public pages', 'error');
        }
    }

    function getCurrentPreviewContent() {
        try {
            const doc = pagePreviewIframe.contentDocument || pagePreviewIframe.contentWindow.document;
            return doc.documentElement.outerHTML;
        } catch (err) {
            return lastContent;
        }
    }

    function setViewMode(mode) {
        // Only preview mode is available now
        togglePreviewBtn.classList.add('active');
        editorSubtitle.textContent = 'Edit the page directly in the live preview. Click on images to change them.';
    }

    function loadPreview(content) {
        const baseTag = `<base href="${window.location.origin}/">`;
        lastContent = content;
        pagePreviewIframe.srcdoc = `${baseTag}${content}`;
        pagePreviewIframe.onload = () => {
            try {
                const doc = pagePreviewIframe.contentDocument;
                if (doc) {
                    doc.designMode = 'on';
                    setupImageEditors();
                }
            } catch (err) {
                console.warn('Live preview editing unavailable:', err);
            }
        };
    }

    async function openEditor(filename) {
        clearMessage();
        try {
            const response = await fetch(`/api/admin/public-pages/${encodeURIComponent(filename)}`);
            const data = await response.json();
            if (!data.success) {
                showMessage(data.message || 'Failed to open page editor', 'error');
                return;
            }

            currentPage = data.filename;
            editorTitle.textContent = `Editing ${data.filename}`;
            editorFilename.textContent = data.filename;
            loadPreview(data.content);
            setViewMode('preview');
            editorPanel.style.display = 'block';
            editorPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            console.error(error);
            showMessage('Network error opening page editor', 'error');
        }
    }

    async function savePage() {
        if (!currentPage) {
            showMessage('No page selected for saving', 'error');
            return;
        }

        let content = getCurrentPreviewContent();

        if (!content || content.trim().length === 0) {
            showMessage('Page content cannot be empty', 'error');
            return;
        }

        savePageBtn.disabled = true;
        savePageBtn.textContent = 'Saving...';

        try {
            const response = await fetch(`/api/admin/public-pages/${encodeURIComponent(currentPage)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            const data = await response.json();
            if (!data.success) {
                showMessage(data.message || 'Failed to save public page', 'error');
            } else {
                showMessage(data.message || 'Page saved successfully', 'success');
                loadPublicPages();
                loadPreview(content);
            }
        } catch (error) {
            console.error(error);
            showMessage('Network error saving public page', 'error');
        } finally {
            savePageBtn.disabled = false;
            savePageBtn.textContent = 'Save Changes';
        }
    }

    function cancelEdit() {
        currentPage = null;
        editorPanel.style.display = 'none';
        clearMessage();
        hideImageEditor();
    }

    function setupImageEditors() {
        try {
            const doc = pagePreviewIframe.contentDocument;
            if (!doc) return;
            
            const images = doc.querySelectorAll('img');
            images.forEach(img => {
                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectImage(img);
                });
                img.style.cursor = 'pointer';
            });
        } catch (err) {
            console.warn('Could not setup image editors:', err);
        }
    }

    function selectImage(imgElement) {
        if (selectedImageElement) {
            selectedImageElement.classList.remove('image-selected-indicator');
        }
        selectedImageElement = imgElement;
        selectedImageElement.classList.add('image-selected-indicator');
        
        const imageSrc = selectedImageElement.getAttribute('src') || selectedImageElement.getAttribute('data-src') || '';
        imageSourcePath.value = imageSrc;
        selectedImageThumb.src = imageSrc;
        selectedImageThumb.onerror = () => {
            selectedImageThumb.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="80"%3E%3Crect fill="%23ddd" width="100" height="80"/%3E%3C/svg%3E';
        };
        
        imageEditorPanel.classList.add('active');
    }

    function hideImageEditor() {
        if (selectedImageElement) {
            selectedImageElement.classList.remove('image-selected-indicator');
        }
        selectedImageElement = null;
        imageEditorPanel.classList.remove('active');
        imageFileInput.value = '';
    }

    async function updateImageSrc() {
        if (!selectedImageElement) {
            showMessage('No image selected', 'error');
            return;
        }

        if (imageFileInput.files.length === 0) {
            showMessage('Please select an image file to upload', 'error');
            return;
        }

        const file = imageFileInput.files[0];
        if (!file.type.startsWith('image/')) {
            showMessage('Please select a valid image file', 'error');
            return;
        }

        updateImageBtn.disabled = true;
        updateImageBtn.textContent = 'Uploading...';

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('page', currentPage);

            const response = await fetch('/api/admin/upload-page-image', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!data.success) {
                showMessage(data.message || 'Failed to upload image', 'error');
            } else {
                const newImagePath = data.imageUrl || data.path;
                selectedImageElement.setAttribute('src', newImagePath);
                imageSourcePath.value = newImagePath;
                showMessage('Image updated successfully', 'success');
                imageFileInput.value = '';
            }
        } catch (error) {
            console.error(error);
            showMessage('Network error uploading image', 'error');
        } finally {
            updateImageBtn.disabled = false;
            updateImageBtn.textContent = 'Replace Image';
        }
    }

    function deleteImage() {
        if (!selectedImageElement) return;
        
        if (confirm('Remove this image from the page?')) {
            selectedImageElement.remove();
            hideImageEditor();
            showMessage('Image removed from page', 'success');
        }
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    pagesList.addEventListener('click', function (event) {
        const button = event.target.closest('.btn-edit-page');
        if (!button) return;
        const filename = button.getAttribute('data-filename');
        if (filename) {
            openEditor(filename);
        }
    });

    togglePreviewBtn.addEventListener('click', () => setViewMode('preview'));
    savePageBtn.addEventListener('click', savePage);
    cancelEditBtn.addEventListener('click', cancelEdit);
    closeImageEditorBtn.addEventListener('click', hideImageEditor);
    updateImageBtn.addEventListener('click', updateImageSrc);
    deleteImageBtn.addEventListener('click', deleteImage);
    initialize();
});
