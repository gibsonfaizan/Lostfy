/**
 * LostFy — Core Application JavaScript
 * Shared components: Navbar, Footer, Dark Mode, Toast, Modal, Auth State, API helper
 */

const APP = {
  API_URL: 'http://localhost:5000/api',
  AI_URL: 'http://localhost:8000',
};

/* ========== Auth State ========== */
const Auth = {
  getToken: () => localStorage.getItem('lostfy_token'),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem('lostfy_user')); }
    catch { return null; }
  },
  setSession: (token, user) => {
    localStorage.setItem('lostfy_token', token);
    localStorage.setItem('lostfy_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('lostfy_token');
    localStorage.removeItem('lostfy_user');
  },
  isLoggedIn: () => !!localStorage.getItem('lostfy_token'),
  isAdmin: () => {
    const u = Auth.getUser();
    return u && u.role === 'admin';
  }
};

/* ========== API Helper ========== */
async function api(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  try {
    const res = await fetch(`${APP.API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  } catch (err) {
    Toast.show(err.message, 'error');
    throw err;
  }
}

/* ========== Dark Mode ========== */
const Theme = {
  init() {
    const saved = localStorage.getItem('lostfy_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('lostfy_theme', next);
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
  },
  get current() {
    return document.documentElement.getAttribute('data-theme');
  }
};

/* ========== Toast Notifications ========== */
const Toast = {
  _container: null,
  _getContainer() {
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.className = 'toast-container';
      document.body.appendChild(this._container);
    }
    return this._container;
  },
  show(message, type = 'info', duration = 4000) {
    const container = this._getContainer();
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100px)';
      toast.style.transition = '0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

/* ========== Modal ========== */
const Modal = {
  show(contentHTML, onClose) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `<div class="modal">${contentHTML}</div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { overlay.remove(); if (onClose) onClose(); }
    });
    const closeBtn = overlay.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', () => { overlay.remove(); if (onClose) onClose(); });
    return overlay;
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
  }
};

/* ========== Navbar Component ========== */
function renderNavbar() {
  const isLogged = Auth.isLoggedIn();
  const user = Auth.getUser();
  const isAdmin = Auth.isAdmin();
  const themeIcon = Theme.current === 'dark' ? '☀️' : '🌙';

  // Determine base path for links based on current page location
  const isInPages = window.location.pathname.includes('/pages/');
  const base = isInPages ? '../' : '';
  const pagesBase = isInPages ? '' : 'pages/';

  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.innerHTML = `
    <a href="${base}index.html" class="logo">
      <span>📦</span> Lost<span class="text-gradient">Fy</span>
    </a>
    <div class="nav-links" id="navLinks">
      <a href="${base}index.html">Home</a>
      <a href="${pagesBase}about.html">About</a>
      ${isLogged ? `
        <a href="${pagesBase}report-lost.html">Report Lost</a>
        <a href="${pagesBase}report-found.html">Report Found</a>
        <a href="${pagesBase}recommendations.html">Nearby</a>
        <a href="${pagesBase}dashboard.html">Dashboard</a>
        ${isAdmin ? `<a href="${pagesBase}admin.html">Admin</a>` : ''}
        <a href="#" id="logoutBtn">Logout</a>
      ` : `
        <a href="${pagesBase}auth.html">Login</a>
      `}
      <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">${themeIcon}</button>
    </div>
    <div class="nav-hamburger" id="navHamburger">
      <span></span><span></span><span></span>
    </div>
  `;
  document.body.prepend(nav);

  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', Theme.toggle);

  // Hamburger menu
  document.getElementById('navHamburger').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.clear();
      window.location.href = `${base}index.html`;
    });
  }

  // Active link highlight
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  nav.querySelectorAll('.nav-links a').forEach(a => {
    const linkPath = a.getAttribute('href').split('/').pop();
    if (linkPath === currentPath) a.classList.add('active');
  });
}

