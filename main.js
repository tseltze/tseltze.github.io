const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

// =====================
// SCROLL PROGRESS BAR
// =====================
const progressBar = document.getElementById('progress');

window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = `${pct}%`;
    progressBar.setAttribute('aria-valuenow', Math.round(pct));
}, { passive: true });

// =====================
// ACTIVE NAV + DOT NAV
// =====================
const navLinks = document.querySelectorAll('header nav a[href^="#"]');
const scrollTargets = Array.from(navLinks)
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

// Build dot nav from the same section list
const dotNav = document.createElement('nav');
dotNav.className = 'dot-nav';
dotNav.setAttribute('aria-label', 'Section indicator');
const dotItems = scrollTargets.map(section => {
    const dot = document.createElement('a');
    dot.href = `#${section.id}`;
    dot.className = 'dot-nav-item';
    dot.setAttribute('aria-label', `Go to ${section.id} section`);
    dot.title = section.id.charAt(0).toUpperCase() + section.id.slice(1);
    dotNav.appendChild(dot);
    return dot;
});
document.body.appendChild(dotNav);

const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;

        navLinks.forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`header nav a[href="#${id}"]`);
        if (activeLink) activeLink.classList.add('active');

        dotItems.forEach((dot, i) => {
            dot.classList.toggle('active', scrollTargets[i] === entry.target);
        });
    });
}, { rootMargin: '-30% 0px -65% 0px' });

scrollTargets.forEach(el => navObserver.observe(el));

// =====================
// REVEAL ON SCROLL
// =====================
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
    });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// =====================
// TYPEWRITER HERO
// =====================
function initTypewriter() {
    if (prefersReducedMotion) return;
    const el = document.getElementById('typewriter-text');
    if (!el) return;

    const roles = [
        'Software Developer',
        'Full Stack Engineer',
        'Java Developer',
        'Problem Solver',
    ];
    let roleIdx = 0, charIdx = 0, deleting = false;
    const TYPE_SPEED = 75, DELETE_SPEED = 38, PAUSE = 1800;

    function tick() {
        const role = roles[roleIdx];
        if (deleting) {
            charIdx--;
            el.textContent = role.slice(0, charIdx);
            if (charIdx === 0) {
                deleting = false;
                roleIdx = (roleIdx + 1) % roles.length;
                setTimeout(tick, 300);
                return;
            }
            setTimeout(tick, DELETE_SPEED);
        } else {
            charIdx++;
            el.textContent = roles[roleIdx].slice(0, charIdx);
            if (charIdx === roles[roleIdx].length) {
                deleting = true;
                setTimeout(tick, PAUSE);
                return;
            }
            setTimeout(tick, TYPE_SPEED);
        }
    }

    tick();
}

initTypewriter();

// =====================
// HERO CANVAS PARTICLES
// =====================
function initParticles() {
    if (prefersReducedMotion || isTouchDevice) return;
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const COUNT = window.innerWidth < 900 ? 30 : 60;
    const MAX_DIST = 120;
    let particles = [];
    let animId;

    function resize() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    function makeParticle() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.45,
            vy: (Math.random() - 0.5) * 0.45,
            r: Math.random() * 1.5 + 0.8,
        };
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(59,130,246,0.55)';
            ctx.fill();
        }

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MAX_DIST) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(59,130,246,${0.18 * (1 - dist / MAX_DIST)})`;
                    ctx.lineWidth = 0.7;
                    ctx.stroke();
                }
            }
        }

        animId = requestAnimationFrame(draw);
    }

    // Pause particles when hero is out of view to save battery
    const heroSection = document.getElementById('home');
    const visibilityObserver = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
            animId = requestAnimationFrame(draw);
        } else {
            cancelAnimationFrame(animId);
        }
    });
    visibilityObserver.observe(heroSection);

    resize();
    window.addEventListener('resize', resize, { passive: true });
    particles = Array.from({ length: COUNT }, makeParticle);
    animId = requestAnimationFrame(draw);
}

initParticles();

// =====================
// NUMBER COUNTERS
// =====================
function countUp(el, target, suffix, duration = 1400) {
    if (prefersReducedMotion) { el.textContent = target + suffix; return; }
    const start = performance.now();

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const h3 = entry.target.querySelector('h3[data-count]');
        if (!h3) return;
        const target = parseInt(h3.dataset.count, 10);
        const suffix = h3.dataset.suffix || '';
        countUp(h3, target, suffix);
        counterObserver.unobserve(entry.target);
    });
}, { threshold: 0.5 });

document.querySelectorAll('.highlight-card').forEach(card => counterObserver.observe(card));

// =====================
// CARD TILT
// =====================
function initTilt(selector) {
    if (prefersReducedMotion || isTouchDevice) return;

    document.querySelectorAll(selector).forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transition = 'box-shadow 0.3s ease';
            card.style.transform = 'perspective(700px) translateY(-0.4rem)';
        });

        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform =
                `perspective(700px) rotateX(${-y * 7}deg) rotateY(${x * 7}deg) translateY(-0.4rem)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transition = 'transform 0.45s ease, box-shadow 0.3s ease';
            card.style.transform = '';
            setTimeout(() => { card.style.transition = ''; }, 450);
        });
    });
}

