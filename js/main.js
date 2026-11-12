/* =====================================================================
   RoseDsigns — interactions (GSAP + ScrollTrigger + Lenis)
   Shared by index.html, work.html, services.html, contact.html.
   Every block checks for its elements so the file is safe on any page.
   ===================================================================== */
(function () {
  'use strict';
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const HOVER = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const pad = (n, l = 2) => String(n).padStart(l, '0');

  /* ---------- hard fallback: never leave the page hidden ---------- */
  function bail() {
    document.documentElement.classList.remove('js');
    document.body.classList.remove('locked');
    const l = $('#loader'); if (l) l.style.display = 'none';
    if (window.gsap) gsap.set('[data-fade],[data-pop],[data-clip],.ln > span,.hside > *', { clearProps: 'all' });
  }
  /* ?nointro skips the loader (handy for reviews/screenshots); ?flat also removes pinning */
  const Q = new URLSearchParams(location.search);
  const NOINTRO = Q.has('nointro') || Q.has('flat'), FLAT = Q.has('flat');
  if (!(window.gsap && window.ScrollTrigger)) { bail(); return; }
  gsap.registerPlugin(ScrollTrigger);
  if (NOINTRO) { $('#loader')?.remove(); gsap.globalTimeline.timeScale(60); }
  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !RM) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = (target, opts = {}) => {
    if (lenis) lenis.scrollTo(target, { offset: -20, duration: 1.4, ...opts });
    else (typeof target === 'string' ? $(target) : target)?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ---------- anchors ---------- */
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length > 1 && $(id)) { e.preventDefault(); closeMenu(); scrollTo(id); }
  }));

  /* ---------- header ---------- */
  const chrome = $('#chrome');
  let lastY = 0;
  function onScroll(y) {
    if (chrome) {
      if (y > lastY && y > 300 && !document.body.classList.contains('menu-open')) chrome.classList.add('hid');
      else chrome.classList.remove('hid');
    }
    lastY = y;
  }
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else addEventListener('scroll', () => onScroll(scrollY), { passive: true });

  /* dark sections flip the cursor colour */
  $$('.process, .numbers, .foot, .cbox.ink').forEach(sec => {
    ScrollTrigger.create({
      trigger: sec, start: 'top bottom-=60', end: 'bottom bottom-=60',
      onToggle: self => { $('#cursor')?.classList.toggle('dark', self.isActive); }
    });
  });

  /* ---------- menu card ---------- */
  const mbtn = $('#mbtn'), menu = $('#menu');
  function toggleMenu(open) {
    document.body.classList.toggle('menu-open', open);
    mbtn?.setAttribute('aria-expanded', open);
    mbtn?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open && menu && !RM) gsap.fromTo($$('#menu .tile, #menu .mstat, #menu .msoc, #menu .mrow'), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .6, stagger: .05, ease: 'power3.out', delay: .1 });
  }
  function closeMenu() { if (document.body.classList.contains('menu-open')) toggleMenu(false); }
  mbtn?.addEventListener('click', () => toggleMenu(!document.body.classList.contains('menu-open')));
  $('#mbackdrop')?.addEventListener('click', closeMenu);
  $$('#menu a').forEach(a => a.addEventListener('click', () => setTimeout(closeMenu, 50)));
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* mark current page in menu tiles + pill nav */
  const page = document.body.dataset.page;
  $$('#menu .tile, .pnav > ul > li > a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (page && page !== 'home' && href.startsWith(page)) a.classList.add('on');
  });

  /* ---------- custom cursor ---------- */
  const cur = $('#cursor');
  if (cur && HOVER && !RM) {
    const lbl = cur.querySelector('.ring span');
    const cx = gsap.quickTo(cur, 'x', { duration: .28, ease: 'power3' });
    const cy = gsap.quickTo(cur, 'y', { duration: .28, ease: 'power3' });
    addEventListener('mousemove', e => { cx(e.clientX); cy(e.clientY); cur.classList.add('vis'); }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => cur.classList.remove('vis'));
    addEventListener('mousedown', () => cur.classList.add('down'));
    addEventListener('mouseup', () => cur.classList.remove('down'));
    document.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-cursor]');
      const h = e.target.closest('a, button, summary, label, input, textarea');
      if (t) { lbl.textContent = t.dataset.cursor; cur.classList.add('lbl'); cur.classList.remove('hov'); }
      else { cur.classList.remove('lbl'); cur.classList.toggle('hov', !!h); }
    });
  } else cur?.remove();

  /* ---------- magnetic buttons ---------- */
  if (HOVER && !RM) $$('[data-magnetic]').forEach(btn => {
    const xTo = gsap.quickTo(btn, 'x', { duration: .4, ease: 'power3' });
    const yTo = gsap.quickTo(btn, 'y', { duration: .4, ease: 'power3' });
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * .28); yTo((e.clientY - r.top - r.height / 2) * .28);
    });
    btn.addEventListener('mouseleave', () => gsap.to(btn, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1,.45)' }));
  });

  /* ---------- 3D tilt cards + light sweep ---------- */
  if (HOVER && !RM) $$('[data-tilt]').forEach(card => {
    const rx = gsap.quickTo(card, 'rotationX', { duration: .6, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: .6, ease: 'power3' });
    gsap.set(card, { transformPerspective: 900 });
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      ry((px - .5) * 8); rx((.5 - py) * 8);
      card.style.setProperty('--mx', px * 100 + '%'); card.style.setProperty('--my', py * 100 + '%');
    });
    card.addEventListener('mouseleave', () => { rx(0); ry(0); });
  });

  /* ---------- reveals ---------- */
  const inHero = el => !!el.closest('#hero');
  $$('.ln').forEach(ln => {
    if (inHero(ln)) return;
    const s = ln.querySelector(':scope > span'); if (!s) return;
    const parent = ln.parentElement;
    if (parent.dataset.lnDone) return; parent.dataset.lnDone = 1;
    const spans = $$(':scope > .ln > span', parent);
    ScrollTrigger.create({ trigger: parent, start: 'top 88%', once: true, onEnter: () => gsap.to(spans, { y: 0, duration: 1.2, stagger: .09, ease: 'power4.out' }) });
  });
  $$('[data-fade]').forEach(el => {
    if (inHero(el)) return;
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }) });
  });
  $$('[data-pop]').forEach((el, i) => {
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(el, { opacity: 1, scale: 1, duration: .9, delay: (i % 4) * .07, ease: 'back.out(1.4)' }) });
  });
  $$('[data-clip]').forEach(el => {
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(el, { clipPath: 'inset(0% 0 0 0 round var(--r))', duration: 1.3, ease: 'power3.out' }) });
  });
  $$('[data-words]').forEach(el => {
    const html = el.innerHTML.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
    el.innerHTML = html;
    gsap.fromTo($$('.w', el), { opacity: .14 }, { opacity: 1, stagger: .04, ease: 'none', scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 50%', scrub: true } });
  });
  $$('[data-parallax]').forEach(el => {
    gsap.fromTo(el, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  $$('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count), suf = el.dataset.suffix || '';
    const o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 1.8, ease: 'power3.out', onUpdate: () => el.textContent = Math.round(o.v) + suf }) });
  });

  /* ---------- hero: entrance + scroll shrink ---------- */
  function heroIn() {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.to('#hero .ln > span', { y: 0, duration: 1.2, stagger: .09 }, 0)
      .to('#hero [data-fade]', { opacity: 1, y: 0, duration: 1, stagger: .08 }, .35)
      .fromTo('#hero .hside > *', { y: 40, opacity: 0, scale: .96 }, { y: 0, opacity: 1, scale: 1, duration: 1.1, stagger: .1, ease: 'power3.out', clearProps: 'scale' }, .2);
  }
  const hmain = $('#hmain');
  if (hmain && !RM) {
    gsap.to(hmain, { scale: .965, borderRadius: '40px', ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ---------- loader ---------- */
  const loader = $('#loader');
  if (loader) {
    const digits = $$('#loader .lcount .dg i');
    const o = { v: 0 };
    const setCount = n => { const s = pad(Math.round(n), 3); digits.forEach((d, i) => d.textContent = s[i]); };
    const petals = $$('#loader .petal');
    const tl = gsap.timeline({ onComplete: () => { loader.style.display = 'none'; document.body.classList.remove('locked'); ScrollTrigger.refresh(); } });
    tl.to(o, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => setCount(o.v) }, 0)
      .to('#loader .lmono', { opacity: 1, scale: 1, duration: 1.2, ease: 'back.out(1.6)' }, .1)
      .to(petals, { opacity: 1, duration: .3, stagger: .04 }, .5)
      .to(petals, {
        x: i => Math.cos(i / petals.length * Math.PI * 2) * (120 + (i % 3) * 40),
        y: i => Math.sin(i / petals.length * Math.PI * 2) * (90 + (i % 2) * 50),
        rotation: i => i * 47, duration: 1.2, ease: 'power3.out'
      }, .5)
      .to(petals, { opacity: 0, duration: .4 }, 1.3)
      .to('#loader .lwipe', { scaleY: 1, duration: .7, ease: 'power4.inOut' }, 1.75)
      .to('#loader .lmono, #loader .lnote, #loader .lcount', { opacity: 0, duration: .3 }, 1.8)
      .to('#loader .lwipe2', { scaleY: 1, duration: .7, ease: 'power4.inOut' }, 1.95)
      .to(loader, { opacity: 0, duration: .5 }, 2.55)
      .add(heroIn, 2.35);
    /* watchdog in case something blocks the timeline */
    setTimeout(() => { if (loader.style.display !== 'none') { bail(); } }, 9000);
  } else {
    document.body.classList.remove('locked');
    if ($('#hero')) heroIn();
    /* sub-pages: reveal page hero */
    const ph = $('.phero');
    if (ph) {
      gsap.to($$('.phero .ln > span'), { y: 0, duration: 1.2, stagger: .09, ease: 'power4.out', delay: .1 });
      gsap.to($$('.phero [data-fade]'), { opacity: 1, y: 0, duration: 1, stagger: .08, ease: 'power3.out', delay: .3 });
    }
  }

  /* ---------- hero: rotating stat ---------- */
  const stat = $('#stat');
  if (stat) {
    const STATS = [
      ['129K', 'views on one Navaratri reel for A2B Yokine'],
      ['4', 'countries reached with Thirai Flicks screenings'],
      ['3<sup>+</sup>', 'brands launched, two more on the horizon'],
      ['08', 'disciplines under one roof, one voice']
    ];
    const num = $('#statNum'), lab = $('#statLab'), dots = $$('#statDots button');
    let i = 0, t;
    const show = k => {
      i = (k + STATS.length) % STATS.length;
      gsap.to([num, lab], { y: -10, opacity: 0, duration: .3, ease: 'power2.in', stagger: .04, onComplete: () => {
        num.innerHTML = STATS[i][0]; lab.textContent = STATS[i][1];
        gsap.fromTo([num, lab], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'power3.out', stagger: .05 });
      } });
      dots.forEach((d, k2) => d.classList.toggle('on', k2 === i));
    };
    const play = () => { clearInterval(t); if (!RM) t = setInterval(() => show(i + 1), 3600); };
    dots.forEach((d, k) => d.addEventListener('click', () => { show(k); play(); }));
    play();
  }

  /* ---------- hero: green slides ---------- */
  const hs = $('#hslides');
  if (hs) {
    const slides = $$('.sl > div', hs), bars = $$('#hbars button');
    let i = 0, t;
    const show = k => { i = (k + slides.length) % slides.length; slides.forEach((s, k2) => s.classList.toggle('on', k2 === i)); bars.forEach((b, k2) => b.classList.toggle('on', k2 === i)); };
    const play = () => { clearInterval(t); if (!RM) t = setInterval(() => show(i + 1), 4200); };
    bars.forEach((b, k) => b.addEventListener('click', () => { show(k); play(); }));
    hs.addEventListener('mouseenter', () => clearInterval(t));
    hs.addEventListener('mouseleave', play);
    play();
  }

  /* ---------- work: stacked deck ---------- */
  const cards = $$('#stack .wcard');
  if (cards.length && !RM && !FLAT && innerWidth > 1024) {
    /* each card simply rises into place over the one before it — no dimming, no scaling */
    cards.forEach((card, i) => {
      if (i === 0) return;
      gsap.from(card, {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: card, start: 'top bottom', end: 'top top+=120', scrub: true }
      });
    });
  }

  /* ---------- process: horizontal pin ---------- */
  const pin = $('.hpin'), track = $('#htrack'), hbar = $('#hbar');
  if (pin && track && innerWidth > 760 && !RM && !FLAT) {
    const dist = () => track.scrollWidth - pin.clientWidth;
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: pin, start: 'top top', end: () => '+=' + dist() * 1.1, pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate: self => { if (hbar) hbar.style.transform = `scaleX(${self.progress})`; }
      }
    });
  }

  /* ---------- footer: letter-flip headline ---------- */
  const lets = $('#lets');
  if (lets) {
    const txt = lets.textContent.trim();
    lets.innerHTML = [...txt].map(c => c === ' ' ? '<span class="ch sp"></span>' : `<span class="ch"><span data-c="${c}">${c}</span></span>`).join('');
    ScrollTrigger.create({ trigger: lets, start: 'top 85%', once: true, onEnter: () => gsap.from($$('.ch', lets), { yPercent: 110, duration: 1.1, stagger: .03, ease: 'power4.out' }) });
  }

  /* ---------- services sweep (hover light) uses --mx/--my set in tilt ---------- */

  /* ---------- studio: interactive showreel ---------- */
  const viewer = $('#viewer');
  if (viewer) {
    const slides = $$('.vstage img', viewer);
    const thumbs = $$('.vthumbs button', viewer);
    const countEl = $('.vcount', viewer), titleEl = $('.vtitle b', viewer), subEl = $('.vtitle .mono', viewer);
    let i = 0, t = null;
    function show(k) {
      i = (k + slides.length) % slides.length;
      slides.forEach((im, n) => im.classList.toggle('on', n === i));
      thumbs.forEach((b, n) => b.classList.toggle('on', n === i));
      countEl.textContent = pad(i + 1) + ' / ' + pad(slides.length);
      const b = thumbs[i];
      gsap.fromTo([titleEl, subEl], { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: .5, stagger: .05, ease: 'power3.out' });
      titleEl.textContent = b.dataset.title; subEl.textContent = b.dataset.sub;
    }
    const play = () => { clearInterval(t); if (!RM) t = setInterval(() => show(i + 1), 3800); };
    thumbs.forEach((b, k) => {
      b.addEventListener('click', () => { show(k); play(); });
      if (HOVER) b.addEventListener('mouseenter', () => { show(k); clearInterval(t); });
    });
    viewer.addEventListener('mouseleave', play);
    new IntersectionObserver(es => { es[0].isIntersecting ? play() : clearInterval(t); }).observe(viewer);
    play();
  }

  /* ---------- work index: hover peek ---------- */
  const peek = $('#peek');
  if (peek && HOVER) {
    const pimg = peek.querySelector('img');
    gsap.set(peek, { xPercent: -50, yPercent: -50 });
    const px = gsap.quickTo(peek, 'x', { duration: .5, ease: 'power3' });
    const py = gsap.quickTo(peek, 'y', { duration: .5, ease: 'power3' });
    $$('[data-peek]').forEach(row => {
      row.addEventListener('mouseenter', e => { pimg.src = row.dataset.peek; px(e.clientX); py(e.clientY); peek.classList.add('on'); });
      row.addEventListener('mousemove', e => { px(e.clientX); py(e.clientY); });
      row.addEventListener('mouseleave', () => peek.classList.remove('on'));
    });
  }

  /* ---------- accordion: opens on hover (desktop), click still works ---------- */
  const accRoot = $('.acc');
  if (accRoot && HOVER) {
    const items = $$('details', accRoot);
    let closeT = null;
    items.forEach(d => {
      d.addEventListener('mouseenter', () => {
        clearTimeout(closeT);
        items.forEach(o => { if (o !== d) o.open = false; });
        d.open = true;
      });
    });
    accRoot.addEventListener('mouseleave', () => {
      closeT = setTimeout(() => { if (!location.hash) items.forEach(o => o.open = false); }, 420);
    });
    /* a summary click would toggle twice while hovering — keep it open instead */
    items.forEach(d => d.querySelector('summary')?.addEventListener('click', e => { if (d.open) e.preventDefault(); }));
  }

  /* ---------- accordion: open the one in the hash ---------- */
  if (location.hash) { const d = $(location.hash); if (d && d.tagName === 'DETAILS') d.open = true; }
  addEventListener('hashchange', () => { const d = $(location.hash); if (d && d.tagName === 'DETAILS') { d.open = true; scrollTo(d, { offset: -110 }); } });

  /* ---------- brief form -> mailto ---------- */
  $$('form.brief').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = (fd.get('client') || '').toString().trim(), email = (fd.get('email') || '').toString().trim();
    const note = form.querySelector('#briefNote, .bnote');
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { if (note) note.textContent = 'Please add your name and a valid email so we can reply.'; form.querySelector(name ? '[name=email]' : '[name=client]')?.focus(); return; }
    const needs = fd.getAll('need').join(', ') || 'Not specified';
    const subject = encodeURIComponent('Project brief — ' + name);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nNeeds: ${needs}\nBudget: ${fd.get('budget') || 'Not specified'}\n\nWhat we have in mind:\n${fd.get('msg') || ''}\n\n— sent from the RoseDsigns landing page`);
    if (note) note.textContent = 'Brief ready — opening your email app…';
    location.href = `mailto:hello@rosedsigns.com?subject=${subject}&body=${body}`;
  }));

  addEventListener('load', () => ScrollTrigger.refresh());
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 200); });
})();
