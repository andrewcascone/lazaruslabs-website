/* =========================================================
   App pages — feature tour
   One feature is open at a time. On wide screens the tour steps
   through the features on its own while it's in view, until the
   visitor picks one; then it stays where they put it.
   ========================================================= */
(function () {
  'use strict';

  function initTour(tour) {
    const items = Array.from(tour.querySelectorAll('.tour-item'));
    if (!items.length) return;

    const STEP_MS = 8000;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wide = window.matchMedia('(min-width: 900px)');
    let current = Math.max(0, items.findIndex((it) => it.classList.contains('is-active')));
    let auto = !reduceMotion;
    let inView = false;
    let timer = null;

    tour.style.setProperty('--tour-ms', STEP_MS + 'ms');

    function show(index) {
      current = index;
      items.forEach((it, i) => {
        const on = i === index;
        it.classList.toggle('is-active', on);
        it.querySelector('.tour-tab').setAttribute('aria-expanded', String(on));
      });
    }

    function schedule() {
      clearTimeout(timer);
      const running = auto && inView && wide.matches;
      tour.classList.toggle('is-auto', running);
      if (!running) return;
      // Restart the progress bar on the newly active feature.
      const bar = items[current].querySelector('.tour-progress i');
      bar.style.animation = 'none';
      void bar.offsetHeight;
      bar.style.animation = '';
      timer = setTimeout(() => {
        show((current + 1) % items.length);
        schedule();
      }, STEP_MS);
    }

    items.forEach((it, i) => {
      it.querySelector('.tour-tab').addEventListener('click', () => {
        auto = false;
        show(i);
        schedule();
        // On narrow screens the previous feature collapses above this one;
        // keep the tapped feature in view.
        if (!wide.matches) {
          setTimeout(() => {
            const top = it.getBoundingClientRect().top;
            if (top < 80) window.scrollBy({ top: top - 88, behavior: reduceMotion ? 'auto' : 'smooth' });
          }, 60);
        }
      });
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        inView = entries[0].isIntersecting;
        schedule();
      }, { threshold: 0.45 }).observe(tour);
    }
    wide.addEventListener('change', schedule);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tour').forEach(initTour);
  });
})();
