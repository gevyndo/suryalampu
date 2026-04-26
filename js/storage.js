/* ============================================================
   storage.js — Supabase-backed CRUD for products
   All data functions are ASYNC. Auth is sessionStorage-based.
   ============================================================ */

/* ──────────────────────────────────────
   PRODUCTS — Read / Write
────────────────────────────────────── */

/**
 * Fetch all products from Supabase, ordered by position then created_at.
 * @returns {Promise<Array>}
 */
async function loadProducts(category = null) {
  let query = supabaseClient
    .from('products')
    .select('*')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Suryamaslampu] loadProducts:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Fetch a single product from Supabase by ID.
 * @param {string} id 
 * @returns {Promise<Object|null>}
 */
async function loadProductById(id) {
  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[Suryamaslampu] loadProductById:', error.message);
    return null;
  }
  return data;
}

/**
 * Add a new product. Uploads image files if provided.
 * @param {{ name: string, description: string, imageFiles: File[] }} param0
 * @returns {Promise<Object>} Inserted product row
 */
async function addProduct({ name, description = '', imageFiles = [], category = 'general' }) {
  // 1. Upload images to Supabase Storage (if Files were provided)
  let image_url = null;
  if (imageFiles && imageFiles.length > 0) {
    const uploadPromises = imageFiles.map(file => uploadProductImage(file));
    const urls = await Promise.all(uploadPromises);
    image_url = urls.join(',');
  }

  // 2. Determine next position (append to end)
  const { data: last } = await supabaseClient
    .from('products')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (last?.position ?? -1) + 1;

  // 3. Insert row
  const { data, error } = await supabaseClient
    .from('products')
    .insert({ name: name.trim(), description: description.trim(), image_url, position, category })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete a product by id. Also removes its image from Storage.
 * @param {string} id - UUID
 */
async function deleteProduct(id) {
  // Fetch image_url so we can clean up storage
  const { data: product } = await supabaseClient
    .from('products')
    .select('image_url')
    .eq('id', id)
    .maybeSingle();

  // Delete images from storage bucket
  if (product?.image_url) {
    const urls = product.image_url.split(',');
    const pathsToRemove = urls.map(url => extractStoragePath(url.trim())).filter(p => p !== null);
    
    if (pathsToRemove.length > 0) {
      await supabaseClient.storage.from(SUPABASE_BUCKET).remove(pathsToRemove);
    }
  }

  const { error } = await supabaseClient.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Move a product up or down by swapping `position` values with its neighbour.
 * @param {string} id
 * @param {'up'|'down'} direction
 */
async function reorderProduct(id, direction) {
  const products = await loadProducts();
  const idx = products.findIndex(p => p.id === id);
  if (idx < 0) return;

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= products.length) return;

  const a = products[idx];
  const b = products[swapIdx];

  // Swap their position values
  await Promise.all([
    supabaseClient.from('products').update({ position: b.position }).eq('id', a.id),
    supabaseClient.from('products').update({ position: a.position }).eq('id', b.id),
  ]);
}

/**
 * Update the order/position of multiple products in bulk.
 * Used for drag and drop reordering.
 * @param {Array<{id: string, position: number}>} updates 
 */
async function updateProductsOrder(updates) {
  // Supabase REST doesn't have a true 'batch update' for multiple rows with different data.
  // The easiest approach is Promise.all for a small number of items.
  const promises = updates.map(u => 
    supabaseClient.from('products').update({ position: u.position }).eq('id', u.id)
  );
  
  await Promise.all(promises);
}

/* ──────────────────────────────────────
   STORAGE — Image helpers
────────────────────────────────────── */

/**
 * Upload a File to Supabase Storage bucket "surya".
 * @param {File} file
 * @returns {Promise<string>} Public URL of the uploaded image
 */
async function uploadProductImage(file) {
  const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabaseClient.storage
    .from(SUPABASE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error('Upload gambar gagal: ' + error.message);

  const { data } = supabaseClient.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Extract the storage object path from a Supabase public URL.
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/surya/products/img.jpg"
 *   → "products/img.jpg"
 * @param {string} publicUrl
 * @returns {string|null}
 */
function extractStoragePath(publicUrl) {
  try {
    const marker = `/storage/v1/object/public/${SUPABASE_BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.slice(idx + marker.length);
  } catch (_) {
    return null;
  }
}

/* ──────────────────────────────────────
   ADMIN AUTH — sessionStorage based
────────────────────────────────────── */

function isAdminLoggedIn() {
  return sessionStorage.getItem('suryamaslampu_admin') === 'true';
}

function adminLogin(username, password) {
  if (username === 'admin' && password === 'admin123') {
    sessionStorage.setItem('suryamaslampu_admin', 'true');
    return true;
  }
  return false;
}

function adminLogout() {
  sessionStorage.removeItem('suryamaslampu_admin');
}
