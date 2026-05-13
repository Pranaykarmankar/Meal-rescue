/**
 * Meal-Rescue — Merchant Dashboard Logic
 */

let selectedTags = [];
let uploadedFile = null;
let videoStream = null;
let scannerRunning = false;

// ── Stats ───────────────────────────────────────────────────────

async function loadStats() {
  try {
    const stats = await api.get('/merchants/dashboard');
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card"><div class="stat-card-icon green">💰</div><div class="stat-card-value stat-value" data-target="${stats.total_revenue}">0</div><div class="stat-card-label">Total Revenue</div></div>
      <div class="stat-card"><div class="stat-card-icon amber">📦</div><div class="stat-card-value stat-value" data-target="${stats.active_boxes}">0</div><div class="stat-card-label">Active Boxes</div></div>
      <div class="stat-card"><div class="stat-card-icon green">🍽️</div><div class="stat-card-value stat-value" data-target="${stats.meals_rescued}">0</div><div class="stat-card-label">Meals Rescued</div></div>
      <div class="stat-card"><div class="stat-card-icon amber">⭐</div><div class="stat-card-value">${stats.avg_rating}</div><div class="stat-card-label">Avg Rating</div></div>
    `;
    statCountUp('.stat-card-value.stat-value');
  } catch (err) {
    showToast('Could not load dashboard stats', 'error');
  }
}

// ── Listings ────────────────────────────────────────────────────

async function loadListings() {
  const container = document.getElementById('listingsContainer');
  container.innerHTML = '<div class="skeleton" style="height:80px;margin-bottom:0.75rem"></div>'.repeat(3);

  try {
    const boxes = await api.get('/merchants/my-boxes');
    if (boxes.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:2rem"><div class="empty-state-icon">📦</div><h3>No listings yet</h3><p>Tap the + button to post your first surprise box!</p></div>';
      return;
    }
    container.innerHTML = boxes.map(box => {
      const qtyPercent = (box.remaining_qty / box.quantity) * 100;
      return `
        <div class="listing-card" data-box-id="${box.id}">
          <div class="listing-card-img">${box.image_url ? `<img src="${box.image_url}" style="width:100%;height:100%;object-fit:cover">` : '🍱'}</div>
          <div class="listing-card-info">
            <h4>${box.title}</h4>
            <div style="font-size:0.8rem;color:var(--color-text-muted)">${formatPrice(box.current_price)} · ${box.remaining_qty}/${box.quantity} left · ${box.status}</div>
            <div class="qty-bar"><div class="qty-fill" style="width:${qtyPercent}%;background:${qtyPercent < 30 ? 'var(--color-danger)' : 'var(--color-success)'}"></div></div>
          </div>
          <button class="btn btn-ghost btn-icon" onclick="deleteBox(${box.id})" title="Delete">🗑️</button>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<p style="color:var(--color-danger)">Could not load listings</p>';
  }
}

async function deleteBox(boxId) {
  if (!confirm('Delete this listing?')) return;
  try {
    await api.del(`/boxes/${boxId}`);
    showToast('Listing deleted', 'success');
    loadListings();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Post Box ────────────────────────────────────────────────────

function openPostPanel() {
  document.getElementById('postPanel').classList.add('open');
  document.getElementById('postOverlay').classList.add('open');
}

function closePostPanel() {
  document.getElementById('postPanel').classList.remove('open');
  document.getElementById('postOverlay').classList.remove('open');
}

function toggleTag(btn) {
  const tag = btn.dataset.tag;
  btn.classList.toggle('active');
  if (selectedTags.includes(tag)) {
    selectedTags = selectedTags.filter(t => t !== tag);
  } else {
    selectedTags.push(tag);
  }
}

function handleImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    showToast('Only JPG and PNG images allowed', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image must be under 5MB', 'error');
    return;
  }
  uploadedFile = file;
  const preview = document.getElementById('imagePreview');
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
}

// Drag and drop
document.addEventListener('DOMContentLoaded', () => {
  const zone = document.getElementById('uploadZone');
  if (zone) {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) {
        document.getElementById('imageInput').files = e.dataTransfer.files;
        handleImageUpload(document.getElementById('imageInput'));
      }
    });
  }
});

