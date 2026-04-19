(function () {
    'use strict';

    function getCookieValue(name) {
        try {
            var parts = document.cookie ? document.cookie.split(';') : [];
            for (var i = 0; i < parts.length; i++) {
                var part = parts[i].trim();
                if (!part) continue;
                var splitIndex = part.indexOf('=');
                var key = splitIndex >= 0 ? part.slice(0, splitIndex) : part;
                if (key === name) {
                    var value = splitIndex >= 0 ? part.slice(splitIndex + 1) : '';
                    try {
                        return decodeURIComponent(value);
                    } catch (err) {
                        return value;
                    }
                }
            }
        } catch (err) {
            return null;
        }
        return null;
    }

    function getFallbackAuthToken() {
        if (window.AuthSessionManager && typeof AuthSessionManager.getAuthToken === 'function') {
            var sessionToken = AuthSessionManager.getAuthToken();
            if (sessionToken) {
                return sessionToken;
            }
        }

        var storageToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
        if (storageToken) {
            return storageToken;
        }

        return getCookieValue('auth_token');
    }

    function installAuthFetchInterceptor() {
        if (window.__cpimsAuthFetchInterceptorInstalled || window.__authFetchInterceptorInstalled) {
            return;
        }

        var originalFetch = window.fetch.bind(window);
        window.fetch = function (input, init) {
            var options = init || {};
            var rawUrl = typeof input === 'string' ? input : (input && input.url ? input.url : '');
            var isApiRequest = rawUrl.indexOf('/api/') !== -1;

            if (!isApiRequest) {
                return originalFetch(input, options);
            }

            var token = getFallbackAuthToken();
            if (!token) {
                return originalFetch(input, options);
            }

            var headers = new Headers(options.headers || {});
            if (!headers.has('Authorization')) {
                headers.set('Authorization', 'Bearer ' + token);
            }

            var nextOptions = {};
            for (var key in options) {
                if (Object.prototype.hasOwnProperty.call(options, key)) {
                    nextOptions[key] = options[key];
                }
            }
            nextOptions.headers = headers;
            return originalFetch(input, nextOptions);
        };

        window.__cpimsAuthFetchInterceptorInstalled = true;
        window.__authFetchInterceptorInstalled = true;
    }

    installAuthFetchInterceptor();

    async function injectAdminFooter() {
        try {
            var response = await fetch('footer.html', { cache: 'no-store' });
            if (!response.ok) {
                return;
            }

            var html = await response.text();
            if (!html.trim()) {
                return;
            }

            var oldSections = document.querySelectorAll('.footer-area, .copyright-area');
            oldSections.forEach(function (node) {
                node.remove();
            });

            var wrapper = document.createElement('div');
            wrapper.innerHTML = html.trim();

            while (wrapper.firstChild) {
                document.body.appendChild(wrapper.firstChild);
            }

            var yearEl = document.getElementById('footerYear');
            if (yearEl) {
                yearEl.textContent = String(new Date().getFullYear());
            }
        } catch (error) {
            console.error('Failed to inject admin footer', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectAdminFooter);
    } else {
        injectAdminFooter();
    }
})();
