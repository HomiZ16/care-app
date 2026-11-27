(function () {
  'use strict';

    const session = JSON.parse(localStorage.getItem('care_current_user'));
  const userSuffix = session ? '_' + session.email : '';

  const STORAGE_KEY = 'care_employees' + userSuffix;
  const THEME_KEY = 'care_theme';

  if (localStorage.getItem(THEME_KEY) === 'dark') {
    document.body.classList.add('dark-mode');
  }

  // Seed initial employees if none exist
    if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  }

  let employees = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  
  const listEl = document.getElementById('employeeList');
  const emptyEl = document.getElementById('emptyState');
  const searchInput = document.getElementById('empSearch');
  
  const modal = document.getElementById('employeeModal');
  const form = document.getElementById('employeeForm');
  const empIdInput = document.getElementById('empId');
  const empNameInput = document.getElementById('empName');
  const empRoleInput = document.getElementById('empRole');
  const empPhoneInput = document.getElementById('empPhone');
  const modalTitle = document.getElementById('modalTitle');

  const deleteModal = document.getElementById('deleteModal');
  const deleteNameEl = document.getElementById('deleteName');
  let pendingDeleteId = null;

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
  }

  function getInitials(name) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function render() {
    const q = searchInput.value.toLowerCase();
    const filtered = employees.filter(e => 
      e.name.toLowerCase().includes(q) || 
      (e.role || '').toLowerCase().includes(q)
    );

    if (employees.length === 0) {
      listEl.style.display = 'none';
      emptyEl.style.display = 'block';
      return;
    }

    listEl.style.display = 'grid';
    emptyEl.style.display = 'none';

    listEl.innerHTML = filtered.map((emp, i) => `
      <div class="emp-card" style="animation-delay:${Math.min(i * 0.04, 0.4)}s">
        <div class="emp-header">
          <div class="emp-avatar">${escapeHtml(getInitials(emp.name))}</div>
          <div class="emp-info">
            <h3>${escapeHtml(emp.name)}</h3>
            <span>${escapeHtml(emp.role || 'No role')}</span>
          </div>
        </div>
        ${emp.phone ? `<div class="emp-phone"><i class="fas fa-phone"></i> ${escapeHtml(emp.phone)}</div>` : ''}
        <div class="emp-actions">
          <button class="card-btn" data-action="edit" data-id="${emp.id}"><i class="fas fa-pen"></i> Edit</button>
          <button class="card-btn danger" data-action="delete" data-id="${emp.id}"><i class="fas fa-trash"></i> Remove</button>
        </div>
      </div>
    `).join('');
  }

  // Modal Functions
  document.getElementById('addEmployeeBtn').addEventListener('click', () => {
    form.reset();
    empIdInput.value = '';
    modalTitle.textContent = 'Add Employee';
    modal.classList.add('open');
    setTimeout(() => empNameInput.focus(), 100);
  });

  document.getElementById('emptyAddBtn').addEventListener('click', () => {
    document.getElementById('addEmployeeBtn').click();
  });

  function closeModal() { modal.classList.remove('open'); }
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);

  // Save
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = empIdInput.value;
    const name = empNameInput.value.trim();
    const role = empRoleInput.value.trim();
    const phone = empPhoneInput.value.trim();

    if (id) {
      const idx = employees.findIndex(x => x.id === id);
      if (idx > -1) employees[idx] = { ...employees[idx], name, role, phone };
    } else {
      employees.push({ id: 'emp' + Date.now(), name, role, phone });
    }
    
    saveData();
    closeModal();
    render();
  });

  // Edit / Delete clicks
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    const emp = employees.find(x => x.id === id);
    
    if (btn.dataset.action === 'edit') {
      empIdInput.value = emp.id;
      empNameInput.value = emp.name;
      empRoleInput.value = emp.role || '';
      empPhoneInput.value = emp.phone || '';
      modalTitle.textContent = 'Edit Employee';
      modal.classList.add('open');
    } 
    else if (btn.dataset.action === 'delete') {
      pendingDeleteId = id;
      deleteNameEl.textContent = emp.name;
      deleteModal.classList.add('open');
    }
  });

  // Delete confirmation
  document.getElementById('deleteClose').addEventListener('click', () => deleteModal.classList.remove('open'));
  document.getElementById('deleteCancel').addEventListener('click', () => deleteModal.classList.remove('open'));
  document.getElementById('deleteConfirm').addEventListener('click', () => {
    if (pendingDeleteId) {
      employees = employees.filter(x => x.id !== pendingDeleteId);
      saveData();
      deleteModal.classList.remove('open');
      render();
    }
  });

  // Search
  searchInput.addEventListener('input', render);

  // Init
  render();
})();