document.addEventListener('DOMContentLoaded', () => {
  console.log('🟡 login.js cargado correctamente a las ' + new Date().toLocaleTimeString());

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginForm = document.getElementById('loginForm');

  if (!emailInput || !passwordInput || !loginForm) {
    console.error('❌ No se encontraron los elementos necesarios:', {
      emailInput: !!emailInput,
      passwordInput: !!passwordInput,
      loginForm: !!loginForm
    });
    return;
  }

  // Añadir eventos para depurar interacción
  emailInput.addEventListener('focus', () => console.log('🟢 Email input enfocado'));
  emailInput.addEventListener('input', (e) => console.log('🟢 Email input cambiado:', e.target.value));
  emailInput.addEventListener('keydown', (e) => console.log('🟢 Tecla presionada en email input:', e.key));
  passwordInput.addEventListener('focus', () => console.log('🟢 Password input enfocado'));
  passwordInput.addEventListener('input', (e) => console.log('🟢 Password input cambiado:', e.target.value));
  passwordInput.addEventListener('keydown', (e) => console.log('🟢 Tecla presionada en password input:', e.key));

  // Enfocar el campo de email al cargar
  emailInput.focus();
  console.log('🟡 Intento de enfocar el campo de email');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;
    const errorMessage = document.getElementById('errorMessage');

    console.log('🟡 Formulario enviado con:', { email, password });

    if (!email || !password) {
      errorMessage.textContent = 'Por favor, completa todos los campos.';
      errorMessage.classList.remove('hidden');
      return;
    }

    try {
      console.log(`🟡 Intentando autenticar con email: ${email}`);
      const result = await window.electronAPI.authenticateUser(email, password);

      if (result) {
        console.log('✅ Autenticación exitosa:', result);
        localStorage.setItem('userId', result.userId);
        localStorage.setItem('isAdmin', result.isAdmin);
        localStorage.setItem('email', email);
        window.location.href = 'home.html';
      } else {
        errorMessage.textContent = 'Correo o contraseña incorrectos.';
        errorMessage.classList.remove('hidden');
      }
    } catch (e) {
      console.error('❌ Error al autenticar usuario:', e);
      errorMessage.textContent = 'Error al iniciar sesión. Intenta de nuevo.';
      errorMessage.classList.remove('hidden');
    }
  });
});