/* ========== Footer Component ========== */
function renderFooter() {
  const isInPages = window.location.pathname.includes('/pages/');
  const base = isInPages ? '../' : '';
  const pagesBase = isInPages ? '' : 'pages/';

  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <h4>📦 LostFy</h4>
          <p>AI-powered Lost & Found platform that connects people with their belongings through smart matching and verified ownership claims.</p>
        </div>
        <div class="footer-col">
          <h4>Platform</h4>
          <a href="${pagesBase}report-lost.html">Report Lost Item</a>
          <a href="${pagesBase}report-found.html">Report Found Item</a>
          <a href="${pagesBase}recommendations.html">Nearby Matches</a>
          <a href="${pagesBase}dashboard.html">Dashboard</a>
        </div>
        <div class="footer-col">
          <h4>Company</h4>
          <a href="${pagesBase}about.html">About Us</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact</a>
        </div>
        <div class="footer-col">
          <h4>Connect</h4>
          <a href="#">Twitter</a>
          <a href="#">GitHub</a>
          <a href="#">LinkedIn</a>
          <a href="#">support@lostfy.io</a>
        </div>
      </div>
      <div class="footer-bottom">
        &copy; ${new Date().getFullYear()} LostFy. Built with ❤️ for the community.
      </div>
    </div>
  `;
  document.body.appendChild(footer);
}

/* ========== Animated Background Blobs ========== */
function renderBlobs() {
  const blobs = document.createElement('div');
  blobs.className = 'blob-bg';
  blobs.innerHTML = `<div class="blob blob-1"></div><div class="blob blob-2"></div><div class="blob blob-3"></div>`;
  document.body.prepend(blobs);
}

/* ========== Image Upload Preview ========== */
function initUploadPreview(inputId, previewContainerId) {
  const input = document.getElementById(inputId);
  const previewContainer = document.getElementById(previewContainerId);
  if (!input || !previewContainer) return;

  let selectedFiles = [];

  input.addEventListener('change', () => {
    const files = Array.from(input.files);
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      if (selectedFiles.length >= 5) {
        Toast.show('Maximum 5 images allowed', 'warning');
        return;
      }
      selectedFiles.push(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const item = document.createElement('div');
        item.className = 'upload-preview-item fade-in';
        item.innerHTML = `
          <img src="${e.target.result}" alt="Preview">
          <div class="remove-btn" data-index="${selectedFiles.length - 1}">✕</div>
        `;
        previewContainer.appendChild(item);
        item.querySelector('.remove-btn').addEventListener('click', function() {
          const idx = parseInt(this.getAttribute('data-index'));
          selectedFiles.splice(idx, 1);
          previewContainer.innerHTML = '';
          rebuildPreview();
        });
      };
      reader.readAsDataURL(file);
    });
  });

  function rebuildPreview() {
    previewContainer.innerHTML = '';
    selectedFiles.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const item = document.createElement('div');
        item.className = 'upload-preview-item fade-in';
        item.innerHTML = `
          <img src="${e.target.result}" alt="Preview">
          <div class="remove-btn" data-index="${idx}">✕</div>
        `;
        previewContainer.appendChild(item);
        item.querySelector('.remove-btn').addEventListener('click', function() {
          selectedFiles.splice(parseInt(this.getAttribute('data-index')), 1);
          rebuildPreview();
        });
      };
      reader.readAsDataURL(file);
    });
  }

  return { getFiles: () => selectedFiles };
}

/* ========== OTP Input Auto-Focus ========== */
function initOTPInputs(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  const inputs = container.querySelectorAll('input');
  inputs.forEach((inp, i) => {
    inp.addEventListener('input', (e) => {
      if (e.target.value.length === 1 && i < inputs.length - 1) inputs[i + 1].focus();
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && i > 0) inputs[i - 1].focus();
    });
  });
  return {
    getValue: () => Array.from(inputs).map(i => i.value).join('')
  };
}

/* ========== Intersection Observer Animations ========== */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}

/* ========== Tab Component ========== */
function initTabs(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  const btns = container.querySelectorAll('.tab-btn');
  const contents = container.querySelectorAll('.tab-content');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });
}

/* ========== Format Helpers ========== */
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];
  for (const i of intervals) {
    const count = Math.floor(seconds / i.seconds);
    if (count >= 1) return `${count} ${i.label}${count > 1 ? 's' : ''} ago`;
  }
  return 'Just now';
}

/* ========== Page Init ========== */
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  renderNavbar();
  renderFooter();
  initScrollAnimations();
});