initTilt('.skills-card');
initTilt('.jobs-card');
initTilt('.highlight-card');
initTilt('.edu-card');
initTilt('#about');

// =====================
// BACK TO TOP
// =====================
const backToTop = document.createElement('button');
backToTop.id = 'back-to-top';
backToTop.setAttribute('aria-label', 'Back to top');
backToTop.textContent = '↑';
document.body.appendChild(backToTop);

window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > window.innerHeight * 0.5);
}, { passive: true });

backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// =====================
// CURSOR SPOTLIGHT
// =====================
function initSpotlight() {
    if (prefersReducedMotion || isTouchDevice) return;
    const spotlight = document.createElement('div');
    spotlight.id = 'cursor-spotlight';
    document.body.appendChild(spotlight);

    document.addEventListener('mousemove', e => {
        spotlight.style.left = e.clientX + 'px';
        spotlight.style.top  = e.clientY + 'px';
    }, { passive: true });
}

initSpotlight();

// =====================
// KEYWORD RIPPLE
// =====================
document.querySelectorAll('.keyword span').forEach(span => {
    span.addEventListener('click', e => {
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        const rect = span.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${e.clientX - rect.left - size / 2}px;
            top: ${e.clientY - rect.top - size / 2}px;
        `;
        span.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    });
});

// =====================
// HERO FADE ON SCROLL
// =====================
function initHeroFade() {
    if (prefersReducedMotion) return;
    const hero = document.getElementById('home');
    if (!hero) return;
    const content = hero.querySelector('.home-content');
    const img = hero.querySelector('img');

    window.addEventListener('scroll', () => {
        const ratio = window.scrollY / (hero.offsetHeight * 0.65);
        const opacity = Math.max(0, 1 - ratio);
        content.style.opacity = opacity;
        img.style.opacity = opacity;
    }, { passive: true });
}

initHeroFade();

// =====================
// COPY EMAIL TO CLIPBOARD
// =====================
const copyBtn = document.getElementById('copy-email-btn');
const toast   = document.getElementById('copy-toast');
let toastTimer;

if (copyBtn && toast) {
    copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        navigator.clipboard.writeText('terina.seltzer@gmail.com').then(() => {
            clearTimeout(toastTimer);
            toast.classList.add('show');
            toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
        }).catch(() => {
            window.location.href = 'mailto:terina.seltzer@gmail.com';
        });
    });
}

// =====================
// CONTACT FORM — AJAX
// =====================
const form     = document.getElementById('contact-form');
const feedback = document.getElementById('form-feedback');

if (form && feedback) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending…';
        submitBtn.disabled = true;
        feedback.className = 'form-feedback';

        try {
            const res = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                form.reset();
                feedback.className = 'form-feedback success';
                feedback.textContent = "Message sent — I'll get back to you soon!";
            } else {
                throw new Error('Non-OK response');
            }
        } catch {
            feedback.className = 'form-feedback error';
            feedback.textContent = 'Something went wrong. Please email me directly at terina.seltzer@gmail.com';
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// =====================
// COPYRIGHT YEAR
// =====================
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