async function submitBox(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBoxBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const boxData = {
      title: document.getElementById('boxTitle').value,
      original_price: parseFloat(document.getElementById('boxPrice').value),
      quantity: parseInt(document.getElementById('boxQty').value),
      description: document.getElementById('boxDesc').value || null,
      pickup_start: new Date(document.getElementById('pickupStart').value).toISOString(),
      pickup_end: new Date(document.getElementById('pickupEnd').value).toISOString(),
      tags: selectedTags.length > 0 ? selectedTags : null,
    };

    const box = await api.post('/boxes', boxData);

    // Upload image if selected
    if (uploadedFile && box.id) {
      try {
        await uploadFile(`/boxes/${box.id}/upload-image`, uploadedFile);
      } catch {}
    }

    showToast('Surprise box posted! 🎉', 'success');
    closePostPanel();
    document.getElementById('postForm').reset();
    document.getElementById('imagePreview').style.display = 'none';
    selectedTags = [];
    document.querySelectorAll('#tagSelector .chip').forEach(c => c.classList.remove('active'));
    uploadedFile = null;
    loadListings();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ── QR Scanner ──────────────────────────────────────────────────

async function startScanner() {
  const container = document.getElementById('scannerContainer');
  const canvas = document.getElementById('scannerCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  document.getElementById('scanBtn').style.display = 'none';
  container.style.display = 'block';

  try {
    videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.createElement('video');
    video.srcObject = videoStream;
    video.play();
    scannerRunning = true;

    video.addEventListener('loadeddata', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      requestAnimationFrame(function tick() {
        if (!scannerRunning) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (window.jsQR) {
          const code = jsQR(imageData.data, canvas.width, canvas.height);
          if (code && code.data) {
            handleQRResult(code.data);
            return;
          }
        }
        requestAnimationFrame(tick);
      });
    });
  } catch (err) {
    showToast('Camera access denied', 'error');
    container.style.display = 'none';
    document.getElementById('scanBtn').style.display = '';
  }
}

function stopScanner() {
  scannerRunning = false;
  if (videoStream) videoStream.getTracks().forEach(t => t.stop());
  document.getElementById('scannerContainer').style.display = 'none';
  document.getElementById('scanBtn').style.display = '';
}

async function handleQRResult(data) {
  stopScanner();
  const parts = data.split(':');
  if (parts.length !== 2) { showToast('Invalid QR code', 'error'); return; }

  const [orderId, token] = parts;
  try {
    await api.post('/orders/verify-qr', { order_id: parseInt(orderId), token });
    // Success flash
    const overlay = document.getElementById('flashOverlay');
    overlay.className = 'flash-overlay success';
    document.getElementById('flashText').textContent = 'Order Verified! ✓';
    overlay.style.display = 'flex';
    setTimeout(() => { overlay.style.display = 'none'; }, 2000);
    showToast('Order handed over! 🎉', 'success');
    loadStats();
  } catch (err) {
    const overlay = document.getElementById('flashOverlay');
    overlay.className = 'flash-overlay error';
    document.getElementById('flashText').textContent = 'QR Expired!';
    overlay.style.display = 'flex';
    setTimeout(() => { overlay.style.display = 'none'; }, 2000);
    showToast(err.message || 'QR expired. Ask customer to refresh.', 'error');
  }
}

// ── WebSocket updates ───────────────────────────────────────────
document.addEventListener('order_qty_update', () => loadListings());

// ── Init ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  document.getElementById('navbar').innerHTML = renderNavbar('merchant');
  loadStats();
  loadListings();
});
