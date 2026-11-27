(function () {
  'use strict';

  const STORAGE_KEY = 'care_users_local_db';
  const SESSION_KEY = 'care_current_user';
  const THEME_KEY = 'care_theme';

  // ============================================
  // LOAD USER & AUTH
  // ============================================
  function getUsers() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveUsers(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }

  const session = localStorage.getItem(SESSION_KEY);
  let currentUser = null;
  if (session) {
    try { currentUser = JSON.parse(session); } catch (e) {}
  }

  // NOTE: The sidebar user card is now populated by js/components/sidebar.js automatically.
  // Do not try to populate it here, or it will cause a crash.

  // ============================================
  // ACCOUNT FORM
  // ============================================
  const accountForm = document.getElementById('accountForm');
  const accName = document.getElementById('accName');
  const accEmail = document.getElementById('accEmail');
  const accPassword = document.getElementById('accPassword');
  const accountMessage = document.getElementById('accountMessage');

  if (currentUser && accName && accEmail) {
    accName.value = currentUser.name || '';
    accEmail.value = currentUser.email || '';
  }

  function showAccountMessage(text, type) {
    if (!accountMessage) return;
    accountMessage.textContent = text;
    accountMessage.className = 'settings-message show ' + type;
  }

  if (accountForm) {
    accountForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const newName = accName.value.trim();
      const newEmail = accEmail.value.trim().toLowerCase();
      const newPassword = accPassword.value;

      if (!newName || !newEmail) {
        showAccountMessage('Name and email cannot be empty.', 'error');
        return;
      }
      if (!newEmail.includes('@') || !newEmail.includes('.')) {
        showAccountMessage('Please enter a valid email address.', 'error');
        return;
      }
      if (newPassword && newPassword.length < 6) {
        showAccountMessage('New password must be at least 6 characters.', 'error');
        return;
      }

      const users = getUsers();
      const oldEmail = currentUser ? currentUser.email : null;
      const existing = users[oldEmail];

      if (!existing) {
        showAccountMessage('Could not find your account. Please log in again.', 'error');
        return;
      }

      if (newEmail !== oldEmail && users[newEmail]) {
        showAccountMessage('That email is already registered to another account.', 'error');
        return;
      }

      const updated = {
        ...existing,
        name: newName,
        email: newEmail,
        password: newPassword ? newPassword : existing.password
      };

      if (newEmail !== oldEmail) {
        delete users[oldEmail];
      }
      users[newEmail] = updated;
      saveUsers(users);

      currentUser = { name: updated.name, email: updated.email };
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));

      // Update the sidebar visually immediately (if it's already loaded)
      const sidebarName = document.getElementById('userName');
      const sidebarEmail = document.getElementById('userEmail');
      const sidebarAvatar = document.getElementById('userAvatar');
      
      if (sidebarName) sidebarName.textContent = updated.name;
      if (sidebarEmail) sidebarEmail.textContent = updated.email;
      if (sidebarAvatar) sidebarAvatar.textContent = updated.name.charAt(0).toUpperCase();

      accPassword.value = '';
      showAccountMessage('✓ Account updated successfully.', 'success');
      setTimeout(() => {
        accountMessage.className = 'settings-message';
      }, 3500);
    });
  }

  // ============================================
  // HELP MODAL
  // ============================================
  const helpModal = document.getElementById('helpModal');
  const helpTitle = document.getElementById('helpTitle');
  const helpContent = document.getElementById('helpContent');
  const helpClose = document.getElementById('helpClose');
  const helpOkBtn = document.getElementById('helpOkBtn');

  const helpTexts = {
    docs: `
      <h4 style="color: var(--text); margin-bottom: 0.5rem; font-size: 1rem;">📖 Documentation</h4>
      <p>Welcome to CARE! Here is a quick guide on how to use your workspace:</p>
      <ul style="margin-top: 0.5rem; margin-left: 1.2rem; display: flex; flex-direction: column; gap: 0.4rem;">
        <li><strong>Equipment:</strong> Add your appliances here. Set "Next Service" dates to track maintenance.</li>
        <li><strong>Schedule:</strong> Create tasks and assign them to your equipment. You can view this in a Calendar or List format.</li>
        <li><strong>Shifts:</strong> Organize your team's daily shifts. You can drag and drop shifts between days.</li>
        <li><strong>Employees:</strong> Add your staff members here first, so you can assign them to tasks and shifts.</li>
      </ul>
    `,
    faq: `
      <h4 style="color: var(--text); margin-bottom: 0.5rem; font-size: 1rem;">❓ Frequently Asked Questions</h4>
      <div style="display: flex; flex-direction: column; gap: 0.8rem; margin-top: 0.8rem;">
        <div>
          <strong style="color: var(--text);">Where is my data saved?</strong>
          <p>All data is saved locally in your browser. It never leaves your device.</p>
        </div>
        <div>
          <strong style="color: var(--text);">Can I share this with my team?</strong>
          <p>Currently, this is a single-owner workspace. Multi-user cloud sync is coming soon!</p>
        </div>
        <div>
          <strong style="color: var(--text);">What happens if I clear my browser cache?</strong>
          <p>Clearing your browser data will delete your CARE data. We recommend using the "Export" button in Reports to back up your data regularly.</p>
        </div>
      </div>
    `,
    contact: `
      <h4 style="color: var(--text); margin-bottom: 0.5rem; font-size: 1rem;">📬 Contact Support</h4>
      <p>Need help with something specific? We're here for you.</p>
      <div style="background: #f9fcff; padding: 1rem; border-radius: 10px; border: 1px solid var(--border); margin-top: 1rem;">
        <p style="margin-bottom: 0.4rem;"><strong>Email:</strong> <a href="mailto:support@care-app.com" style="color: var(--primary-light); text-decoration: none;">support@care-app.com</a></p>
        <p><strong>Hours:</strong> Monday – Friday, 9:00 AM – 5:00 PM</p>
      </div>
      <p style="margin-top: 1rem; font-size: 0.8rem; font-style: italic;">We typically respond within 24 hours.</p>
    `
  };

  function openHelpModal(type) {
    if (!helpModal || !helpTitle || !helpContent) return;
    helpTitle.textContent = type === 'docs' ? 'Documentation' : type === 'faq' ? 'FAQs' : 'Contact Support';
    helpContent.innerHTML = helpTexts[type];
    helpModal.classList.add('open');
  }

  function closeHelpModal() {
    if (helpModal) helpModal.classList.remove('open');
  }

  document.querySelectorAll('.help-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const type = item.dataset.help;
      if (type) openHelpModal(type);
    });
  });

  if (helpClose) helpClose.addEventListener('click', closeHelpModal);
  if (helpOkBtn) helpOkBtn.addEventListener('click', closeHelpModal);
  if (helpModal) {
    helpModal.addEventListener('click', (e) => { 
      if (e.target === helpModal) closeHelpModal(); 
    });
  }

  // ============================================
  // DARK MODE
  // ============================================
  const darkToggle = document.getElementById('darkModeToggle');
  const themeLabel = document.getElementById('themeLabel');

  function applyTheme(isDark) {
    if (!darkToggle || !themeLabel) return;
    document.body.classList.toggle('dark-mode', isDark);
    darkToggle.checked = isDark;
    themeLabel.textContent = isDark ? 'Dark mode' : 'Light mode';
  }

  const savedTheme = localStorage.getItem(THEME_KEY);
  applyTheme(savedTheme === 'dark');

  if (darkToggle) {
    darkToggle.addEventListener('change', () => {
      const isDark = darkToggle.checked;
      applyTheme(isDark);
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    });
  }

  // ============================================
  // LOGOUT
  // ============================================
  function doLogout() {
    if (confirm('Log out of CARE?')) {
      localStorage.removeItem(SESSION_KEY);
      window.location.href = 'index.html'; // or login.html depending on your setup
    }
  }
  
  const sidebarLogoutBtn = document.getElementById('logoutBtn');
  const settingsLogoutBtn = document.getElementById('settingsLogoutBtn');
  
  if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', doLogout);
  if (settingsLogoutBtn) settingsLogoutBtn.addEventListener('click', doLogout);

})();