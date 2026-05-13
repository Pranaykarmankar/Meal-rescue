/**
 * Meal-Rescue — Auth Page Logic
 * Handles login, register, tab switching, role toggle.
 */

let selectedRole = 'consumer';

function switchTab(tab) {
  // Update tab buttons
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');

  // Slide form
  const wrapper = document.getElementById('formWrapper');
  wrapper.style.transform = tab === 'register' ? 'translateX(-100%)' : 'translateX(0)';
}

function setRole(role) {
  selectedRole = role;
  document.querySelectorAll('.role-option').forEach(opt => opt.classList.remove('active'));
  event.target.closest('.role-option').classList.add('active');

  const merchantFields = document.getElementById('merchantFields');
  if (role === 'merchant') {
    merchantFields.classList.add('visible');
    document.getElementById('regShopName').required = true;
  } else {
    merchantFields.classList.remove('visible');
    document.getElementById('regShopName').required = false;
  }
}

function setLoading(btn, loading) {
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function showFieldError(inputId, message) {
  const group = document.getElementById(inputId).closest('.form-group');
  group.classList.add('error');
  const errorEl = group.querySelector('.form-error');
  if (errorEl && message) errorEl.textContent = message;
}

function clearErrors() {
  document.querySelectorAll('.form-group.error').forEach(g => g.classList.remove('error'));
}

async function handleLogin(e) {
  e.preventDefault();
  clearErrors();
  const btn = document.getElementById('loginBtn');
  setLoading(btn, true);

  try {
    const data = await api.post('/auth/login', {
      email: document.getElementById('loginEmail').value,
      password: document.getElementById('loginPassword').value,
    });

    setTokens(data.access_token, data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showToast('Welcome back! 🎉', 'success');

    // Confetti burst
    if (window.confetti) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    // Redirect based on role
    setTimeout(() => {
      if (data.user.role === 'merchant') {
        window.location.href = '/merchant/dashboard';
      } else if (data.user.role === 'admin') {
        window.location.href = '/admin/dashboard';
      } else {
        window.location.href = '/feed';
      }
    }, 800);

  } catch (err) {
    showToast(err.message, 'error');
    showFieldError('loginEmail', '');
  } finally {
    setLoading(btn, false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  clearErrors();
  const btn = document.getElementById('registerBtn');
  setLoading(btn, true);

  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;

  // Validate
  if (name.length < 2) { showFieldError('regName', 'Name must be at least 2 characters'); setLoading(btn, false); return; }
  if (password.length < 6) { showFieldError('regPassword', 'Password must be at least 6 characters'); setLoading(btn, false); return; }

  try {
    const data = await api.post('/auth/register', {
      name, email, password, role: selectedRole,
    });

    setTokens(data.access_token, data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showToast('Account created! Welcome! 🎉', 'success');

    if (window.confetti) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }

    // If merchant, register merchant profile too
    if (selectedRole === 'merchant') {
      const shopName = document.getElementById('regShopName').value;
      const fssai = document.getElementById('regFssai').value;
      if (shopName) {
        try {
          await api.post('/merchants/register', {
            shop_name: shopName,
            shop_address: 'To be updated',
            fssai_number: fssai || null,
          });
        } catch {}
      }
    }

    setTimeout(() => {
      if (selectedRole === 'merchant') {
        window.location.href = '/merchant/dashboard';
      } else {
        window.location.href = '/feed';
      }
    }, 800);

  } catch (err) {
    showToast(err.message, 'error');
    if (err.message.includes('email')) {
      showFieldError('regEmail', err.message);
    }
  } finally {
    setLoading(btn, false);
  }
}

// Redirect if already logged in
document.addEventListener('DOMContentLoaded', () => {
  if (getAccessToken()) {
    const user = getUser();
    if (user) {
      if (user.role === 'merchant') window.location.href = '/merchant/dashboard';
      else if (user.role === 'admin') window.location.href = '/admin/dashboard';
      else window.location.href = '/feed';
    }
  }
});
