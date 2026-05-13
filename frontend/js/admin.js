/**
 * Meal-Rescue — Admin Dashboard Logic
 */

function showSection(section, btn) {
  document.querySelectorAll('[id^="section-"]').forEach(s => s.style.display = 'none');
  document.getElementById(`section-${section}`).style.display = 'block';
  document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  if (section === 'merchants') loadPendingMerchants();
  if (section === 'users') loadUsers();
  if (section === 'orders') loadOrders();
}

// ── Stats ───────────────────────────────────────────────────────

async function loadAdminStats() {
  try {
    const stats = await api.get('/admin/stats');
    document.getElementById('adminStats').innerHTML = `
      <div class="stat-card"><div class="stat-card-icon blue">👥</div><div class="stat-card-value stat-value" data-target="${stats.total_users}">0</div><div class="stat-card-label">Total Users</div></div>
      <div class="stat-card"><div class="stat-card-icon green">🏪</div><div class="stat-card-value stat-value" data-target="${stats.total_merchants}">0</div><div class="stat-card-label">Merchants</div></div>
      <div class="stat-card"><div class="stat-card-icon amber">🍽️</div><div class="stat-card-value stat-value" data-target="${stats.meals_rescued_today}">0</div><div class="stat-card-label">Rescued Today</div></div>
      <div class="stat-card"><div class="stat-card-icon green">💰</div><div class="stat-card-value stat-value" data-target="${stats.total_revenue}">0</div><div class="stat-card-label">Total Revenue</div></div>
    `;
    statCountUp('.stat-card-value.stat-value');
  } catch {}
}

// ── Charts ──────────────────────────────────────────────────────

async function loadCharts() {
  try {
    const data = await api.get('/admin/chart-data');
    const labels = data.daily.map(d => d.date);
    const meals = data.daily.map(d => d.meals);
    const revenue = data.daily.map(d => d.revenue);

    const chartOpts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } }
    };

    new Chart(document.getElementById('mealsChart'), {
      type: 'bar',
      data: { labels, datasets: [{ data: meals, backgroundColor: '#2D7A50', borderRadius: 8 }] },
      options: chartOpts
    });

    new Chart(document.getElementById('revenueChart'), {
      type: 'line',
      data: { labels, datasets: [{ data: revenue, borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.4, pointRadius: 4 }] },
      options: chartOpts
    });
  } catch {}
}

// ── Pending Merchants ───────────────────────────────────────────

async function loadPendingMerchants() {
  const container = document.getElementById('pendingTable');
  container.innerHTML = createSkeletonTable(3, 4);

  try {
    const merchants = await api.get('/admin/pending-merchants');
    if (merchants.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:2rem"><h3>No pending approvals</h3></div>';
      return;
    }
    container.innerHTML = `<table class="data-table"><thead><tr><th>Shop Name</th><th>Owner</th><th>FSSAI</th><th>Actions</th></tr></thead><tbody>
      ${merchants.map(m => `<tr id="merchant-row-${m.id}"><td><strong>${m.shop_name}</strong><br><span style="font-size:0.8rem;color:var(--color-text-muted)">${m.shop_address || ''}</span></td><td>${m.user_name}<br><span style="font-size:0.8rem">${m.user_email}</span></td><td>${m.fssai_number || '—'}</td><td class="table-actions"><button class="btn btn-primary btn-sm" onclick="approveMerchant(${m.id})">Approve</button><button class="btn btn-danger btn-sm" onclick="rejectMerchant(${m.id})">Reject</button></td></tr>`).join('')}
    </tbody></table>`;
  } catch (err) {
    container.innerHTML = '<p style="color:var(--color-danger)">Error loading merchants</p>';
  }
}

async function approveMerchant(id) {
  try {
    await api.patch(`/admin/merchants/${id}/approve`);
    document.getElementById(`merchant-row-${id}`)?.classList.add('fade-out');
    setTimeout(() => loadPendingMerchants(), 500);
    showToast('Merchant approved ✓', 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

async function rejectMerchant(id) {
  if (!confirm('Reject this merchant?')) return;
  try {
    await api.patch(`/admin/merchants/${id}/reject`);
    document.getElementById(`merchant-row-${id}`)?.classList.add('fade-out');
    setTimeout(() => loadPendingMerchants(), 500);
    showToast('Merchant rejected', 'warning');
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Users ───────────────────────────────────────────────────────

async function loadUsers() {
  const container = document.getElementById('usersTable');
  container.innerHTML = createSkeletonTable(5, 4);

  try {
    const users = await api.get('/admin/users');
    container.innerHTML = `<table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody>
      ${users.map(u => `<tr><td>${u.name}</td><td>${u.email}</td><td><span class="badge ${u.role === 'admin' ? 'badge-new' : u.role === 'merchant' ? 'badge-flash' : ''}" style="background:var(--color-primary-bg);color:var(--color-primary)">${u.role}</span></td><td><button class="btn ${u.is_banned ? 'btn-primary' : 'btn-danger'} btn-sm" onclick="toggleBan(${u.id})">${u.is_banned ? 'Unban' : 'Ban'}</button></td></tr>`).join('')}
    </tbody></table>`;
  } catch {}
}

async function toggleBan(userId) {
  try {
    const res = await api.patch(`/admin/users/${userId}/ban`);
    showToast(res.message, 'success');
    loadUsers();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Orders ──────────────────────────────────────────────────────

async function loadOrders() {
  const container = document.getElementById('ordersTable');
  container.innerHTML = createSkeletonTable(5, 5);

  try {
    const orders = await api.get('/admin/orders');
    container.innerHTML = `<table class="data-table"><thead><tr><th>ID</th><th>Consumer</th><th>Box</th><th>Status</th><th>Amount</th><th>Actions</th></tr></thead><tbody>
      ${orders.map(o => `<tr><td>#${o.id}</td><td>${o.consumer_name}</td><td>${o.box_title}</td><td><span class="order-status ${o.status}">${o.status}</span></td><td>${formatPrice(o.paid_amount)}</td><td>${o.status === 'pending' ? `<button class="btn btn-danger btn-sm" onclick="refundOrder(${o.id})">Refund</button>` : '—'}</td></tr>`).join('')}
    </tbody></table>`;
  } catch {}
}

async function refundOrder(orderId) {
  if (!confirm('Refund this order?')) return;
  try {
    await api.post(`/admin/orders/${orderId}/refund`);
    showToast('Order refunded', 'success');
    loadOrders();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Init ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadAdminStats();
  loadCharts();
});
