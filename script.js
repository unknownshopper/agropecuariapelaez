(function () {
  const burger = document.querySelector('[data-burger]');
  const mobile = document.querySelector('[data-mobile-menu]');

  if (burger && mobile) {
    burger.addEventListener('click', () => {
      const open = mobile.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    mobile.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      mobile.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    });
  }
})();

(function () {
  const storageKey = 'theme';
  const root = document.documentElement;

  const systemPrefersDark = () => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const apply = (theme) => {
    root.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      btn.setAttribute('data-theme-current', theme);
    });
  };

  const getStored = () => {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  };

  const setStored = (theme) => {
    try {
      localStorage.setItem(storageKey, theme);
    } catch {}
  };

  const initial = getStored() || (systemPrefersDark() ? 'dark' : 'light');
  apply(initial);

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    const current = root.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    apply(next);
    setStored(next);
  });

  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', () => {
      const stored = getStored();
      if (stored) return;
      apply(systemPrefersDark() ? 'dark' : 'light');
    });
  }
})();

(function () {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const slidesRoot = document.querySelector('[data-slides]');
  if (!slidesRoot) return;

  const slides = Array.from(document.querySelectorAll('[data-slide]'));
  const dots = Array.from(document.querySelectorAll('[data-dot]'));

  if (!slides.length) return;

  let index = slides.findIndex((s) => s.classList.contains('is-active'));
  if (index < 0) index = 0;

  const setActive = (nextIndex) => {
    index = (nextIndex + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
    dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
  };

  const go = (delta) => setActive(index + delta);

  dots.forEach((d) => {
    d.addEventListener('click', () => {
      const n = Number(d.getAttribute('data-dot'));
      if (Number.isFinite(n)) setActive(n);
    });
  });

  let timer = null;
  const start = () => {
    if (reduceMotion) return;
    stop();
    timer = window.setInterval(() => go(1), 6500);
  };

  const stop = () => {
    if (timer) window.clearInterval(timer);
    timer = null;
  };

  slidesRoot.addEventListener('mouseenter', stop);
  slidesRoot.addEventListener('mouseleave', start);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  start();

  if (reduceMotion) return;

  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      const hero = slidesRoot.closest('.hero');
      if (!hero) return;

      const rect = hero.getBoundingClientRect();
      const viewH = window.innerHeight || 1;
      const t = Math.min(1, Math.max(0, (viewH - rect.top) / (viewH + rect.height)));
      const offset = (t - 0.5) * 24;

      slides.forEach((s) => {
        s.style.transform = `translate3d(0, ${-offset}px, 0) scale(1.04)`;
      });
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // Swipe/drag gestures (mobile finger + desktop mouse)
  // Pointer Events unify touch/mouse. We only care about horizontal swipe.
  let startX = 0;
  let startY = 0;
  let activePointer = null;
  let moved = false;

  const onPointerDown = (e) => {
    if (reduceMotion) return;
    activePointer = e.pointerId;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    try {
      slidesRoot.setPointerCapture(activePointer);
    } catch {}
  };

  const onPointerMove = (e) => {
    if (activePointer !== e.pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
    // If user is mostly swiping horizontally, prevent accidental scroll.
    if (Math.abs(dx) > Math.abs(dy) * 1.2 && Math.abs(dx) > 10) {
      e.preventDefault();
    }
  };

  const onPointerUp = (e) => {
    if (activePointer !== e.pointerId) return;
    activePointer = null;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const mostlyHorizontal = Math.abs(dx) > Math.abs(dy) * 1.2;
    if (!moved || !mostlyHorizontal) return;

    const threshold = 42;
    if (dx <= -threshold) go(1);
    else if (dx >= threshold) go(-1);
  };

  slidesRoot.addEventListener('pointerdown', onPointerDown, { passive: true });
  slidesRoot.addEventListener('pointermove', onPointerMove, { passive: false });
  slidesRoot.addEventListener('pointerup', onPointerUp, { passive: true });
  slidesRoot.addEventListener('pointercancel', () => {
    activePointer = null;
  });
})();

(function () {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const carousels = Array.from(document.querySelectorAll('[data-carousel]'));
  if (!carousels.length) return;

  carousels.forEach((carousel) => {
    const track = carousel.querySelector('.carousel-track');
    if (!track) return;

    const cards = Array.from(track.querySelectorAll('.card--carousel'));
    if (cards.length < 2) return;

    // Auto-scroll
    let timer = null;
    let resumeTimer = null;
    const resumeDelayMs = 1400;

    const scheduleResume = () => {
      if (reduceMotion) return;
      if (resumeTimer) window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        resumeTimer = null;
        start();
      }, resumeDelayMs);
    };

    const getStep = () => {
      const first = cards[0];
      if (!first) return 320;
      const style = window.getComputedStyle(track);
      const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
      return first.getBoundingClientRect().width + gap;
    };

    const tick = (dir = 1) => {
      const step = getStep();
      const maxScroll = track.scrollWidth - track.clientWidth;
      const next = track.scrollLeft + step * dir;
      if (dir > 0 && next >= maxScroll - 4) track.scrollTo({ left: 0, behavior: 'smooth' });
      else if (dir < 0 && next <= 0) track.scrollTo({ left: maxScroll, behavior: 'smooth' });
      else track.scrollBy({ left: step * dir, behavior: 'smooth' });
    };

    const start = () => {
      if (reduceMotion) return;
      stop();
      timer = window.setInterval(() => tick(1), 4200);
    };

    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = null;
    };

    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', scheduleResume);

    // Touch intent
    carousel.addEventListener('touchstart', stop, { passive: true });
    carousel.addEventListener('touchend', scheduleResume, { passive: true });

    // Trackpad / mousewheel horizontal scroll
    track.addEventListener('wheel', () => {
      stop();
      scheduleResume();
    }, { passive: true });

    // Any manual scrolling should pause and resume after a brief idle.
    let scrollDebounce = 0;
    track.addEventListener('scroll', () => {
      stop();
      if (scrollDebounce) window.clearTimeout(scrollDebounce);
      scrollDebounce = window.setTimeout(() => {
        scrollDebounce = 0;
        scheduleResume();
      }, 120);
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });

    start();

    // Buttons
    const prevBtn = carousel.querySelector('[data-carousel-prev]');
    const nextBtn = carousel.querySelector('[data-carousel-next]');
    prevBtn?.addEventListener('click', () => {
      stop();
      tick(-1);
      scheduleResume();
    });
    nextBtn?.addEventListener('click', () => {
      stop();
      tick(1);
      scheduleResume();
    });

    // Drag / swipe to scroll the carousel
    let isDown = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let pointerId = null;
    let didDrag = false;
    const dragStartThresholdPx = 14;
    const dragDirectionRatio = 1.2;
    let hasCapture = false;

    const down = (e) => {
      if (e.button != null && e.button !== 0) return;
      isDown = true;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = track.scrollLeft;
      didDrag = false;
      hasCapture = false;
      stop();
      if (resumeTimer) window.clearTimeout(resumeTimer);
    };

    const move = (e) => {
      if (!isDown || e.pointerId !== pointerId) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!didDrag) {
        const mostlyHorizontal = Math.abs(dx) > Math.abs(dy) * dragDirectionRatio;
        if (!mostlyHorizontal) return;
        if (Math.abs(dx) < dragStartThresholdPx) return;
      }

      didDrag = true;
      if (!hasCapture) {
        hasCapture = true;
        track.classList.add('is-dragging');
        track.style.userSelect = 'none';
        try {
          track.setPointerCapture(pointerId);
        } catch {}
      }
      track.scrollLeft = startLeft - dx;
      e.preventDefault();
    };

    const up = (e) => {
      if (e.pointerId !== pointerId) return;
      isDown = false;
      pointerId = null;
      track.classList.remove('is-dragging');
      track.style.userSelect = '';
      if (didDrag) {
        // Prevent accidental navigation when the user was dragging.
        const cancelClickOnce = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          track.removeEventListener('click', cancelClickOnce, true);
        };
        track.addEventListener('click', cancelClickOnce, true);
      }
      scheduleResume();
    };

    track.addEventListener('pointerdown', down, { passive: true });
    track.addEventListener('pointermove', move, { passive: false });
    track.addEventListener('pointerup', up, { passive: true });
    track.addEventListener('pointercancel', up, { passive: true });
  });
})();

