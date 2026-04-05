/* ============================================================
   products.js — Render product cards from localStorage
   ============================================================ */

const WA_NUMBER = '6282211121105';
const WA_BASE   = `https://wa.me/${WA_NUMBER}`;

/**
 * Build a WhatsApp link with a pre-filled message.
 * @param {string} productName
 * @returns {string}
 */
function waLink(productName) {
  const msg = encodeURIComponent(`Halo, saya tertarik dengan produk: *${productName}*. Apakah tersedia?`);
  return `${WA_BASE}?text=${msg}`;
}

/**
 * Get icon emoji for a product based on keywords.
 * @param {string} name
 * @returns {string}
 */
function getProductIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('lampu') || n.includes('led') || n.includes('light')) return '💡';
  if (n.includes('kabel') || n.includes('cable') || n.includes('cord'))  return '🔌';
  if (n.includes('saklar') || n.includes('switch'))                       return '🔘';
  if (n.includes('stop kontak') || n.includes('socket'))                  return '🔋';
  if (n.includes('panel') || n.includes('mcb') || n.includes('box'))      return '⚡';
  if (n.includes('fitting') || n.includes('gantung'))                     return '🔆';
  if (n.includes('emergency'))                                             return '🚨';
  return '🔧';
}

/**
 * Build a single product card HTML.
 * @param {Object} product
 * @param {boolean} [showBadge]
 * @returns {string} HTML string
 */
function buildProductCard(product, showBadge = false) {
  const icon = getProductIcon(product.name);
  const firstImage = product.image_url ? product.image_url.split(',')[0].trim() : null;
  const mediaHtml = firstImage
    ? `<img src="${firstImage}" alt="${product.name}" class="product-card__img" loading="lazy">`
    : `<div class="product-card__placeholder">
         <span class="ph-icon">${icon}</span>
         <span class="ph-label">Suryamaslampu</span>
       </div>`;

  const badgeHtml = showBadge
    ? `<span class="product-card__badge">Unggulan</span>`
    : '';

  return `
    <div class="product-card reveal" data-id="${product.id}" onclick="window.location.href='/product-detail.html?id=${product.id}'" style="cursor:pointer">
      <div class="product-card__media">
        ${mediaHtml}
        ${badgeHtml}
      </div>
      <div class="product-card__body">
        <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
        <p class="product-card__desc">${escapeHtml(product.description)}</p>
        <div class="product-card__footer">
          <a href="${waLink(product.name)}" target="_blank" rel="noopener" class="product-card__wa" onclick="event.stopPropagation()">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Chat WA
          </a>
        </div>
      </div>
    </div>`;
}

/**
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render products into a container element.
 * @param {HTMLElement} container
 * @param {Array} products
 * @param {Object} [opts]
 * @param {number} [opts.limit] - Max cards to render
 */
function renderProducts(container, products, opts = {}) {
  if (!container) return;

  const list = opts.limit ? products.slice(0, opts.limit) : products;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">💡</div>
        <h3 class="empty-state__title">Produk Segera Hadir</h3>
        <p class="empty-state__sub">Hubungi kami via WhatsApp untuk informasi lebih lanjut.</p>
      </div>`;
    return;
  }

  container.innerHTML = list
    .map((p, i) => buildProductCard(p, i === 0))
    .join('');

  // Trigger reveal animation
  requestAnimationFrame(() => {
    container.querySelectorAll('.reveal').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 80);
    });
  });
}
