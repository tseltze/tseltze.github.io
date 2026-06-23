document.addEventListener('DOMContentLoaded', function () {

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    // =====================
    // SCROLL PROGRESS BAR
    // =====================
    var progressBar = document.getElementById('progress');
    if (progressBar) {
        window.addEventListener('scroll', function () {
            var scrollTop = document.documentElement.scrollTop;
            var scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            var pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
            progressBar.style.width = pct + '%';
            progressBar.setAttribute('aria-valuenow', Math.round(pct));
        }, { passive: true });
    }

    // =====================
    // ACTIVE NAV + DOT NAV
    // =====================
    var navLinks = document.querySelectorAll('header nav a[href^="#"]');
    var scrollTargets = [];
    navLinks.forEach(function (a) {
        var target = document.querySelector(a.getAttribute('href'));
        if (target) scrollTargets.push(target);
    });

    var dotNav = document.createElement('nav');
    dotNav.className = 'dot-nav';
    dotNav.setAttribute('aria-label', 'Section indicator');
    var dotItems = scrollTargets.map(function (section) {
        var dot = document.createElement('a');
        dot.href = '#' + section.id;
        dot.className = 'dot-nav-item';
        dot.setAttribute('aria-label', 'Go to ' + section.id + ' section');
        dot.title = section.id.charAt(0).toUpperCase() + section.id.slice(1);
        dotNav.appendChild(dot);
        return dot;
    });
    document.body.appendChild(dotNav);

    if (scrollTargets.length > 0) {
        var navObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var id = entry.target.id;
                navLinks.forEach(function (link) { link.classList.remove('active'); });
                var activeLink = document.querySelector('header nav a[href="#' + id + '"]');
                if (activeLink) activeLink.classList.add('active');
                dotItems.forEach(function (dot, i) {
                    dot.classList.toggle('active', scrollTargets[i] === entry.target);
                });
            });
        }, { rootMargin: '-30% 0px -65% 0px' });

        scrollTargets.forEach(function (el) { navObserver.observe(el); });
    }

    // =====================
    // REVEAL ON SCROLL
    // =====================
    var revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length > 0) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            });
        }, { threshold: 0.1 });

        revealEls.forEach(function (el) { revealObserver.observe(el); });
    }

    // =====================
    // TYPEWRITER HERO
    // =====================
    var typewriterEl = document.getElementById('typewriter-text');
    if (typewriterEl) {
        var roles = ['Software Developer', 'Full Stack Engineer', 'Java Developer', 'Problem Solver'];
        var roleIdx = 0;
        var isDeleting = false;
        var text = '';

        function type() {
            var full = roles[roleIdx];
            if (isDeleting) {
                text = full.substring(0, text.length - 1);
            } else {
                text = full.substring(0, text.length + 1);
            }

            typewriterEl.textContent = text;

            var delay = isDeleting ? 38 : 75;

            if (!isDeleting && text === full) {
                delay = 1800;
                isDeleting = true;
            } else if (isDeleting && text === '') {
                isDeleting = false;
                roleIdx = (roleIdx + 1) % roles.length;
                delay = 300;
            }

            setTimeout(type, delay);
        }

        type();
    }

    // =====================
    // HERO CANVAS PARTICLES
    // =====================
    if (!prefersReducedMotion && !isTouchDevice) {
        var canvas = document.getElementById('hero-canvas');
        if (canvas) {
            var ctx = canvas.getContext('2d');
            if (ctx) {
                var COUNT = window.innerWidth < 900 ? 30 : 60;
                var MAX_DIST = 120;
                var particles = [];
                var animId;

                function resizeCanvas() {
                    canvas.width = canvas.offsetWidth;
                    canvas.height = canvas.offsetHeight;
                }

                function makeParticle() {
                    return {
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        vx: (Math.random() - 0.5) * 0.45,
                        vy: (Math.random() - 0.5) * 0.45,
                        r: Math.random() * 1.5 + 0.8
                    };
                }

                function drawParticles() {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    for (var pi = 0; pi < particles.length; pi++) {
                        var p = particles[pi];
                        p.x += p.vx;
                        p.y += p.vy;
                        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
                        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(59,130,246,0.55)';
                        ctx.fill();
                    }

                    for (var i = 0; i < particles.length; i++) {
                        for (var j = i + 1; j < particles.length; j++) {
                            var dx = particles[i].x - particles[j].x;
                            var dy = particles[i].y - particles[j].y;
                            var dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < MAX_DIST) {
                                ctx.beginPath();
                                ctx.moveTo(particles[i].x, particles[i].y);
                                ctx.lineTo(particles[j].x, particles[j].y);
                                ctx.strokeStyle = 'rgba(59,130,246,' + (0.18 * (1 - dist / MAX_DIST)) + ')';
                                ctx.lineWidth = 0.7;
                                ctx.stroke();
                            }
                        }
                    }

                    animId = requestAnimationFrame(drawParticles);
                }

                resizeCanvas();
                window.addEventListener('resize', resizeCanvas, { passive: true });
                for (var pi = 0; pi < COUNT; pi++) particles.push(makeParticle());
                animId = requestAnimationFrame(drawParticles);
            }
        }
    }

    // =====================
    // NUMBER COUNTERS
    // =====================
    var counterCards = document.querySelectorAll('.highlight-card');
    if (counterCards.length > 0) {
        var counterObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var h3 = entry.target.querySelector('h3[data-count]');
                if (!h3) return;
                var target = parseInt(h3.getAttribute('data-count'), 10);
                var suffix = h3.getAttribute('data-suffix') || '';
                if (prefersReducedMotion) {
                    h3.textContent = target + suffix;
                } else {
                    var start = performance.now();
                    var duration = 1400;
                    function step(now) {
                        var progress = Math.min((now - start) / duration, 1);
                        var eased = 1 - Math.pow(1 - progress, 3);
                        h3.textContent = Math.round(eased * target) + suffix;
                        if (progress < 1) requestAnimationFrame(step);
                    }
                    requestAnimationFrame(step);
                }
                counterObserver.unobserve(entry.target);
            });
        }, { threshold: 0.5 });

        counterCards.forEach(function (card) { counterObserver.observe(card); });
    }

    // =====================
    // BACK TO TOP
    // =====================
    var backToTop = document.createElement('button');
    backToTop.id = 'back-to-top';
    backToTop.setAttribute('aria-label', 'Back to top');
    backToTop.textContent = '↑';
    document.body.appendChild(backToTop);

    window.addEventListener('scroll', function () {
        if (window.scrollY > window.innerHeight * 0.5) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    }, { passive: true });

    backToTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // =====================
    // CURSOR SPOTLIGHT
    // =====================
    if (!prefersReducedMotion && !isTouchDevice) {
        var spotlight = document.createElement('div');
        spotlight.id = 'cursor-spotlight';
        document.body.appendChild(spotlight);

        document.addEventListener('mousemove', function (e) {
            spotlight.style.left = e.clientX + 'px';
            spotlight.style.top  = e.clientY + 'px';
        }, { passive: true });
    }

    // =====================
    // KEYWORD RIPPLE
    // =====================
    document.querySelectorAll('.keyword span').forEach(function (span) {
        span.addEventListener('click', function (e) {
            var ripple = document.createElement('span');
            ripple.className = 'ripple-effect';
            var rect = span.getBoundingClientRect();
            var size = Math.max(rect.width, rect.height);
            ripple.style.width  = size + 'px';
            ripple.style.height = size + 'px';
            ripple.style.left   = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top    = (e.clientY - rect.top  - size / 2) + 'px';
            span.appendChild(ripple);
            ripple.addEventListener('animationend', function () { ripple.remove(); });
        });
    });

    // =====================
    // HERO FADE ON SCROLL
    // =====================
    if (!prefersReducedMotion) {
        var heroSection = document.getElementById('home');
        if (heroSection) {
            var heroContent = heroSection.querySelector('.home-content');
            var heroImg = heroSection.querySelector('img');
            window.addEventListener('scroll', function () {
                var ratio = window.scrollY / (heroSection.offsetHeight * 0.65);
                var opacity = Math.max(0, 1 - ratio);
                if (heroContent) heroContent.style.opacity = opacity;
                if (heroImg)     heroImg.style.opacity     = opacity;
            }, { passive: true });
        }
    }

    // =====================
    // COPY EMAIL
    // =====================
    var copyBtn = document.getElementById('copy-email-btn');
    var toast   = document.getElementById('copy-toast');
    var toastTimer;

    if (copyBtn && toast) {
        copyBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (navigator.clipboard) {
                navigator.clipboard.writeText('terina.seltzer@gmail.com').then(function () {
                    clearTimeout(toastTimer);
                    toast.classList.add('show');
                    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2500);
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
    var form     = document.getElementById('contact-form');
    var feedback = document.getElementById('form-feedback');

    if (form && feedback) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var submitBtn = form.querySelector('button[type="submit"]');
            var originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending…';
            submitBtn.disabled = true;
            feedback.className = 'form-feedback';

            fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { Accept: 'application/json' }
            }).then(function (res) {
                if (res.ok) {
                    form.reset();
                    feedback.className = 'form-feedback success';
                    feedback.textContent = "Message sent — I'll get back to you soon!";
                } else {
                    throw new Error('error');
                }
            }).catch(function () {
                feedback.className = 'form-feedback error';
                feedback.textContent = 'Something went wrong. Please email me directly at terina.seltzer@gmail.com';
            }).finally(function () {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
        });
    }

    // =====================
    // COPYRIGHT YEAR
    // =====================
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

});