(function () {
  const mapEl = document.querySelector('[data-contact-map]');
  if (!mapEl) return;
  if (!window.L) return;

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mexico overview -> Office zoom
  const mexicoCenter = [23.6345, -102.5528];
  const mexicoZoom = 5;

  // Office (from the provided Google embed)
  const office = { lat: 18.03050008297051, lng: -92.91500602486634 };
  const officeZoom = 16;

  const map = window.L.map(mapEl, {
    zoomControl: false,
    scrollWheelZoom: false,
    dragging: true,
    tap: true,
  }).setView(mexicoCenter, mexicoZoom);

  const streets = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  });

  // Satellite imagery (no API key) via Esri World Imagery
  const satellite = window.L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri',
    }
  );

  // Default: satellite for stronger visual impact
  satellite.addTo(map);

  // Keep streets as an optional base (no UI by default)
  window.L.control.layers(
    { Satélite: satellite, Calles: streets },
    undefined,
    { collapsed: true, position: 'bottomright' }
  ).addTo(map);

  const marker = window.L.marker([office.lat, office.lng]).addTo(map);

  const animateToOffice = () => {
    if (reduceMotion) {
      map.setView([office.lat, office.lng], officeZoom);
      return;
    }

    // Step 1: ensure we are on Mexico overview
    map.setView(mexicoCenter, mexicoZoom, { animate: false });
    // Step 2: cinematic zoom
    window.setTimeout(() => {
      map.flyTo([office.lat, office.lng], officeZoom, {
        duration: 4,
        easeLinearity: 0.22,
      });
    }, 250);
  };

  let didRun = false;
  const runOnce = () => {
    if (didRun) return;
    didRun = true;
    animateToOffice();
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          runOnce();
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(mapEl);
  } else {
    // Fallback
    window.setTimeout(runOnce, 600);
  }

  // Ensure proper tile sizing after layout
  window.setTimeout(() => map.invalidateSize(true), 300);
})();