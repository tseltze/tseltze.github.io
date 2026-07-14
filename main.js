// Script is loaded with defer, so the DOM is parsed before it runs.

var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// =====================
// SCROLL PROGRESS BAR
// =====================
var progressBar = document.getElementById('progress');
if (progressBar) {
    window.addEventListener('scroll', function () {
        var scrollTop    = document.documentElement.scrollTop;
        var scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        var pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        progressBar.style.width = pct + '%';
        progressBar.setAttribute('aria-valuenow', Math.round(pct));
    }, { passive: true });
}

// =====================
// THEME TOGGLE
// =====================
var themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    function applyTheme(theme) {
        var isLight = theme === 'light';
        document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
        themeToggle.textContent = isLight ? '\u2600\uFE0F' : '\uD83C\uDF19';
        themeToggle.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
    }

    // Use saved choice, else default to dark regardless of OS preference
    var savedTheme = null;
    try { savedTheme = localStorage.getItem('theme'); } catch (e) {}
    applyTheme(savedTheme || 'dark');

    themeToggle.addEventListener('click', function () {
        var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        applyTheme(next);
        try { localStorage.setItem('theme', next); } catch (e) {}
    });
}

// =====================
// REVEAL ON SCROLL
// =====================
var revealItems = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
if (revealItems.length && 'IntersectionObserver' in window) {
    var revealObs = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
                entries[i].target.classList.add('visible');
                revealObs.unobserve(entries[i].target);
            }
        }
    }, { threshold: 0.1 });
    revealItems.forEach(function (el) { revealObs.observe(el); });
}

// =====================
// COUNT-UP ANIMATION
// =====================
var countEls = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
if (countEls.length && 'IntersectionObserver' in window && !prefersReducedMotion) {
    var countObs = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
            if (!entries[i].isIntersecting) continue;
            var el = entries[i].target;
            var target = parseInt(el.getAttribute('data-count'), 10);
            var suffix = el.getAttribute('data-suffix') || '';
            var start = 0;
            var duration = 1200;
            var startTime = null;
            countObs.unobserve(el);
            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                var progress = Math.min((timestamp - startTime) / duration, 1);
                el.textContent = Math.floor(progress * target) + suffix;
                if (progress < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }
    }, { threshold: 0.5 });
    countEls.forEach(function (el) { countObs.observe(el); });
}



// =====================
// ACTIVE NAV + DOT NAV
// =====================
var headerNavLinks = Array.prototype.slice.call(
    document.querySelectorAll('header nav a[href^="#"]')
);
var navSections = headerNavLinks.reduce(function (acc, a) {
    var el = document.querySelector(a.getAttribute('href'));
    if (el) acc.push(el);
    return acc;
}, []);

// Build dot nav
var dotNavEl = document.createElement('nav');
dotNavEl.className = 'dot-nav';
dotNavEl.setAttribute('aria-label', 'Section indicator');
var dotEls = navSections.map(function (section) {
    var dot = document.createElement('a');
    dot.href = '#' + section.id;
    dot.className = 'dot-nav-item';
    dot.setAttribute('aria-label', 'Go to ' + section.id);
    dot.title = section.id.charAt(0).toUpperCase() + section.id.slice(1);
    dotNavEl.appendChild(dot);
    return dot;
});
document.body.appendChild(dotNavEl);

if (navSections.length && 'IntersectionObserver' in window) {
    var navObs = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
            if (!entries[i].isIntersecting) continue;
            var activeId = entries[i].target.id;

            headerNavLinks.forEach(function (link) { link.classList.remove('active'); });
            var activeLink = document.querySelector('header nav a[href="#' + activeId + '"]');
            if (activeLink) activeLink.classList.add('active');

            dotEls.forEach(function (dot, idx) {
                dot.classList.toggle('active', navSections[idx] === entries[i].target);
            });
        }
    }, { rootMargin: '-30% 0px -65% 0px' });

    navSections.forEach(function (el) { navObs.observe(el); });
}

// =====================
// TYPEWRITER HERO
// =====================
var typeEl = document.getElementById('typewriter-text');
if (typeEl) {
    var roles = [
        'Software Developer',
        'Full Stack Engineer',
        'Open Source Enthusiast',
        'Passionate Developer',
        'Always Learning',
        'Problem Solver'
    ];

    if (prefersReducedMotion) {
        typeEl.textContent = roles[0];
    } else {
        var roleIdx = 0, isDeleting = false, typedText = '';

        function typeTick() {
            var full = roles[roleIdx];
            typedText = isDeleting
                ? full.substring(0, typedText.length - 1)
                : full.substring(0, typedText.length + 1);

            typeEl.textContent = typedText;

            var delay = isDeleting ? 38 : 75;
            if (!isDeleting && typedText === full) {
                delay = 1800;
                isDeleting = true;
            } else if (isDeleting && typedText === '') {
                isDeleting = false;
                roleIdx = (roleIdx + 1) % roles.length;
                delay = 300;
            }
            setTimeout(typeTick, delay);
        }

        typeTick();
    }
}
// =====================
// BACK TO TOP
// =====================
var backBtn = document.createElement('button');
backBtn.id = 'back-to-top';
backBtn.setAttribute('aria-label', 'Back to top');
backBtn.textContent = '\u2191';
document.body.appendChild(backBtn);

