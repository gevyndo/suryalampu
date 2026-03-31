/* ============================================================
   admin.js — Admin dashboard logic (fully async, Supabase-backed)
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ══════════════════════════════════════
     LOGIN PAGE  (/admin/index.html)
  ══════════════════════════════════════ */
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    // If already logged in, redirect straight to dashboard
    if (isAdminLoggedIn()) {
      window.location.replace('/admin/dashboard.html');
      return;
    }

    const usernameEl = document.getElementById('adminUsername');
    const passwordEl = document.getElementById('adminPassword');
    const errorEl    = document.getElementById('loginError');
    const btnEl      = document.getElementById('loginBtn');

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      errorEl?.classList.remove('show');

      const username = usernameEl?.value.trim() || '';
      const password = passwordEl?.value || '';

      btnEl.textContent = 'Masuk…';
      btnEl.disabled = true;

      // Simulate a tiny delay for UX
      setTimeout(() => {
        if (adminLogin(username, password)) {
          btnEl.textContent = '✓ Berhasil!';
          setTimeout(() => window.location.replace('/admin/dashboard.html'), 400);
        } else {
          if (errorEl) {
            errorEl.textContent = 'Username atau password salah.';
            errorEl.classList.add('show');
          }
          btnEl.textContent = 'Masuk';
          btnEl.disabled = false;
          usernameEl?.focus();
        }
      }, 500);
    });
    return;
  }

  /* ══════════════════════════════════════
     DASHBOARD PAGE  (/admin/dashboard.html)
  ══════════════════════════════════════ */
  const dashboardRoot = document.getElementById('adminDashboard');
  if (!dashboardRoot) return;

  // Auth guard
  if (!isAdminLoggedIn()) {
    window.location.replace('/admin/index.html');
    return;
  }

  /* ── Logout ── */
  document.querySelectorAll('.js-logout').forEach(btn => {
    btn.addEventListener('click', () => {
      adminLogout();
      window.location.replace('/admin/index.html');
    });
  });

  /* ── Tab switching ── */
  const tabBtns   = document.querySelectorAll('.js-tab');
  const tabPanels = document.querySelectorAll('.js-tab-panel');

  function switchTab(tabId) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    tabPanels.forEach(p => p.classList.toggle('hidden', p.id !== tabId));
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      switchTab(btn.dataset.tab);

      // Update header title
      const titles = {
        'tab-overview': '📊 Overview',
        'tab-products': '📦 Kelola Produk',
        'tab-add':      '➕ Tambah Produk',
      };
      const t = titles[btn.dataset.tab];
      if (t) document.getElementById('adminHeaderTitle').textContent = t;

      // Smooth scroll to panel
      const targetPanel = document.getElementById(btn.dataset.tab);
      if (targetPanel) {
        setTimeout(() => targetPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }

      // Re-render overview when switching back
      if (btn.dataset.tab === 'tab-overview') await renderOverviewList();
    });
  });

  /* ── Product count badge sync ── */
  async function updateProductCount() {
    const products = await loadProducts();
    const c = products.length;
    document.querySelectorAll('.js-product-count').forEach(el => el.textContent = c);
    return products;
  }

  /* ── Render admin product list ── */
  const productListEl = document.getElementById('adminProductList');

  async function renderAdminList() {
    if (!productListEl) return;

    // Show loading state
    productListEl.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--clr-gray);">
      <span style="font-size:1.4rem;">⏳</span><br>Memuat produk…
    </div>`;

    const products = await updateProductCount();

    if (products.length === 0) {
      productListEl.innerHTML = `
        <div class="empty-state" style="padding:3rem 1rem;">
          <div class="empty-state__icon">📦</div>
          <h3 class="empty-state__title">Belum ada produk</h3>
          <p class="empty-state__sub">Tambah produk pertama Anda di tab "Tambah Produk".</p>
        </div>`;
      return;
    }

    productListEl.innerHTML = products.map((p, idx) => {
      const icon = typeof getProductIcon === 'function' ? getProductIcon(p.name) : '💡';
      const thumbHtml = p.image_url
        ? `<img src="${p.image_url}" alt="${escHtml(p.name)}" class="product-item__thumb">`
        : `<div class="product-item__thumb-ph">${icon}</div>`;

      return `
        <div class="product-item" data-id="${p.id}">
          <span class="drag-handle" title="Reorder">⠿</span>
          ${thumbHtml}
          <div class="product-item__info">
            <div class="product-item__name">${escHtml(p.name)}</div>
            <div class="product-item__desc">${escHtml(p.description)}</div>
          </div>
          <div class="product-item__actions">
            <button class="item-action-btn js-move-up"   data-id="${p.id}" title="Pindah ke atas"   ${idx === 0 ? 'disabled' : ''}>↑</button>
            <button class="item-action-btn js-move-down" data-id="${p.id}" title="Pindah ke bawah" ${idx === products.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="item-action-btn danger js-delete" data-id="${p.id}" title="Hapus produk">🗑</button>
          </div>
        </div>`;
    }).join('');

    /* Bind action buttons */
    productListEl.querySelectorAll('.js-move-up').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await reorderProduct(btn.dataset.id, 'up');
          await renderAdminList();
          showAdminToast('Urutan diperbarui.');
        } catch (err) {
          showAdminToast('Gagal mengubah urutan: ' + err.message);
          btn.disabled = false;
        }
      });
    });

    productListEl.querySelectorAll('.js-move-down').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await reorderProduct(btn.dataset.id, 'down');
          await renderAdminList();
          showAdminToast('Urutan diperbarui.');
        } catch (err) {
          showAdminToast('Gagal mengubah urutan: ' + err.message);
          btn.disabled = false;
        }
      });
    });

    productListEl.querySelectorAll('.js-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Hapus produk ini? Tindakan ini tidak dapat dibatalkan.')) return;
        btn.disabled = true;
        btn.textContent = '⏳';
        try {
          await deleteProduct(btn.dataset.id);
          await renderAdminList();
          showAdminToast('Produk dihapus.');
        } catch (err) {
          showAdminToast('Gagal menghapus: ' + err.message);
          await renderAdminList();
        }
      });
    });
  }

  // Initial render
  await renderAdminList();

  /* ── Overview recent products ── */
  async function renderOverviewList() {
    const el = document.getElementById('overviewProductList');
    if (!el) return;

    el.innerHTML = `<p style="color:var(--clr-gray);font-size:.9rem;">Memuat…</p>`;
    const products = await loadProducts();

    if (!products.length) {
      el.innerHTML = `<p style="color:var(--clr-gray);font-size:.9rem;">Belum ada produk.</p>`;
      return;
    }

    el.innerHTML = products.slice(0, 3).map(p => {
      const icon = typeof getProductIcon === 'function' ? getProductIcon(p.name) : '💡';
      const thumbHtml = p.image_url
        ? `<img src="${p.image_url}" alt="${escHtml(p.name)}" class="product-item__thumb">`
        : `<div class="product-item__thumb-ph">${icon}</div>`;
      return `<div class="product-item">
        ${thumbHtml}
        <div class="product-item__info">
          <div class="product-item__name">${escHtml(p.name)}</div>
          <div class="product-item__desc">${escHtml(p.description)}</div>
        </div>
      </div>`;
    }).join('');
  }

  await renderOverviewList();

  /* ── Add Product Form ── */
  const addForm    = document.getElementById('addProductForm');
  const imgUpload  = document.getElementById('imgUpload');
  const imgPreview = document.getElementById('imgPreview');
  const uploadArea = document.getElementById('uploadArea');

  let pendingImageFile = null; // File object (not data URL)

  // Image preview
  imgUpload?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showAdminToast('File harus berupa gambar.'); return; }
    if (file.size > 5 * 1024 * 1024) { showAdminToast('Gambar maksimal 5MB.'); return; }

    pendingImageFile = file;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (imgPreview) {
        imgPreview.src = ev.target.result;
        imgPreview.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  });

  // Drag & drop
  uploadArea?.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const dt = new DataTransfer();
      dt.items.add(file);
      imgUpload.files = dt.files;
      imgUpload.dispatchEvent(new Event('change'));
    }
  });

  // Reset preview on form reset
  document.getElementById('resetProductBtn')?.addEventListener('click', () => {
    pendingImageFile = null;
    if (imgPreview) { imgPreview.src = ''; imgPreview.style.display = 'none'; }
  });

  addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('productName')?.value.trim();
    const desc = document.getElementById('productDesc')?.value.trim();

    if (!name) { showAdminToast('Nama produk wajib diisi.'); return; }
    if (!desc)  { showAdminToast('Deskripsi produk wajib diisi.'); return; }

    const submitBtn = document.getElementById('submitProductBtn');
    submitBtn.textContent = pendingImageFile ? '📤 Mengupload gambar…' : '💾 Menyimpan…';
    submitBtn.disabled = true;

    try {
      await addProduct({ name, description: desc, imageFile: pendingImageFile });

      // Reset form
      addForm.reset();
      if (imgPreview) { imgPreview.src = ''; imgPreview.style.display = 'none'; }
      pendingImageFile = null;

      // Switch to product list and refresh
      switchTab('tab-products');
      document.getElementById('adminHeaderTitle').textContent = '📦 Kelola Produk';
      await renderAdminList();

      showAdminToast('✓ Produk berhasil ditambahkan!');
    } catch (err) {
      showAdminToast('Gagal menyimpan: ' + err.message);
      console.error(err);
    } finally {
      submitBtn.textContent = '✓ Simpan Produk';
      submitBtn.disabled = false;
    }
  });

  /* ── Admin toast ── */
  function showAdminToast(msg) {
    let toast = document.getElementById('adminToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'adminToast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 3500);
  }
});

/* ── Tiny HTML escaper used in admin list ── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
