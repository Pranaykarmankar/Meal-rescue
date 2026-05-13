/**
 * Meal-Rescue — My Orders Page Logic
 */
let orders = [];
let currentTab = 'active';
let qrIntervals = {};

function showTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', (i === 0 && tab === 'active') || (i === 1 && tab === 'past'));
  });
  renderOrders();
}

function renderOrders() {
  const list = document.getElementById('ordersList');
  const filtered = orders.filter(o => {
    if (currentTab === 'active') return o.status === 'pending';
    return o.status === 'completed' || o.status === 'cancelled';
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📦</div><h3>No ${currentTab} orders</h3><p>${currentTab === 'active' ? 'Browse the feed to find surprise boxes!' : 'Your completed orders will appear here.'}</p></div>`;
    return;
  }

  list.innerHTML = filtered.map(order => `
    <div class="order-card" data-order-id="${order.id}">
      <div class="order-img">${order.box_image ? `<img src="${order.box_image}" alt="">` : '🍱'}</div>
      <div class="order-info">
        <h4>${order.box_title || 'Surprise Box'}</h4>
        <div class="shop">🏪 ${order.shop_name || 'Local Shop'}</div>
        <div class="price">${formatPrice(order.paid_amount)}</div>
      </div>
      <span class="order-status ${order.status}">${order.status}</span>
    </div>
    ${order.status === 'pending' ? `<div class="qr-section" id="qr-${order.id}"><p style="color:var(--color-text-muted)">Loading QR...</p></div>` : ''}
  `).join('');

  // Load QR codes for pending orders
  filtered.filter(o => o.status === 'pending').forEach(o => loadQR(o.id));
}

async function loadQR(orderId) {
  const container = document.getElementById(`qr-${orderId}`);
  if (!container) return;

  try {
    const data = await api.get(`/orders/${orderId}/qr`);
    container.innerHTML = `
      <h4 style="margin-bottom:0.5rem">Show this QR to the shop</h4>
      <p style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:1rem">QR refreshes every 30 seconds for security</p>
      <div class="qr-wrapper">
        <div id="qrcode-${orderId}" style="display:inline-block"></div>
        <div class="qr-scan-line-overlay"></div>
      </div>
      <div class="qr-timer" id="timer-${orderId}">Refreshes in ${data.expires_in}s</div>
    `;

    // Render QR code
    const qrDiv = document.getElementById(`qrcode-${orderId}`);
    if (window.QRCode) {
      new QRCode(qrDiv, { text: data.payload, width: 200, height: 200, colorDark: '#1A5E3A', colorLight: '#ffffff' });
    } else {
      qrDiv.innerHTML = `<div style="width:200px;height:200px;background:var(--color-border-light);display:flex;align-items:center;justify-content:center;border-radius:var(--radius-md);font-size:0.8rem;color:var(--color-text-muted)">QR: ${data.payload}</div>`;
    }

    // Timer countdown
    let remaining = data.expires_in;
    if (qrIntervals[orderId]) clearInterval(qrIntervals[orderId]);
    qrIntervals[orderId] = setInterval(() => {
      remaining--;
      const timerEl = document.getElementById(`timer-${orderId}`);
      if (timerEl) timerEl.textContent = `Refreshes in ${remaining}s`;
      if (remaining <= 0) {
        clearInterval(qrIntervals[orderId]);
        loadQR(orderId); // Refresh
      }
    }, 1000);
  } catch (err) {
    container.innerHTML = `<p style="color:var(--color-danger)">Could not load QR code</p>`;
  }
}

async function loadStreak() {
  try {
    const user = getUser();
    if (!user) return;
    // We'll compute from orders
    const completed = orders.filter(o => o.status === 'completed').length;
    const co2 = co2Calc(completed);
    const badges = [];
    if (completed >= 1) badges.push('First Rescue 🌱');
    if (completed >= 5) badges.push('Regular Rescuer 🥗');
    if (completed >= 10) badges.push('Eco Warrior ♻️');
    if (completed >= 25) badges.push('Planet Hero 🌍');

    document.getElementById('streakSection').innerHTML = `
      <div class="streak-section">
        <h3>🏆 Your Rescue Streak</h3>
        <div class="streak-stats">
          <div><div class="streak-stat-value stat-value" data-target="${completed}">${completed}</div><div class="streak-stat-label">Meals Rescued</div></div>
          <div><div class="streak-stat-value stat-value" data-target="${co2}">${co2}</div><div class="streak-stat-label">kg CO₂ Saved</div></div>
        </div>
        ${badges.length > 0 ? `<div class="badges-row">${badges.map((b, i) => `<div class="badge-medal" style="animation-delay:${i * 0.1}s">${b}</div>`).join('')}</div>` : '<p style="color:rgba(255,255,255,0.6);font-size:0.9rem">Complete orders to earn badges!</p>'}
      </div>
    `;
    statCountUp('.streak-stat-value');
  } catch {}
}

async function loadOrders() {
  if (!requireAuth()) return;
  const list = document.getElementById('ordersList');
  list.innerHTML = '<div class="skeleton skeleton-card" style="height:100px;margin-bottom:1rem"></div>'.repeat(3);

  try {
    orders = await api.get('/orders/my-orders');
    renderOrders();
    loadStreak();
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">😕</div><h3>Could not load orders</h3></div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('navbar').innerHTML = renderNavbar('orders');
  loadOrders();
});
