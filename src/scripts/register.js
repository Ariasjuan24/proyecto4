document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorMessage = document.getElementById('errorMessage');

  if (!nombre || !email || !password) {
    errorMessage.textContent = 'Por favor, completa todos los campos.';
    errorMessage.classList.remove('hidden');
    return;
  }

  try {
    console.log(`🟡 Registrando usuario con email: ${email}`);
    const result = await window.electronAPI.registerUser({ nombre, email, password });

    if (result.success) {
      console.log('✅ Registro exitoso');
      alert('Registro exitoso. Por favor, inicia sesión.');
      window.electronAPI.redirectToLogin();
    } else {
      errorMessage.textContent = result.message || 'Error al registrar el usuario.';
      errorMessage.classList.remove('hidden');
    }
  } catch (e) {
    console.error('❌ Error al registrar usuario:', e);
    errorMessage.textContent = 'Error al registrar el usuario. Intenta de nuevo.';
    errorMessage.classList.remove('hidden');
  }
});