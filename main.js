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
// ACTIVE NAV ON SCROLL
// =====================
const navLinks = document.querySelectorAll('nav a[href^="#"]');
const scrollTargets = Array.from(navLinks)
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => link.classList.remove('active'));
        const active = document.querySelector(`nav a[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
    });
}, {
    rootMargin: '-30% 0px -65% 0px'
});

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
// COPY EMAIL TO CLIPBOARD
// =====================
const copyBtn = document.getElementById('copy-email-btn');
const toast = document.getElementById('copy-toast');
let toastTimer;

if (copyBtn && toast) {
    copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        navigator.clipboard.writeText('terina.seltzer@gmail.com').then(() => {
            clearTimeout(toastTimer);
            toast.classList.add('show');
            toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
        }).catch(() => {
            // Fallback: open mailto if clipboard is unavailable
            window.location.href = 'mailto:terina.seltzer@gmail.com';
        });
    });
}

// =====================
// CONTACT FORM — AJAX SUBMIT
// =====================
const form = document.getElementById('contact-form');
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
                headers: { Accept: 'application/json' }
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