window.addEventListener('scroll', function () {
    backBtn.classList.toggle('visible', window.scrollY > window.innerHeight * 0.5);
}, { passive: true });

backBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
});

// =====================
// HERO CANVAS PARTICLES
// =====================
if (!prefersReducedMotion && !window.matchMedia('(pointer: coarse)').matches) {
    var heroCanvas = document.getElementById('hero-canvas');
    if (heroCanvas) {
        var pctx = heroCanvas.getContext('2d');
        if (pctx) {
            var pts = [];
            var PCOUNT = window.innerWidth < 900 ? 30 : 60;
            var PDIST  = 120;
            var pAnimId;
            // Cache accent RGB; re-read only when theme changes
            var cachedAccentRGB = null;

            function readAccentRGB() {
                // Resolve --accent (hex, rgb(a), hsl(a), or any valid CSS color)
                // to "r,g,b" by letting the browser normalize it via a probe element,
                // rather than assuming a hex string.
                var raw = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
                var probe = document.createElement('div');
                probe.style.color = raw;
                probe.style.display = 'none';
                document.body.appendChild(probe);
                var computed = getComputedStyle(probe).color; // "rgb(r, g, b)" or "rgba(r, g, b, a)"
                document.body.removeChild(probe);
                var nums = computed.match(/[\d.]+/g) || ['91', '141', '184'];
                cachedAccentRGB = nums.slice(0, 3).join(',');
            }

            // Invalidate cache when data-theme attribute changes
            new MutationObserver(readAccentRGB).observe(document.documentElement, {
                attributes: true, attributeFilter: ['data-theme']
            });

            function resizeHero() {
                heroCanvas.width  = heroCanvas.offsetWidth  || heroCanvas.parentElement.offsetWidth;
                heroCanvas.height = heroCanvas.offsetHeight || heroCanvas.parentElement.offsetHeight;
                // Re-scatter particles into the new canvas dimensions
                pts = [];
                for (var pi = 0; pi < PCOUNT; pi++) pts.push(newPt());
            }

            function newPt() {
                return {
                    x:  Math.random() * heroCanvas.width,
                    y:  Math.random() * heroCanvas.height,
                    vx: (Math.random() - 0.5) * 0.45,
                    vy: (Math.random() - 0.5) * 0.45,
                    r:  Math.random() * 1.5 + 0.8
                };
            }

            function drawPts() {
                var rgb = cachedAccentRGB;
                pctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
                for (var pi = 0; pi < pts.length; pi++) {
                    var p = pts[pi];
                    p.x += p.vx; p.y += p.vy;
                    if (p.x < 0 || p.x > heroCanvas.width)  p.vx *= -1;
                    if (p.y < 0 || p.y > heroCanvas.height) p.vy *= -1;
                    pctx.beginPath();
                    pctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    pctx.fillStyle = 'rgba(' + rgb + ',0.55)';
                    pctx.fill();
                }
                for (var a = 0; a < pts.length; a++) {
                    for (var b = a + 1; b < pts.length; b++) {
                        var dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y;
                        var d  = Math.sqrt(dx * dx + dy * dy);
                        if (d < PDIST) {
                            pctx.beginPath();
                            pctx.moveTo(pts[a].x, pts[a].y);
                            pctx.lineTo(pts[b].x, pts[b].y);
                            pctx.strokeStyle = 'rgba(' + rgb + ',' + (0.18 * (1 - d / PDIST)) + ')';
                            pctx.lineWidth = 0.7;
                            pctx.stroke();
                        }
                    }
                }
                pAnimId = requestAnimationFrame(drawPts);
            }

            function startCanvas() {
                readAccentRGB();
                resizeHero();
                pAnimId = requestAnimationFrame(drawPts);
            }

            // defer + load: start immediately if load already fired, else wait
            if (document.readyState === 'complete') {
                startCanvas();
            } else {
                window.addEventListener('load', startCanvas);
            }
            window.addEventListener('resize', resizeHero, { passive: true });
        }
    }
}

// =====================
// COPY EMAIL
// =====================
var copyEmailBtn = document.getElementById('copy-email-btn');
var copyToast    = document.getElementById('copy-toast');
var toastTimer;

