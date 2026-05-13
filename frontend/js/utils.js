/**
 * Meal-Rescue — Utility Helpers
 * Formatting, toast, skeleton, time calculations.
 */

function formatPrice(amount) {
  return '₹' + Number(amount).toFixed(0);
}

function formatTimeLeft(pickupEnd) {
  const now = new Date();
  const end = new Date(pickupEnd);
  const diff = end - now;
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function isUrgent(pickupEnd) {
  const now = new Date();
  const end = new Date(pickupEnd);
  return (end - now) < 1800000; // under 30 min
}

function co2Calc(meals) {
  return (meals * 2.5).toFixed(1);
}

function getDiscount(original, current) {
  return Math.round((1 - current / original) * 100);
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Toast System ────────────────────────────────────────────────

function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span style="font-size:1.1rem;font-weight:700">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    <div class="toast-progress"></div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Skeleton Helpers ────────────────────────────────────────────

function createSkeletonCards(count = 6) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="box-card">
        <div class="skeleton" style="height:180px;border-radius:var(--radius-lg) var(--radius-lg) 0 0"></div>
        <div style="padding:1rem 1.25rem">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text short"></div>
          <div class="skeleton skeleton-text medium" style="margin-top:0.75rem"></div>
        </div>
      </div>`;
  }
  return html;
}

function createSkeletonTable(rows = 5, cols = 4) {
  let html = '<table class="data-table"><thead><tr>';
  for (let c = 0; c < cols; c++) html += '<th><div class="skeleton skeleton-text short"></div></th>';
  html += '</tr></thead><tbody>';
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) html += '<td><div class="skeleton skeleton-text"></div></td>';
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

// ── Image Blur-Up Loader ────────────────────────────────────────

function setupImageLoading(container = document) {
  container.querySelectorAll('.box-card-image img').forEach(img => {
    if (img.complete) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('loaded'));
      img.addEventListener('error', () => {
        img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23e8f5ee" width="400" height="300"/><text x="200" y="150" text-anchor="middle" fill="%231A5E3A" font-size="48">🍱</text></svg>';
        img.classList.add('loaded');
      });
    }
  });
}

// ── Global Error Handler ────────────────────────────────────────

window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
  if (e.reason && e.reason.message && !e.reason.message.includes('WebSocket')) {
    showToast(e.reason.message, 'error');
  }
});

// ── Navbar Renderer ─────────────────────────────────────────────

function renderNavbar(activePage = '') {
  const user = getUser();
  const initial = user ? user.name.charAt(0).toUpperCase() : '?';
  const isLoggedIn = !!getAccessToken();

  return `
    <nav class="navbar">
      <div class="navbar-inner">
        <a href="/" class="navbar-logo">
          <img src="/assets/images/logo.png" alt="MealRescue Logo" class="logo-img" />
          <span>Meal<span style="color:var(--color-accent)">Rescue</span></span>
        </a>
        <div class="navbar-actions" style="gap: 1.5rem;">
          ${isLoggedIn ? `
            <a href="/feed" class="btn btn-ghost btn-sm hide-mobile ${activePage === 'feed' ? 'active' : ''}">Feed</a>
            <a href="/my-orders" class="btn btn-ghost btn-sm hide-mobile ${activePage === 'orders' ? 'active' : ''}">My Orders</a>
            ${user && user.role === 'merchant' ? `<a href="/admin/dashboard" class="btn btn-ghost btn-sm hide-mobile">Dashboard</a>` : ''}
            ${user && user.role === 'admin' ? `<a href="/admin/dashboard" class="btn btn-ghost btn-sm hide-mobile">Admin</a>` : ''}
            <div class="notification-bell" id="notifBell" onclick="window.location.href='/my-orders'">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <span class="notification-badge" id="notifCount" style="display:none">0</span>
            </div>
            <div class="user-dropdown hide-mobile">
              <div class="user-avatar" id="userAvatar" onclick="toggleDropdown()">${initial}</div>
              <div class="dropdown-menu" id="userDropdown">
                <div class="dropdown-item" style="font-weight:700;color:var(--color-text-primary)">${user ? user.name : ''}</div>
                <div class="dropdown-item" style="font-size:0.8rem;color:var(--color-text-muted)">${user ? user.email : ''}</div>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item" onclick="logout()">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Log Out
                </button>
              </div>
            </div>
            <button class="mobile-menu-btn" id="mobileMenuBtn" onclick="toggleMobileMenu()" aria-label="Menu">
              <span></span><span></span><span></span>
            </button>
          ` : `
            <a href="/auth" class="btn btn-primary btn-sm">Sign In</a>
          `}
        </div>
      </div>
    </nav>
    ${isLoggedIn ? `
    <div class="mobile-nav-overlay" id="mobileNavOverlay" onclick="closeMobileMenu()"></div>
    <div class="mobile-nav-drawer" id="mobileNavDrawer">
      <div class="mobile-nav-header">
        <div class="mobile-nav-user">
          <div class="user-avatar" style="width:48px;height:48px;font-size:1.1rem">${initial}</div>
          <div>
            <div style="font-weight:700;font-size:1rem">${user ? user.name : ''}</div>
            <div style="font-size:0.8rem;color:var(--color-text-muted)">${user ? user.email : ''}</div>
          </div>
        </div>
      </div>
      <div class="mobile-nav-links">
        <a href="/feed" class="mobile-nav-link ${activePage === 'feed' ? 'active' : ''}">🍽️ Food Feed</a>
        <a href="/my-orders" class="mobile-nav-link ${activePage === 'orders' ? 'active' : ''}">📦 My Orders</a>
        ${user && user.role === 'merchant' ? `<a href="/merchant/dashboard" class="mobile-nav-link">🏪 Merchant Dashboard</a>` : ''}
        ${user && user.role === 'admin' ? `<a href="/admin/dashboard" class="mobile-nav-link">⚙️ Admin Panel</a>` : ''}
      </div>
      <div class="mobile-nav-footer">
        <button class="btn btn-danger" style="width:100%" onclick="logout()">🚪 Log Out</button>
      </div>
    </div>
    ` : ''}
  `;
}

function toggleDropdown() {
  document.getElementById('userDropdown')?.classList.toggle('open');
}

function toggleMobileMenu() {
  const drawer = document.getElementById('mobileNavDrawer');
  const overlay = document.getElementById('mobileNavOverlay');
  const btn = document.getElementById('mobileMenuBtn');
  if (!drawer) return;
  const isOpen = drawer.classList.contains('open');
  if (isOpen) {
    closeMobileMenu();
  } else {
    drawer.classList.add('open');
    overlay?.classList.add('open');
    btn?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileMenu() {
  const drawer = document.getElementById('mobileNavDrawer');
  const overlay = document.getElementById('mobileNavOverlay');
  const btn = document.getElementById('mobileMenuBtn');
  drawer?.classList.remove('open');
  overlay?.classList.remove('open');
  btn?.classList.remove('open');
  document.body.style.overflow = '';
}

function logout() {
  clearTokens();
  window.location.href = '/';
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-dropdown')) {
    document.getElementById('userDropdown')?.classList.remove('open');
  }
});

// Update notification count
async function updateNotifCount() {
  try {
    if (!getAccessToken()) return;
    const data = await api.get('/notifications/unread-count');
    const badge = document.getElementById('notifCount');
    if (badge && data.count > 0) {
      badge.textContent = data.count;
      badge.style.display = 'flex';
    }
  } catch {}
}

// Listen for new notification events
document.addEventListener('new_notification', () => {
  const badge = document.getElementById('notifCount');
  if (badge) {
    const current = parseInt(badge.textContent) || 0;
    badge.textContent = current + 1;
    badge.style.display = 'flex';
    badge.classList.add('pulse');
    setTimeout(() => badge.classList.remove('pulse'), 500);
  }
});
