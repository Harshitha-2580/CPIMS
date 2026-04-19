(function() {
	"use strict";

	const _nativeAlert = window.alert;

	function _ensureGlobalUIModal() {
		if (document.getElementById('necGlobalAlertOverlay')) return;

		const styleTag = document.createElement('style');
		styleTag.textContent = `
		#necGlobalAlertOverlay{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.54);}
		#necGlobalAlertOverlay.active{display:flex;}
		#necGlobalAlertCard{max-width:400px;width:92%;background:#fff;border-radius:14px;box-shadow:0 20px 45px rgba(0,0,0,.25);overflow:hidden;font-family:Arial,Helvetica,sans-serif;text-align:left;}
		#necGlobalAlertHeader{padding:16px 18px;background:linear-gradient(90deg,#001e43,#0a3a75);color:#fff;font-weight:700;font-size:16px;display:flex;justify-content:space-between;align-items:center;}
		#necGlobalAlertBody{padding:18px;line-height:1.5;color:#202124;font-size:14px;min-height:48px;}
		#necGlobalAlertFooter{padding:12px 15px;text-align:right;background:#f6f7f9;}
		#necGlobalAlertConfirmBtn{cursor:pointer;padding:8px 16px;border:none;border-radius:6px;background:#001e43;color:#fff;font-weight:600;}
		#necGlobalAlertClose{border:none;background:transparent;color:#fff;font-size:18px;cursor:pointer;}
		`;
		document.head.appendChild(styleTag);

		const modalOverlay = document.createElement('div');
		modalOverlay.id = 'necGlobalAlertOverlay';
		modalOverlay.innerHTML = `
			<div id="necGlobalAlertCard">
				<div id="necGlobalAlertHeader"><span id="necGlobalAlertTitle">Alert</span><button id="necGlobalAlertClose" aria-label="Close">&times;</button></div>
				<div id="necGlobalAlertBody"></div>
				<div id="necGlobalAlertFooter"><button id="necGlobalAlertConfirmBtn">OK</button></div>
			</div>`;

		modalOverlay.addEventListener('click', e => {
			if (e.target === modalOverlay) {
				modalOverlay.classList.remove('active');
			}
		});

		document.body.appendChild(modalOverlay);

		const closeBtn = document.getElementById('necGlobalAlertClose');
		const confirmBtn = document.getElementById('necGlobalAlertConfirmBtn');

		const closeModal = () => {
			modalOverlay.classList.remove('active');
		};

		closeBtn.addEventListener('click', closeModal);
		confirmBtn.addEventListener('click', closeModal);

		window._necGlobalAlertShow = (message, title = 'Alert') => {
			const titleEl = document.getElementById('necGlobalAlertTitle');
			const bodyEl = document.getElementById('necGlobalAlertBody');
			titleEl.textContent = title;
			bodyEl.textContent = String(message);
			modalOverlay.classList.add('active');
		};
	}

	function _showGlobalAlert(message, title = 'Alert') {
		_ensureGlobalUIModal();
		if (window._necGlobalAlertShow) {
			window._necGlobalAlertShow(message, title);
		}
	}

	window.alert = function (message) {
		_showGlobalAlert(message, 'Alert');
	};

	window._nativeAlert = _nativeAlert;

    // Header Sticky
    window.addEventListener('scroll', event => {
        const height = 150;
        const { scrollTop } = event.target.scrollingElement;
        const navbar = document.querySelector('#navbar');
        if (navbar) {
            navbar.classList.toggle('sticky', scrollTop >= height);
        }
    });
  
    window.onload = function(){
        
        // Back to Top
        const getId = document.getElementById("back-to-top");
        if (getId) {
            const topbutton = document.getElementById("back-to-top");
            topbutton.onclick = function (e) {
                window.scrollTo({ top: 0, behavior: "smooth" });
            };
            window.onscroll = function () {
                if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
                    topbutton.style.opacity = "1";
                } else {
                    topbutton.style.opacity = "0";
                }
            };
        }
        
        // Counter Js
        if ("IntersectionObserver" in window) {  
            let counterObserver = new IntersectionObserver(function (entries, observer) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                    let counter = entry.target;
                    let target = parseInt(counter.innerText);
                    let step = target / 200;
                    let current = 0;
                    let timer = setInterval(function () {
                        current += step;
                        counter.innerText = Math.floor(current);
                        if (parseInt(counter.innerText) >= target) {
                        clearInterval(timer);
                        }
                    }, 10);
                    counterObserver.unobserve(counter);
                    }
                });
            });
            let counters = document.querySelectorAll(".counter");
            counters.forEach(function (counter) {
                counterObserver.observe(counter);
            });
        }
    };

    // Wait for DOM to be fully loaded and Swiper to be available
    document.addEventListener('DOMContentLoaded', function() {
        // Check if Swiper is defined
        if (typeof Swiper === 'undefined') return;

        // Testimonial JS
        var swiper = new Swiper(".testimonial", {
            loop: true,
            spaceBetween: 10,
            slidesPerView: 4,
            freeMode: true,
            watchSlidesProgress: true,
            autoplay: {
                delay: 2000,
                disableOnInteraction: false,
            },
        });
        
        var swiper2 = new Swiper(".testimonial2", {
            loop: true,
            spaceBetween: 10,
            navigation: {
                nextEl: ".next",
                prevEl: ".prev",
            },
            autoplay: {
                delay: 2000,
                disableOnInteraction: false,
            },
            thumbs: {
                swiper: swiper,
            },
        });
        
        var swiper2 = new Swiper(".testimonial-slider-2", {
            loop: true,
            spaceBetween: 30,
            navigation: {
                nextEl: ".swiper-button-next",
                prevEl: ".swiper-button-prev",
            },
            autoplay: {
                delay: 2000,
                disableOnInteraction: false,
            },
            breakpoints: {
                0: {
                    slidesPerView: 1
                },
                576: {
                    slidesPerView: 1
                },
                768: {
                    slidesPerView: 2
                },
                992: {
                    slidesPerView: 2
                },
                1200: {
                    slidesPerView: 2
                },
                1400: {
                    slidesPerView: 2
                }
            }
        });
        
        var swiper2 = new Swiper(".testimonial-slider-3", {
            loop: true,
            spaceBetween: 30,
            navigation: {
                nextEl: ".swiper-button-next",
                prevEl: ".swiper-button-prev",
            },
            autoplay: {
                delay: 2000,
                disableOnInteraction: false,
            },
            breakpoints: {
                0: {
                    slidesPerView: 1
                },
                576: {
                    slidesPerView: 1
                },
                768: {
                    slidesPerView: 2
                },
                992: {
                    slidesPerView: 2
                },
                1200: {
                    slidesPerView: 2
                },
                1400: {
                    slidesPerView: 3
                }
            }
        });

        // Partner JS
        var swiper = new Swiper(".partner-slider", {
            spaceBetween: 70,
            autoplay: {
                delay: 2500,
                disableOnInteraction: false,
            },
            breakpoints: {
                0: {
                    slidesPerView: 2
                },
                576: {
                    slidesPerView: 2
                },
                768: {
                    slidesPerView: 3
                },
                992: {
                    slidesPerView: 3
                },
                1200: {
                    slidesPerView: 4
                },
                1400: {
                    slidesPerView: 5
                }
            }
        });

        // Programs JS
        var swiper = new Swiper(".programs-slider", {
            spaceBetween: 25,
            loop: true,
            autoplay: {
                delay: 2500,
                disableOnInteraction: false,
            },
            breakpoints: {
                0: {
                    slidesPerView: 1
                },
                576: {
                    slidesPerView: 1
                },
                768: {
                    slidesPerView: 2
                },
                992: {
                    slidesPerView: 3
                },
                1200: {
                    slidesPerView: 3
                },
                1400: {
                    slidesPerView: 3
                }
            }
        });
    });

    // Timer Js
    try {
        const days1 =document.querySelector("#days")
        const hours1 =document.querySelector("#hours")
        const minutes1 =document.querySelector("#minutes")
        const seconds1  =document.querySelector("#seconds")
        const newYears = 'Jan 01 2028 00:00:00';
        function countdown(){
            const newYearsDate = new Date(newYears);
            const currentDate = new Date();

            const totalSeconds = (newYearsDate-currentDate)/1000;
            const days = Math.floor(totalSeconds / 3600 / 24);
            const hours = Math.floor(totalSeconds / 3600 ) % 24;
            const minutes = Math.floor(totalSeconds / 60 ) % 60;
            const seconds = Math.floor(totalSeconds % 60);
            
            days1.innerHTML =   formatTime( days);
            hours1.innerHTML =  formatTime( hours);
            minutes1.innerHTML =formatTime(  minutes);
            seconds1.innerHTML =formatTime(  seconds);
        }
        countdown();
        function formatTime(time){
            return time < 10 ? `0${time}` : time;
        }
        setInterval(countdown,1000);
    } catch {}
   
    // ScrollCue - Initialize if loaded
    if (typeof scrollCue !== 'undefined') {
        scrollCue.init();
    }

})();

