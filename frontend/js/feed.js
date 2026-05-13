/**
 * Meal-Rescue — Feed Page Logic
 * Renders boxes, applies filters, handles real-time updates.
 */

let allBoxes = [];
let activeFilter = 'all';
let searchQuery = '';

// ── Render Topbar ───────────────────────────────────────────────

function renderTopbar() {
  const user = getUser();
  const isLoggedIn = !!getAccessToken();
  const initial = user ? user.name.charAt(0).toUpperCase() : '?';

  document.getElementById('topbar').innerHTML = `
    <a href="/" class="navbar-logo">
      <div class="logo-icon">🍱</div>
      <span>Meal<span style="color:var(--color-accent)">Rescue</span></span>
    </a>
    <div class="feed-search">
      <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input type="text" id="searchInput" placeholder="Search by shop or food..." oninput="handleSearch(this.value)">
    </div>
    <div class="navbar-actions">
      ${isLoggedIn ? `
        <a href="/my-orders" class="btn btn-ghost btn-sm">My Orders</a>
        ${user && user.role === 'merchant' ? '<a href="/merchant/dashboard" class="btn btn-ghost btn-sm">Dashboard</a>' : ''}
        <div class="notification-bell" id="notifBell">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          <span class="notification-badge" id="notifCount" style="display:none">0</span>
        </div>
        <div class="user-dropdown">
          <div class="user-avatar" onclick="toggleDropdown()">${initial}</div>
          <div class="dropdown-menu" id="userDropdown">
            <div class="dropdown-item" style="font-weight:700">${user ? user.name : ''}</div>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" onclick="logout()">Log Out</button>
          </div>
        </div>
      ` : `
        <a href="/auth" class="btn btn-primary btn-sm">Sign In</a>
      `}
    </div>
  `;

  // Animated placeholder
  const searchInput = document.getElementById('searchInput');
  const placeholders = ['Search by shop...', 'Filter Veg Only...', 'Find High-Protein...', 'Search by food type...'];
  let pIndex = 0;
  setInterval(() => {
    pIndex = (pIndex + 1) % placeholders.length;
    searchInput.setAttribute('placeholder', placeholders[pIndex]);
  }, 3000);
}

// ── Render Box Card ─────────────────────────────────────────────

function renderBoxCard(box) {
  const urgent = isUrgent(box.pickup_end);
  const discount = getDiscount(box.original_price, box.current_price);
  const timeLeft = formatTimeLeft(box.pickup_end);
  const isFlash = box.current_price < box.original_price * 0.6;
  const isAlmostGone = box.remaining_qty <= 2;
  const tags = box.tags || [];

  const imgSrc = box.image_url || `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23e8f5ee" width="400" height="300"/><text x="200" y="150" text-anchor="middle" fill="%231A5E3A" font-size="64">${encodeURIComponent(['🍱','🥐','🍰','🥗','🍕'][box.id % 5])}</text></svg>`;

  return `
    <div class="box-card" data-box-id="${box.id}" onclick="window.location.href='/box/${box.id}'">
      <div class="box-card-image">
        <img src="${imgSrc}" alt="${box.title}" loading="lazy">
        <span class="box-card-shop">🏪 ${box.shop_name || 'Local Shop'}</span>
        <span class="box-card-timer ${urgent ? 'urgent' : ''}">⏰ ${timeLeft}</span>
        ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
      </div>
      <div class="box-card-body">
        <div class="box-card-title">${box.title}</div>
        <div class="box-card-price">
          ${discount > 0 ? `<span class="price-original">${formatPrice(box.original_price)}</span>` : ''}
          <span class="price-current">${formatPrice(box.current_price)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
          ${isFlash ? '<span class="badge badge-flash">⚡ FLASH</span>' : ''}
          ${isAlmostGone ? '<span class="badge badge-urgent">Almost Gone!</span>' : ''}
          ${tags.map(t => `<span class="chip chip-${t.toLowerCase().includes('veg') ? 'veg' : t.toLowerCase().includes('protein') ? 'protein' : 'dairy'}">${t}</span>`).join('')}
        </div>
        <div style="margin-top:0.5rem;font-size:0.8rem;color:var(--color-text-muted)">${box.remaining_qty} left</div>
      </div>
      <div class="box-card-reserve">Reserve Now →</div>
    </div>
  `;
}

// ── Filter & Render ─────────────────────────────────────────────

function getFilteredBoxes() {
  return allBoxes.filter(box => {
    const tags = (box.tags || []).map(t => t.toLowerCase());
    const matchesSearch = !searchQuery ||
      (box.title || '').toLowerCase().includes(searchQuery) ||
      (box.shop_name || '').toLowerCase().includes(searchQuery);

    if (!matchesSearch) return false;

    switch (activeFilter) {
      case 'veg': return tags.includes('veg');
      case 'protein': return tags.some(t => t.includes('protein'));
      case 'dairy': return tags.some(t => t.includes('dairy'));
      case 'cheap': return box.current_price < 50;
      case 'soon': return isUrgent(box.pickup_end);
      default: return true;
    }
  });
}

function renderFeed() {
  const grid = document.getElementById('feedGrid');
  const empty = document.getElementById('emptyState');
  const filtered = getFilteredBoxes();

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = filtered.map(renderBoxCard).join('');
  setupImageLoading(grid);
  cardStaggerIn('.box-card');
}

function applyFilter(filter, btn) {
  activeFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderFeed();
}

function handleSearch(value) {
  searchQuery = value.toLowerCase().trim();
  renderFeed();
}

// ── Load Feed Data ──────────────────────────────────────────────

async function loadFeed() {
  const grid = document.getElementById('feedGrid');
  grid.innerHTML = createSkeletonCards(6);

  try {
    allBoxes = await api.get('/boxes');
    renderFeed();
  } catch (err) {
    grid.innerHTML = '';
    document.getElementById('emptyState').style.display = 'flex';
  }
}

// ── WebSocket Event Handlers ────────────────────────────────────

document.addEventListener('new_box', (e) => {
  const box = e.detail;
  allBoxes.unshift(box);
  renderFeed();
  showToast(`New box from ${box.shop_name || 'a shop'}! 🎉`, 'success');
});

document.addEventListener('price_updated', (e) => {
  const { box_id, new_price } = e.detail;
  const box = allBoxes.find(b => b.id === box_id);
  if (box) {
    box.current_price = new_price;
    const card = document.querySelector(`[data-box-id="${box_id}"]`);
    if (card) priceDropAnimation(card, new_price);
    showToast('Flash Drop! 🔥 Price just dropped!', 'warning');
  }
});

document.addEventListener('box_sold_out', (e) => {
  const { box_id } = e.detail;
  allBoxes = allBoxes.filter(b => b.id !== box_id);
  const card = document.querySelector(`[data-box-id="${box_id}"]`);
  if (card) {
    card.classList.add('removing');
    setTimeout(() => renderFeed(), 400);
  }
});

document.addEventListener('order_qty_update', (e) => {
  const { box_id, remaining_qty } = e.detail;
  const box = allBoxes.find(b => b.id === box_id);
  if (box) box.remaining_qty = remaining_qty;
});

// ── Initialize ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderTopbar();
  loadFeed();
  updateNotifCount();
});
