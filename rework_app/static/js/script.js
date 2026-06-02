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
    });
  }

  if (backToLogin && registerPanel) {
    backToLogin.addEventListener('click', function(e){
      e.preventDefault();
      registerPanel.classList.add('d-none');
    });
  }

  // Handle register form submission
  if (registerForm) {
    registerForm.addEventListener('submit', function(e){
      e.preventDefault();
      const formData = new FormData(registerForm);
      const button = registerForm.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Creating…';
      
      fetch('/register', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
          if (data.error) {
            alert('Error: ' + data.error);
            button.disabled = false;
            button.textContent = 'Create account';
          } else {
            // Clear fields
            registerForm.reset();
            registerPanel.classList.add('d-none');
            // Focus login field and show message
            document.getElementById('username').focus();
            alert('Account created! You can now log in.');
          }
        })
        .catch(err => {
          console.error(err);
          alert('Network error. Please try again.');
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
          contactsList.innerHTML = '<li class="text-muted py-3 text-center"><small>No contacts yet. Add some to get started!</small></li>';
          return;
        }
        arr.forEach(c => {
          const li = document.createElement('li');
          li.className = 'contact-item';
          const initials = (c.username || `User ${c.id}`).substring(0, 2).toUpperCase();
          li.innerHTML = `
            <div class="contact-avatar">${initials}</div>
            <div class="flex-grow-1">
              <div class="contact-name">${c.username || 'Unknown'}</div>
              <div class="contact-meta">ID: ${c.id}${c.online ? ' • Online' : ' • Offline'}</div>
            </div>
          `;
          contactsList.appendChild(li);
        });
      })
      .catch(err => {
        contactsList.innerHTML = '<li class="text-muted py-3 text-center"><small>Could not load contacts</small></li>';
      });
  }

});
