/**
 * CARE — Shared Sidebar Component
 * Injects the sidebar into the page and handles all interactions.
 *
 * Usage: Add <div id="care-sidebar-root"></div> as the first element
 *        inside <body> on any page. Then load this script.
 *
 * Pages declare themselves with <body data-page="dashboard">
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'care_users_local_db';
  const SESSION_KEY = 'care_current_user';

  // ---- Build sidebar HTML ----
  const NAV_MAIN = [
    { page: 'dashboard',  icon: 'fa-th-large',    label: 'Dashboard'  },
    { page: 'equipment',  icon: 'fa-microchip',   label: 'Equipment'  },
    { page: 'schedule',   icon: 'fa-calendar-alt', label: 'Schedule'  },
    { page: 'brainstorm', icon: 'fa-lightbulb',   label: 'Brainstorm' },
    { page: 'shifts',     icon: 'fa-user-clock',  label: 'Shifts'     },
    { page: 'employees',  icon: 'fa-users',       label: 'Employees'  }, // <-- NEW
  ];

  const NAV_SYSTEM = [
    { page: 'reports',  icon: 'fa-chart-line', label: 'Reports'  },
    { page: 'settings', icon: 'fa-cog',        label: 'Settings' },
  ];

  function buildNavList(items, activePage) {
    return items.map(item => `
      <li class="nav-item ${item.page === activePage ? 'active' : ''}" data-page="${item.page}">
        <i class="fas ${item.icon}"></i> ${item.label}
      </li>
    `).join('');
  }

  function buildSidebar(activePage) {
    return `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="logo">C</div>
          <div>
            <h1>CARE</h1>
            <span>Asset & Reliability</span>
          </div>
        </div>

        <div class="nav-section-label">Main</div>
        <ul class="nav-list">
          ${buildNavList(NAV_MAIN, activePage)}
        </ul>

        <div class="nav-section-label">System</div>
        <ul class="nav-list">
          ${buildNavList(NAV_SYSTEM, activePage)}
        </ul>

        <div class="sidebar-footer">
          <div class="user-card">
            <div class="user-avatar" id="userAvatar">?</div>
            <div class="user-info">
              <strong id="userName">Loading…</strong>
              <span id="userEmail">…</span>
            </div>
            <button class="logout-btn" id="logoutBtn" title="Log out">
              <i class="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </aside>
    `;
  }

  // ---- Mount ----
  const root = document.getElementById('care-sidebar-root');
  if (!root) {
    console.warn('[sidebar] No #care-sidebar-root found — skipping injection.');
    return;
  }

  const activePage = document.body.dataset.page || '';
  root.innerHTML = buildSidebar(activePage);

  // ---- Populate user card ----
  const session = localStorage.getItem(SESSION_KEY);
  if (session) {
    try {
      const u = JSON.parse(session);
      document.getElementById('userName').textContent = u.name;
      document.getElementById('userEmail').textContent = u.email;
      document.getElementById('userAvatar').textContent = u.name.charAt(0).toUpperCase();
    } catch (e) {}
  } else {
    // No session — kick back to login
    // window.location.href = 'index.html';
  }

  // ---- Nav clicks ----
  const PAGE_URLS = {
    dashboard:  'dashboard.html',
    equipment:  'equipment.html',
    schedule:   'schedule.html',
    brainstorm: 'brainstorm.html',
    shifts:     'shifts.html',
    reports:    'reports.html',
    settings:   'settings.html',
    employees: 'employees.html',
  };

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (page === activePage) return; // already here
      const url = PAGE_URLS[page];
      if (url) window.location.href = url;
    });
  });

  // ---- Logout ----
    logoutBtn.addEventListener('click', () => {
    if (confirm('Log out of CARE?')) {
      localStorage.removeItem('care_current_user'); // Clear the session
      window.location.href = 'login.html';          // Hard redirect to login
    }
  });

  // ---- Mobile toggle hook (pages have #menuToggle) ----
  const menuToggle = document.getElementById('menuToggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      const sb = document.getElementById('sidebar');
      if (sb) sb.classList.toggle('open');
    });
  }

  // Close sidebar on nav click (mobile)
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        const sb = document.getElementById('sidebar');
        if (sb) sb.classList.remove('open');
      }
    });
  });
})();