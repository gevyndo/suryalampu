/* ============================================================
   main.js — Landing page interactions (Supabase-aware)
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ── Navbar scroll effect ── */
  const navbar = document.getElementById('navbar');
  const onScroll = () => {
    navbar?.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Hamburger menu toggle ── */
  const hamburger  = document.getElementById('navHamburger');
  const mobileMenu = document.getElementById('navMobile');

  hamburger?.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    mobileMenu?.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!navbar?.contains(e.target)) {
      hamburger?.classList.remove('open');
      mobileMenu?.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  /* ── Smooth scroll for anchor links ── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      hamburger?.classList.remove('open');
      mobileMenu?.classList.remove('open');
      document.body.style.overflow = '';
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ── Hero background parallax ── */
  const heroBg = document.querySelector('.hero__bg');
  if (heroBg) {
    window.addEventListener('scroll', () => {
      heroBg.style.transform = `translateY(${window.scrollY * 0.3}px)`;
    }, { passive: true });

    // Kick off bg image load animation
    const img = new Image();
    img.src = '/image/hero.banner';
    img.onload = () => heroBg.classList.add('loaded');
  }

  /* ── Scroll reveal observer ── */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* ── Active navbar link highlight ── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.navbar__link[data-section]');

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(l => l.classList.remove('active'));
          const link = document.querySelector(`.navbar__link[data-section="${entry.target.id}"]`);
          link?.classList.add('active');
        }
      });
    },
    { threshold: 0.4 }
  );
  sections.forEach(s => sectionObserver.observe(s));

  /* ── Products on landing page (async from Supabase) ── */
  const productGrid = document.getElementById('productGrid');
  if (productGrid) {
    try {
      const products = await loadProducts();
      renderProducts(productGrid, products, { limit: 4 });
      // Re-observe newly inserted reveal elements
      productGrid.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    } catch (err) {
      console.error('[Suryalampu] Failed to load products:', err);
      productGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <h3 class="empty-state__title">Gagal memuat produk</h3>
          <p class="empty-state__sub">Periksa koneksi internet Anda dan muat ulang halaman.</p>
        </div>`;
    }
  }

  /* ── Counter animation (stats strip) ── */
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    let current  = 0;
    const step   = target / 60;
    const timer  = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current) + suffix;
      if (current >= target) clearInterval(timer);
    }, 20);
  });

  /* ── Global toast helper ── */
  window.showToast = (msg, duration = 3000) => {
    let toast = document.getElementById('globalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'globalToast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
  };

});
