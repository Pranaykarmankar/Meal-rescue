/**
 * Meal-Rescue — Box Detail Page Logic
 */
let currentBox = null;

async function loadBoxDetail() {
  const pathParts = window.location.pathname.split('/');
  const boxId = pathParts[pathParts.length - 1];
  if (!boxId) { window.location.href = '/feed'; return; }

  try {
    currentBox = await api.get(`/boxes/${boxId}`);
    renderDetail(currentBox);
  } catch (err) {
    showToast('Box not found', 'error');
    setTimeout(() => window.location.href = '/feed', 1500);
  }
}

function renderDetail(box) {
  const discount = getDiscount(box.original_price, box.current_price);
  const imgSrc = box.image_url || `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect fill="%23e8f5ee" width="800" height="400"/><text x="400" y="200" text-anchor="middle" fill="%231A5E3A" font-size="80">🍱</text></svg>`;
  const qtyPercent = (box.remaining_qty / box.quantity) * 100;
  const pickupStart = new Date(box.pickup_start);
  const pickupEnd = new Date(box.pickup_end);
  const now = new Date();
  const totalWindow = pickupEnd - pickupStart;
  const elapsed = Math.max(0, now - pickupStart);
  const timePercent = Math.min(100, (elapsed / totalWindow) * 100);

  document.getElementById('heroImg').src = imgSrc;

  document.getElementById('detailCard').innerHTML = `
    <div class="detail-shop">
      <div class="detail-shop-avatar">🏪</div>
      <div class="detail-shop-info">
        <h4>${box.shop_name || 'Local Shop'}</h4>
        <p>${box.shop_address || 'Nearby'}</p>
      </div>
    </div>
    <h2 class="detail-title">${box.title}</h2>
    <p class="detail-desc">${box.description || 'A delicious surprise box of fresh food items ready for rescue!'}</p>
    <div class="detail-price-row">
      ${discount > 0 ? `<span class="detail-price-original">${formatPrice(box.original_price)}</span>` : ''}
      <span class="detail-price-current">${formatPrice(box.current_price)}</span>
      ${discount > 0 ? `<span class="detail-price-discount">${discount}% OFF</span>` : ''}
    </div>
    <div class="detail-tags">
      ${(box.tags || []).map(t => `<span class="chip">${t}</span>`).join('')}
    </div>
    <div class="detail-pickup">
      <h4>Pickup Window</h4>
      <div style="display:flex;justify-content:space-between;font-size:0.9rem">
        <span>${pickupStart.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
        <span style="font-weight:700;color:var(--color-primary)">Now</span>
        <span>${pickupEnd.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
      </div>
      <div class="time-bar"><div class="time-bar-fill" style="width:${timePercent}%"></div></div>
    </div>
    <div class="detail-qty">
      <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
        <span style="font-size:0.85rem;color:var(--color-text-muted)">Remaining</span>
        <span style="font-size:0.85rem;font-weight:700">${box.remaining_qty} / ${box.quantity}</span>
      </div>
      <div class="detail-qty-bar"><div class="detail-qty-fill" style="width:${qtyPercent}%;background:${qtyPercent < 30 ? 'var(--color-danger)' : 'var(--color-success)'}"></div></div>
    </div>
    <button class="btn btn-primary btn-lg reserve-btn" onclick="openPaymentModal()" ${box.remaining_qty <= 0 || box.status !== 'active' ? 'disabled style="opacity:0.5"' : ''}>
      ${box.remaining_qty <= 0 ? 'Sold Out' : `Reserve & Pay ${formatPrice(box.current_price)}`}
    </button>
  `;
}

function openPaymentModal() {
  if (!requireAuth()) return;
  const modal = document.getElementById('paymentModal');
  modal.classList.add('open');
  document.getElementById('paymentBody').innerHTML = `
    <div style="text-align:center;padding:1rem 0">
      <div style="font-size:3rem;margin-bottom:1rem">🍱</div>
      <h4 style="margin-bottom:0.5rem">${currentBox.title}</h4>
      <p style="color:var(--color-text-muted);margin-bottom:1.5rem">${currentBox.shop_name || 'Local Shop'}</p>
      <div style="font-size:2rem;font-weight:800;color:var(--color-primary);margin-bottom:2rem">${formatPrice(currentBox.current_price)}</div>
      <button class="btn btn-primary btn-lg" style="width:100%" onclick="confirmReservation()" id="confirmBtn">
        <span class="btn-text">Confirm Reservation</span>
        <span class="spinner"></span>
      </button>
      <p style="font-size:0.8rem;color:var(--color-text-muted);margin-top:1rem">You'll receive a QR code for pickup</p>
    </div>
  `;
}

function closePaymentModal() {
  document.getElementById('paymentModal').classList.remove('open');
}

async function confirmReservation() {
  const btn = document.getElementById('confirmBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    await api.post('/orders/reserve', { box_id: currentBox.id });
    closePaymentModal();
    showToast('Reservation confirmed! 🎉', 'success');
    if (window.confetti) confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    setTimeout(() => window.location.href = '/my-orders', 1500);
  } catch (err) {
    showToast(err.message, 'error');
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', loadBoxDetail);
