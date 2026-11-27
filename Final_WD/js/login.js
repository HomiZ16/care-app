
    (function() {
      const tabLogin = document.getElementById('tabLoginBtn');
      const tabRegister = document.getElementById('tabRegisterBtn');
      const loginForm = document.getElementById('loginForm');
      const registerForm = document.getElementById('registerForm');
      const loginMsg = document.getElementById('loginMessage');
      const registerMsg = document.getElementById('registerMessage');
      const goToRegisterLink = document.getElementById('goToRegisterLink');
      const goToLoginLink = document.getElementById('goToLoginLink');

      const STORAGE_KEY = 'care_users_local_db';

      function setActiveTab(tab) {
        if (tab === 'login') {
          tabLogin.classList.add('active');
          tabRegister.classList.remove('active');
          loginForm.classList.add('active-form');
          registerForm.classList.remove('active-form');
          resetMessage(loginMsg, 'Enter your credentials to access your dashboard.', 'info');
        } else {
          tabRegister.classList.add('active');
          tabLogin.classList.remove('active');
          registerForm.classList.add('active-form');
          loginForm.classList.remove('active-form');
          resetMessage(registerMsg, 'Register to start managing your equipment.', 'info');
        }
      }

      function resetMessage(element, text, type = 'info') {
        element.classList.remove('error', 'success');
        if (type === 'error') element.classList.add('error');
        if (type === 'success') element.classList.add('success');
        let icon = 'fa-circle-info';
        if (type === 'error') icon = 'fa-exclamation-circle';
        if (type === 'success') icon = 'fa-check-circle';
        element.innerHTML = `<i class="fas ${icon}"></i><span>${text}</span>`;
      }

      function showMessage(element, text, type) {
        element.classList.remove('error', 'success');
        if (type === 'error') element.classList.add('error');
        if (type === 'success') element.classList.add('success');
        let icon = 'fa-circle-info';
        if (type === 'error') icon = 'fa-exclamation-circle';
        if (type === 'success') icon = 'fa-check-circle';
        element.innerHTML = `<i class="fas ${icon}"></i><span>${text}</span>`;
        if (type === 'error') {
          element.style.animation = 'none';
          void element.offsetWidth;
          element.style.animation = '';
        }
      }

      function getUsers() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        try { return JSON.parse(raw); } catch (e) { return {}; }
      }

      function saveUsers(users) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      }

      /* --- REGISTER --- */
      registerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim().toLowerCase();
        const password = document.getElementById('registerPassword').value;
        const confirm = document.getElementById('registerConfirm').value;

        if (!name || !email || !password || !confirm) {
          showMessage(registerMsg, 'Please fill in all fields.', 'error');
          return;
        }
        if (!email.includes('@') || !email.includes('.')) {
          showMessage(registerMsg, 'Enter a valid email address.', 'error');
          return;
        }
        if (password.length < 6) {
          showMessage(registerMsg, 'Password must be at least 6 characters.', 'error');
          return;
        }
        if (password !== confirm) {
          showMessage(registerMsg, 'Passwords do not match.', 'error');
          return;
        }

        const users = getUsers();
        if (users[email]) {
          showMessage(registerMsg, 'This email is already registered. Try logging in.', 'error');
          return;
        }

        users[email] = {
          name: name,
          email: email,
          password: password,
          registeredAt: new Date().toISOString()
        };
        saveUsers(users);

        showMessage(registerMsg, `Account created for ${name}. You can log in now.`, 'success');

        document.getElementById('loginEmail').value = email;
        setTimeout(() => {
          setActiveTab('login');
          showMessage(loginMsg, `Welcome ${name}! Please enter your password.`, 'success');
        }, 900);
      });

      /* --- LOGIN --- */
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
          showMessage(loginMsg, 'Email and password are required.', 'error');
          return;
        }

        const users = getUsers();
        const user = users[email];

        if (!user) {
          showMessage(loginMsg, 'No account found with this email. Please register.', 'error');
          return;
        }
        if (user.password !== password) {
          showMessage(loginMsg, 'Incorrect password. Try again.', 'error');
          return;
        }

        showMessage(loginMsg, `Welcome back, ${user.name}! Redirecting to dashboard...`, 'success');
        localStorage.setItem('care_current_user', JSON.stringify({ name: user.name, email: user.email }));

        // add a subtle pulse on the button (feedback)
        const btn = loginForm.querySelector('.btn-primary');
        btn.style.animation = 'none';
        void btn.offsetWidth;
        btn.style.animation = 'popIn 0.4s ease';

        // REDIRECT TO DASHBOARD AFTER 1 SECOND
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1000);
      });

      tabLogin.addEventListener('click', () => setActiveTab('login'));
      tabRegister.addEventListener('click', () => setActiveTab('register'));

      goToRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        const loginEmailVal = document.getElementById('loginEmail').value.trim();
        setActiveTab('register');
        if (loginEmailVal) document.getElementById('registerEmail').value = loginEmailVal;
      });

      goToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        const regEmailVal = document.getElementById('registerEmail').value.trim();
        setActiveTab('login');
        if (regEmailVal) document.getElementById('loginEmail').value = regEmailVal;
      });

      resetMessage(loginMsg, 'Enter your credentials to access your dashboard.', 'info');
      resetMessage(registerMsg, 'Register to start managing your equipment.', 'info');

            const currentUser = localStorage.getItem('care_current_user');
      if (currentUser) {
        try {
          const u = JSON.parse(currentUser);
          showMessage(loginMsg, `Welcome back, ${u.name}. Redirecting...`, 'success');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 800);
        } catch (e) {}
      } else {
        document.getElementById('loginEmail').focus();
      }}
    )();