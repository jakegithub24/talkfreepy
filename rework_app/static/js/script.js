// Client script for minimal auth UX and dashboard

document.addEventListener('DOMContentLoaded', function() {
  const authForm = document.getElementById('authForm');
  const registerToggle = document.getElementById('doRegister');
  const backToLogin = document.getElementById('backToLogin');
  const registerPanel = document.getElementById('registerPanel');
  const registerForm = document.getElementById('registerForm');

  // Toggle register panel visibility
  if (registerToggle && registerPanel) {
    registerToggle.addEventListener('click', function(e){
      e.preventDefault();
      registerPanel.classList.remove('d-none');
      document.getElementById('regUsername').focus();
    });
  }

  if (backToLogin && registerPanel) {
    backToLogin.addEventListener('click', function(e){
      e.preventDefault();
      registerPanel.classList.add('d-none');
      document.getElementById('username').focus();
    });
  }

  // Handle login form submission
  if (authForm) {
    authForm.addEventListener('submit', function(e){
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      const button = authForm.querySelector('button[type="submit"]');
      
      if (!username || !password) {
        showError('Please enter both username and password');
        return;
      }
      
      button.disabled = true;
      button.textContent = 'Logging in…';
      
      fetch('/login', { 
        method: 'POST', 
        body: new URLSearchParams({ username, password })
      })
        .then(r => r.json())
        .then(data => {
          if (data.message && data.redirect) {
            // Successful login
            window.location.href = data.redirect;
          } else if (data.error) {
            showError(data.error);
            button.disabled = false;
            button.textContent = 'Log in';
          }
        })
        .catch(err => {
          console.error(err);
          showError('Network error. Please try again.');
          button.disabled = false;
          button.textContent = 'Log in';
        });
    });
  }

  // Handle register form submission
  if (registerForm) {
    registerForm.addEventListener('submit', function(e){
      e.preventDefault();
      const username = document.getElementById('regUsername').value.trim();
      const password = document.getElementById('regPassword').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const button = registerForm.querySelector('button[type="submit"]');
      
      if (!username || !password) {
        showError('Username and password are required');
        return;
      }
      
      button.disabled = true;
      button.textContent = 'Creating…';
      
      fetch('/register', { 
        method: 'POST', 
        body: new URLSearchParams({ username, password, email })
      })
        .then(r => r.json())
        .then(data => {
          if (data.message) {
            // Successful registration
            registerForm.reset();
            registerPanel.classList.add('d-none');
            document.getElementById('username').value = username;
            document.getElementById('password').focus();
            showSuccess(data.message);
            button.disabled = false;
            button.textContent = 'Create account';
          } else if (data.error) {
            showError(data.error);
            button.disabled = false;
            button.textContent = 'Create account';
          }
        })
        .catch(err => {
          console.error(err);
          showError('Network error. Please try again.');
          button.disabled = false;
          button.textContent = 'Create account';
        });
    });
  }

  // Dashboard: fetch contacts
  const contactsList = document.getElementById('contactsList');
  if (contactsList) {
    fetch('/api/contacts')
      .then(r => {
        if (r.status === 200) return r.json();
        throw new Error('Not authenticated');
      })
      .then(arr => {
        contactsList.innerHTML = '';
        if (arr.length === 0) {
          contactsList.innerHTML = '<li class="contact-item py-3"><div class="text-center w-100"><small class="text-muted">No contacts yet. Add some to get started!</small></div></li>';
          return;
        }
        arr.forEach(c => {
          const li = document.createElement('li');
          li.className = 'contact-item';
          const initials = (c.username || `User ${c.id}`).substring(0, 2).toUpperCase();
          const status = c.online ? '🟢 Online' : '⚪ Offline';
          li.innerHTML = `
            <div class="contact-avatar">${initials}</div>
            <div class="flex-grow-1">
              <div class="contact-name">${c.username || 'Unknown'}</div>
              <div class="contact-meta">${status}</div>
            </div>
          `;
          contactsList.appendChild(li);
        });
      })
      .catch(err => {
        contactsList.innerHTML = '<li class="contact-item py-3"><div class="text-center w-100"><small class="text-muted">Could not load contacts</small></div></li>';
      });
  }

  // Helper functions for messages
  function showError(message) {
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) existingAlert.remove();
    
    const alert = document.createElement('div');
    alert.className = 'alert alert-warning alert-sm';
    alert.textContent = message;
    
    const form = document.getElementById('authForm') || document.getElementById('registerForm');
    if (form) {
      form.parentNode.insertBefore(alert, form);
    }
  }

  function showSuccess(message) {
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) existingAlert.remove();
    
    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-sm';
    alert.style.background = '#d1fae5';
    alert.style.color = '#065f46';
    alert.textContent = message;
    
    const form = document.getElementById('authForm') || document.getElementById('registerForm');
    if (form) {
      form.parentNode.insertBefore(alert, form);
      setTimeout(() => alert.remove(), 3000);
    }
  }

});