// Offcanvas Responsive Menu
const list = document.querySelectorAll('.responsive-menu-list');
const responsiveMenuToggles = document.querySelectorAll('.responsive-menu-list > a');

function accordion(e) {
    const listItem = e.currentTarget.closest('.responsive-menu-list');
    if (!listItem || !listItem.querySelector(':scope > .responsive-menu-items')) {
        return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (listItem.classList.contains('active')) {
        listItem.classList.remove('active');
    }
    else if (listItem.parentElement.parentElement.classList.contains('active')) {
        listItem.classList.add('active');
    }
    else {
        for (i = 0; i < list.length; i++) {
            list[i].classList.remove('active');
        }
        listItem.classList.add('active');
    }
}

for (i = 0; i < responsiveMenuToggles.length; i++) {
    responsiveMenuToggles[i].addEventListener('click', accordion);
}

// Floating student notifications across all student pages.
(function() {
    "use strict";

    function isStudentPage() {
        return window.location.pathname.toLowerCase().includes('student-');
    }

    function getReadNotificationIds(studentId) {
        const key = `student_notifications_read_${studentId}`;
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function setReadNotificationIds(studentId, ids) {
        const key = `student_notifications_read_${studentId}`;
        localStorage.setItem(key, JSON.stringify(ids));
    }

    function formatTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Now';
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function injectStyles() {
        if (document.getElementById('floatingNotificationStyles')) return;

        const style = document.createElement('style');
        style.id = 'floatingNotificationStyles';
        style.textContent = `
            .floating-notification-wrap {
                position: fixed;
                bottom: 24px;
                right: 4px !important;
                z-index: 10050;
            }

            .floating-notification-btn {
                width: 52px;
                height: 52px;
                border-radius: 50%;
                border: 1px solid #e9ecef;
                background: #ffffff;
                color: #001e43;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                cursor: pointer;
                box-shadow: 0 10px 26px rgba(0, 30, 67, 0.2);
                transition: all 0.25s ease;
            }

            .floating-notification-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 14px 28px rgba(250, 57, 74, 0.28);
                color: #FA394A;
            }

            .floating-notification-count {
                position: absolute;
                top: -5px;
                right: -5px;
                min-width: 20px;
                height: 20px;
                border-radius: 999px;
                background: #FA394A;
                color: #fff;
                display: none;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 700;
                border: 2px solid #fff;
                padding: 0 6px;
                line-height: 1;
            }

            .floating-notification-panel {
                position: absolute;
                bottom: calc(100% + 12px);
                right: 0;
                width: min(390px, 92vw);
                max-height: 430px;
                overflow: auto;
                background: #fff;
                border: 1px solid #e9ecef;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 30, 67, 0.24);
                display: none;
            }

            .floating-notification-head {
                padding: 12px 14px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #f1f3f5;
                background: linear-gradient(135deg, #f8f9fa, #ffffff);
            }

            .floating-notification-head strong {
                color: #001e43;
                font-size: 14px;
            }

            .floating-notification-head small {
                color: #6c757d;
                font-size: 12px;
            }

            .floating-notification-list {
                padding: 8px;
            }

            .floating-notification-item {
                display: block;
                text-decoration: none;
                border-radius: 10px;
                padding: 10px;
                border: 1px solid transparent;
                margin-bottom: 8px;
                color: inherit;
                background: #fff;
                transition: all 0.2s ease;
            }

            .floating-notification-item:hover {
                background: #f8f9ff;
                border-color: #e5e7ff;
                transform: translateX(2px);
            }

            .floating-notification-item.unread {
                background: #fff8f9;
                border-color: #ffd7dd;
            }

            .floating-notification-item h6 {
                margin: 0 0 4px;
                color: #001e43;
                font-size: 14px;
                font-weight: 700;
            }

            .floating-notification-item p {
                margin: 0;
                color: #5f6773;
                font-size: 13px;
                line-height: 1.35;
            }

            .floating-notification-meta {
                margin-top: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                color: #8a9099;
            }

            .floating-notification-pill {
                padding: 2px 8px;
                border-radius: 999px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
            }

            .floating-pill-assigned {
                background: #e9f8ef;
                color: #1f9254;
            }

            .floating-pill-new {
                background: #eef2ff;
                color: #3f51b5;
            }

            .floating-notification-empty {
                text-align: center;
                color: #6c757d;
                padding: 22px 14px;
                font-size: 14px;
            }

            @media (max-width: 768px) {
                .floating-notification-wrap {
                    bottom: 16px;
                    right: 4px !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function buildWidget() {
        const existing = document.getElementById('floatingNotificationWrap');
        if (existing) return existing;

        const wrap = document.createElement('div');
        wrap.id = 'floatingNotificationWrap';
        wrap.className = 'floating-notification-wrap';
        wrap.innerHTML = `
            <button class="floating-notification-btn" id="floatingNotificationBtn" title="Notifications" type="button">
                <i class="ri-notification-3-line"></i>
                <span class="floating-notification-count" id="floatingNotificationCount">0</span>
            </button>
            <div class="floating-notification-panel" id="floatingNotificationPanel">
                <div class="floating-notification-head">
                    <strong>Opportunity Notifications</strong>
                    <small id="floatingNotificationMeta">Latest updates</small>
                </div>
                <div class="floating-notification-list" id="floatingNotificationList"></div>
            </div>
        `;
        document.body.appendChild(wrap);
        return wrap;
    }

    function renderList(studentId, notifications) {
        const countEl = document.getElementById('floatingNotificationCount');
        const metaEl = document.getElementById('floatingNotificationMeta');
        const listEl = document.getElementById('floatingNotificationList');
        if (!countEl || !metaEl || !listEl) return;

        const readIds = getReadNotificationIds(studentId);
        const unread = notifications.filter(n => !readIds.includes(n.id));

        if (unread.length > 0) {
            countEl.style.display = 'flex';
            countEl.textContent = unread.length > 99 ? '99+' : String(unread.length);
        } else {
            countEl.style.display = 'none';
        }

        metaEl.textContent = unread.length > 0 ? `${unread.length} unread` : 'All caught up';

        if (!notifications.length) {
            listEl.innerHTML = '<div class="floating-notification-empty">No notifications yet.</div>';
            return;
        }

        listEl.innerHTML = notifications.map(item => {
            const isUnread = !readIds.includes(item.id);
            const pillClass = item.isAssigned ? 'floating-pill-assigned' : 'floating-pill-new';
            const pillText = item.isAssigned ? 'Assigned' : 'New';
            return `
                <a href="${item.targetUrl}" class="floating-notification-item ${isUnread ? 'unread' : ''}" data-notification-id="${item.id}">
                    <h6>${item.title}</h6>
                    <p>${item.message}</p>
                    <div class="floating-notification-meta">
                        <span>${formatTime(item.createdAt)}</span>
                        <span class="floating-notification-pill ${pillClass}">${pillText}</span>
                    </div>
                </a>
            `;
        }).join('');

        listEl.querySelectorAll('.floating-notification-item').forEach(anchor => {
            anchor.addEventListener('click', () => {
                const id = anchor.getAttribute('data-notification-id');
                const updated = Array.from(new Set([...readIds, id]));
                setReadNotificationIds(studentId, updated);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', async function() {
        if (!isStudentPage()) return;

        const studentId = (sessionStorage.getItem('student_id') || localStorage.getItem('student_id'));
        if (!studentId) return;

        // If page already has a custom notification widget, do not duplicate.
        if (document.getElementById('notificationPanel')) return;

        injectStyles();
        buildWidget();

        const btn = document.getElementById('floatingNotificationBtn');
        const panel = document.getElementById('floatingNotificationPanel');
        const wrap = document.getElementById('floatingNotificationWrap');

        let notifications = [];
        try {
            const res = await fetch(`http://localhost:3000/api/opportunities/notifications/${studentId}`);
            const data = await res.json();
            notifications = data.success && Array.isArray(data.notifications) ? data.notifications : [];
        } catch (err) {
            console.error('Error loading floating notifications:', err);
            notifications = [];
        }

        renderList(studentId, notifications);

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpen = panel.style.display === 'block';
            panel.style.display = isOpen ? 'none' : 'block';

            if (!isOpen && notifications.length) {
                const allIds = notifications.map(item => item.id);
                setReadNotificationIds(studentId, allIds);
                renderList(studentId, notifications);
            }
        });

        document.addEventListener('click', function(e) {
            if (!wrap.contains(e.target)) {
                panel.style.display = 'none';
            }
        });
    });
})();

