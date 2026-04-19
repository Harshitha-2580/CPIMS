// Load footer.html into a footer container on every page
document.addEventListener("DOMContentLoaded", function() {
    // Get the footer container div
    const footerContainer = document.getElementById('footer-container');
    
    if (footerContainer) {
        // Fetch and insert the footer
        fetch('footer.html')
            .then(response => response.text())
            .then(html => {
                footerContainer.innerHTML = html;
            })
            .catch(error => {
                console.error('Error loading footer:', error);
            });
    }
});
