/* =========================================================
   Lazarus Labs — Shared interactions
   ========================================================= */
(function () {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Starfield ---------- */
  function initStarfield() {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, stars, dpr;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      const count = Math.min(220, Math.floor((window.innerWidth * window.innerHeight) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 0.8 + 0.2,
        r: (Math.random() * 1.3 + 0.3) * dpr,
        tw: Math.random() * Math.PI * 2,
        tws: Math.random() * 0.02 + 0.005
      }));
    }

    let scrollY = window.scrollY;
    window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.tw += s.tws;
        const a = 0.4 + Math.sin(s.tw) * 0.35;
        const py = (s.y - scrollY * s.z * dpr * 0.15) % h;
        const y = py < 0 ? py + h : py;
        ctx.globalAlpha = a * s.z;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduceMotion) requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    draw();
  }

  /* ---------- Mobile nav ---------- */
  function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    if (!toggle || !links) return;
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      toggle.classList.remove('open');
      links.classList.remove('open');
    }));
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      els.forEach(e => e.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(e => io.observe(e));
  }

  /* ---------- Card cursor glow ---------- */
  function initCardGlow() {
    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- Stat count-up ---------- */
  function initCounters() {
    const nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const dur = 1400;
        const start = performance.now();
        function step(now) {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = target * eased;
          el.textContent = (target % 1 === 0 ? Math.round(val) : val.toFixed(1)) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    nums.forEach(n => io.observe(n));
  }

  /* ---------- Pricing estimator ---------- */
  function initEstimator() {
    const root = document.getElementById('estimator');
    if (!root) return;

    const fmt = n => '$' + n.toLocaleString('en-US');

    function recalc() {
      const tierEl = root.querySelector('input[name="tier"]:checked');
      if (!tierEl) return;
      let low = parseInt(tierEl.dataset.low, 10);
      let high = parseInt(tierEl.dataset.high, 10);

      // platform multiplier (apps: build per-platform)
      const platforms = root.querySelectorAll('input[name="platform"]:checked');
      const isApp = tierEl.dataset.type === 'app';
      if (isApp && platforms.length > 1) {
        // second platform adds ~60% of base
        low = Math.round(low * 1.6);
        high = Math.round(high * 1.6);
      }

      let addLow = 0, addHigh = 0;
      root.querySelectorAll('input[name="addon"]:checked').forEach(a => {
        addLow += parseInt(a.dataset.low, 10);
        addHigh += parseInt(a.dataset.high, 10);
      });

      const totalLow = low + addLow;
      const totalHigh = high + addHigh;

      root.querySelector('#est-range').textContent = fmt(totalLow) + ' – ' + fmt(totalHigh);
      const weeks = Math.max(2, Math.round(totalLow / 1600));
      root.querySelector('#est-timeline').textContent = weeks + '–' + (weeks + 4) + ' weeks';

      // platform availability: disable platform group for websites
      const platGroup = root.querySelector('#platform-group');
      if (platGroup) platGroup.style.display = isApp ? '' : 'none';
    }

    root.addEventListener('change', recalc);
    recalc();
  }

  /* ---------- Contact form (graceful, no backend required) ---------- */
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    const status = document.getElementById('form-status');
    const RECIPIENT = 'info@thelazaruslabs.com';
    const keyEl = form.querySelector('input[name="access_key"]');
    const keyConfigured = keyEl && keyEl.value && !/YOUR_WEB3FORMS_ACCESS_KEY/i.test(keyEl.value);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(form);

      // Honeypot: silently drop bot submissions.
      if (data.get('botcheck')) return;

      // If no real access key is configured yet, fall back to a pre-filled email
      // so the form still "works" for the visitor.
      if (!keyConfigured) {
        const body = encodeURIComponent(
          `Name: ${data.get('name')}\nEmail: ${data.get('email')}\nCompany: ${data.get('company') || '-'}\n` +
          `Project: ${data.get('project_type')}\nBudget: ${data.get('budget')}\n\n${data.get('message')}`
        );
        const subject = encodeURIComponent('New project inquiry — ' + (data.get('name') || ''));
        window.location.href = `mailto:${RECIPIENT}?subject=${subject}&body=${body}`;
        if (status) { status.textContent = 'Opening your email app…'; status.className = 'form-status ok'; }
        return;
      }

      // Real delivery via Web3Forms (emails the recipient, no backend needed).
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      if (status) { status.textContent = 'Sending…'; status.className = 'form-status'; }
      try {
        const res = await fetch(form.getAttribute('action'), {
          method: 'POST',
          body: data,
          headers: { Accept: 'application/json' }
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success) {
          form.reset();
          if (status) { status.textContent = "Thanks — your message is in orbit. I'll reply within 24 hours."; status.className = 'form-status ok'; }
        } else {
          throw new Error(json.message || 'bad response');
        }
      } catch (err) {
        if (status) { status.textContent = 'Something went wrong. Email ' + RECIPIENT + ' directly.'; status.className = 'form-status err'; }
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initStarfield();
    initNav();
    initReveal();
    initCardGlow();
    initCounters();
    initEstimator();
    initContactForm();
  });
})();