if (copyEmailBtn && copyToast) {
    copyEmailBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('terina.seltzer@gmail.com').then(function () {
                clearTimeout(toastTimer);
                copyToast.classList.add('show');
                toastTimer = setTimeout(function () { copyToast.classList.remove('show'); }, 2500);
            }).catch(function () {
                window.location.href = 'mailto:terina.seltzer@gmail.com';
            });
        } else {
            window.location.href = 'mailto:terina.seltzer@gmail.com';
        }
    });
}

// =====================
// CONTACT FORM
// =====================
var contactForm     = document.getElementById('contact-form');
var contactFeedback = document.getElementById('form-feedback');

if (contactForm && contactFeedback) {
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = contactForm.querySelector('button[type="submit"]');
        if (!btn) {
            contactFeedback.className = 'form-feedback error';
            contactFeedback.textContent = 'The contact form is missing its submit button. Please email terina.seltzer@gmail.com directly.';
            return;
        }
        var orig = btn.textContent;
        btn.textContent = 'Sending...';
        btn.disabled = true;
        contactFeedback.className = 'form-feedback';

        fetch(contactForm.action, {
            method: 'POST',
            body: new FormData(contactForm),
            headers: { Accept: 'application/json' }
        }).then(function (res) {
            if (res.ok) {
                contactForm.reset();
                contactFeedback.className = 'form-feedback success';
                contactFeedback.textContent = "Message sent - I'll get back to you soon!";
            } else {
                throw new Error('error');
            }
        }).catch(function () {
            contactFeedback.className = 'form-feedback error';
            contactFeedback.textContent = 'Something went wrong. Please email terina.seltzer@gmail.com directly.';
        }).then(function () {
            btn.textContent = orig;
            btn.disabled = false;
        });
    });
}

// =====================
// COPYRIGHT YEAR
// =====================
var yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// =====================
// TEXT SIZE CONTROL
// =====================
var sizeSlider = document.getElementById('sizeSlider');
var sizeValue = document.getElementById('sizeValue');

if (sizeSlider && sizeValue) {
    var defaultTextSize = 16;
    var minTextSize = Number(sizeSlider.min) || 12;
    var maxTextSize = Number(sizeSlider.max) || 32;
    var savedTextSize = null;
    try { savedTextSize = localStorage.getItem('textSize'); } catch (e) {}

    function normalizeTextSize(value) {
        var parsed = Number(value);
        if (!Number.isFinite(parsed)) parsed = defaultTextSize;
        return String(Math.min(maxTextSize, Math.max(minTextSize, parsed)));
    }

    function setTextSize(value) {
        var normalized = normalizeTextSize(value);
        document.documentElement.style.setProperty('--user-font-size', normalized + 'px');
        sizeSlider.value = normalized;
        sizeValue.textContent = normalized + 'px';
        sizeSlider.setAttribute('aria-valuenow', normalized);
        sizeSlider.setAttribute('aria-valuetext', normalized + ' pixels');
        return normalized;
    }

    setTextSize(savedTextSize || defaultTextSize);
    sizeSlider.addEventListener('input', function () {
        var normalized = setTextSize(sizeSlider.value);
        try { localStorage.setItem('textSize', normalized); } catch (e) {}
    });
}
// =====================
// CHESS POPUP
// =====================
var chessBtn   = document.getElementById('chess');
var chessModal = document.getElementById('chess-modal');
// NOTE: this id must match the close button's id attribute in index.html.
// It was renamed from "chess-modal-close" to "chess-modal-id" there, so it has to match here too.
var chessClose = document.getElementById('chess-modal-id');

if (chessBtn && chessModal && chessClose) {
    function openChessModal() {
        chessModal.hidden = false;
        chessClose.focus();
    }

    function closeChessModal() {
        chessModal.hidden = true;
        chessBtn.focus();
    }

    chessBtn.addEventListener('click', openChessModal);
    chessClose.addEventListener('click', closeChessModal);

    // Close when clicking the dimmed background (but not the box itself)
    chessModal.addEventListener('click', function (e) {
        if (e.target === chessModal) closeChessModal();
    });

    // Close with the Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !chessModal.hidden) closeChessModal();
    });
}

// =====================
// MOBILE NAV TOGGLE
// =====================
var navToggle = document.getElementById('nav-toggle');
var primaryNav = document.getElementById('primary-nav');

if (navToggle && primaryNav) {
    function setNavOpen(open) {
        primaryNav.classList.toggle('open', open);
        navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        navToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
        navToggle.innerHTML = open ? '&times;' : '&#9776;';
    }

    navToggle.addEventListener('click', function () {
        setNavOpen(!primaryNav.classList.contains('open'));
    });

    // Close the menu after choosing a section
    primaryNav.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') setNavOpen(false);
    });

    // Close if the window is resized back to desktop width
    window.addEventListener('resize', function () {
        if (window.innerWidth > 896 && primaryNav.classList.contains('open')) setNavOpen(false);
    }, { passive: true });
}
