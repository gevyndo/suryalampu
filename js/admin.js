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
    const errorEl = document.getElementById('loginError');
    const btnEl = document.getElementById('loginBtn');

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

  /* ── Save Reordered List ── */
  const saveOrderBtn = document.getElementById('saveOrderBtn');
  if (saveOrderBtn) {
    saveOrderBtn.addEventListener('click', async () => {
      const productListEl = document.getElementById('adminProductList');
      if (!productListEl) return;

      const allItems = Array.from(productListEl.querySelectorAll('.product-item'));

      saveOrderBtn.disabled = true;
      saveOrderBtn.textContent = '⏳ Menyimpan...';
      productListEl.style.opacity = '0.5';
      productListEl.style.pointerEvents = 'none';

      try {
        // Extract original positions of the displayed items and sort them
        const originalPositions = allItems.map(el => parseInt(el.dataset.position, 10)).sort((a, b) => a - b);

        const updates = allItems.map((el, i) => ({
          id: el.dataset.id,
          position: originalPositions[i]
        }));
        await updateProductsOrder(updates);
        await renderAdminList();
        showAdminToast('✓ Urutan berhasil disimpan!');
        saveOrderBtn.style.display = 'none';
      } catch (err) {
        showAdminToast('Gagal menyimpan urutan: ' + err.message);
        await renderAdminList(); // revert
      } finally {
        saveOrderBtn.disabled = false;
        saveOrderBtn.textContent = '💾 Simpan Urutan';
        productListEl.style.opacity = '1';
        productListEl.style.pointerEvents = 'auto';
      }
    });
  }

  /* ── Tab switching ── */
  const tabBtns = document.querySelectorAll('.js-tab');
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
        'tab-add': '➕ Tambah Produk',
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

  /* ── Filter Admin Product List ── */
  let currentAdminFilter = 'all';
  const adminFilterEl = document.getElementById('adminCategoryFilter');
  if (adminFilterEl) {
    adminFilterEl.addEventListener('change', async (e) => {
      currentAdminFilter = e.target.value;
      await renderAdminList();
    });
  }

  /* ── Render admin product list ── */
  const productListEl = document.getElementById('adminProductList');

  async function renderAdminList() {
    if (!productListEl) return;

    // Show loading state
    productListEl.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--clr-gray);">
      <span style="font-size:1.4rem;">⏳</span><br>Memuat produk…
    </div>`;

    const allProducts = await updateProductCount();
    const products = currentAdminFilter === 'all' 
      ? allProducts 
      : allProducts.filter(p => p.category === currentAdminFilter);

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
      const urls = p.image_url ? p.image_url.split(',').map(u => u.trim()).filter(u => u.length > 0 && u.startsWith('http')) : [];
      const firstImage = urls.length > 0 ? urls[0] : null;
      const thumbHtml = firstImage
        ? `<img src="${firstImage}" alt="${escHtml(p.name)}" class="product-item__thumb">`
        : `<div class="product-item__thumb-ph">${icon}</div>`;

      return `
        <div class="product-item" data-id="${p.id}" data-position="${p.position}" draggable="true">
          <span class="drag-handle" title="Reorder (Tahan & Geser)">⠿</span>
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
      btn.addEventListener('click', () => {
        const item = btn.closest('.product-item');
        if (item.previousElementSibling) {
          item.previousElementSibling.before(item);
          const saveBtn = document.getElementById('saveOrderBtn');
          if (saveBtn) saveBtn.style.display = 'block';
        }
      });
    });

    productListEl.querySelectorAll('.js-move-down').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.product-item');
        if (item.nextElementSibling) {
          item.nextElementSibling.after(item);
          const saveBtn = document.getElementById('saveOrderBtn');
          if (saveBtn) saveBtn.style.display = 'block';
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

    /* ── HTML5 Drag and Drop Reordering ── */
    let draggedItem = null;

    productListEl.querySelectorAll('.product-item').forEach(item => {
      item.addEventListener('dragstart', function (e) {
        draggedItem = this;
        setTimeout(() => this.classList.add('dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', function () {
        this.classList.remove('dragging');
        draggedItem = null;
        productListEl.querySelectorAll('.product-item').forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
      });

      item.addEventListener('dragover', function (e) {
        e.preventDefault(); // Necessary to allow dropping
        if (this === draggedItem) return;

        const bounding = this.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        if (e.clientY - offset > 0) {
          this.classList.add('drag-over-bottom');
          this.classList.remove('drag-over-top');
        } else {
          this.classList.add('drag-over-top');
          this.classList.remove('drag-over-bottom');
        }
      });

      item.addEventListener('dragleave', function () {
        this.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      item.addEventListener('drop', async function (e) {
        e.preventDefault();
        this.classList.remove('drag-over-top', 'drag-over-bottom');
        if (this === draggedItem) return;

        const bounding = this.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);

        // Move DOM element
        if (e.clientY - offset > 0) {
          this.after(draggedItem);
        } else {
          this.before(draggedItem);
        }

        // Display save button explicitly
        if (saveOrderBtn) saveOrderBtn.style.display = 'block';
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
      const urls = p.image_url ? p.image_url.split(',').map(u => u.trim()).filter(u => u.length > 0 && u.startsWith('http')) : [];
      const firstImage = urls.length > 0 ? urls[0] : null;
      const thumbHtml = firstImage
        ? `<img src="${firstImage}" alt="${escHtml(p.name)}" class="product-item__thumb">`
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
  const addForm = document.getElementById('addProductForm');
  const imgUpload = document.getElementById('imgUpload');
  const imgPreviewContainer = document.getElementById('imgPreviewContainer');
  const uploadArea = document.getElementById('uploadArea');

  let pendingImageFiles = []; // Array of File objects

  function renderPreviews() {
    if (!imgPreviewContainer) return;
    imgPreviewContainer.innerHTML = '';
    pendingImageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.createElement('img');
        img.src = ev.target.result;
        img.className = 'img-upload-preview';
        img.style.display = 'block';
        img.style.width = '140px';
        img.style.height = '140px';
        const imgContainer = document.createElement('div');
        imgContainer.appendChild(img);
        imgPreviewContainer.appendChild(imgContainer);
      };
      reader.readAsDataURL(file);
    });
  }

  // Image preview
  imgUpload?.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Add valid files up to limit of 3
    let added = 0;
    for (let file of files) {
      if (pendingImageFiles.length >= 3) {
        showAdminToast('Maksimal 3 gambar diperbolehkan.');
        break;
      }
      if (!file.type.startsWith('image/')) {
        showAdminToast(`File ${file.name} bukan gambar.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        showAdminToast(`Gambar ${file.name} maksimal 5MB.`);
        continue;
      }
      pendingImageFiles.push(file);
      added++;
    }

    // Clear input to allow re-selecting same files if removed
    imgUpload.value = '';
    if (added > 0) renderPreviews();
  });

  // Drag & drop
  uploadArea?.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files || []);

    const dt = new DataTransfer();
    files.forEach(f => {
      if (f.type.startsWith('image/')) dt.items.add(f);
    });

    if (dt.files.length > 0) {
      imgUpload.files = dt.files;
      imgUpload.dispatchEvent(new Event('change'));
    }
  });

  // Reset preview on form reset
  document.getElementById('resetProductBtn')?.addEventListener('click', () => {
    pendingImageFiles = [];
    if (imgPreviewContainer) imgPreviewContainer.innerHTML = '';
  });

  addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('productName')?.value.trim();
    const desc = document.getElementById('productDesc')?.value.trim();
    const category = document.getElementById('productCategory')?.value || 'general';

    if (!name) { showAdminToast('Nama produk wajib diisi.'); return; }
    if (!desc) { showAdminToast('Deskripsi produk wajib diisi.'); return; }

    const submitBtn = document.getElementById('submitProductBtn');
    submitBtn.textContent = pendingImageFiles.length > 0 ? '📤 Mengupload gambar…' : '💾 Menyimpan…';
    submitBtn.disabled = true;

    try {
      await addProduct({ name, description: desc, imageFiles: pendingImageFiles, category });

      // Reset form
      addForm.reset();
      if (imgPreviewContainer) imgPreviewContainer.innerHTML = '';
      pendingImageFiles = [];

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
