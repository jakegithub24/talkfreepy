// Client script for minimal auth UX
document.addEventListener('DOMContentLoaded', function() {
  const authForm = document.getElementById('authForm');
  const registerToggle = document.getElementById('doRegister');
  const registerPanel = document.getElementById('registerPanel');
  const registerForm = document.getElementById('registerForm');

  if (registerToggle && registerPanel) {
    registerToggle.addEventListener('click', function(e){
      e.preventDefault();
      registerPanel.classList.toggle('d-none');
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', function(e){
      // let browser handle form POST to /login by default to keep things simple
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', function(e){
      e.preventDefault();
      const formData = new FormData(registerForm);
      fetch('/register', { method: 'POST', body: formData }).then(r=>r.json()).then(data=>{
        if (data.error) {
          alert('Error: ' + data.error);
        } else {
          alert('Account created. You can now log in.');
          registerPanel.classList.add('d-none');
        }
      }).catch(()=> alert('Network error'));
    });
  }
});
