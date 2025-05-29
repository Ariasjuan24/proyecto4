document.getElementById('logoutBtn').addEventListener('click', () => {
  console.log('🟡 Cerrando sesión');
  localStorage.removeItem('userId');
  localStorage.removeItem('email');
  localStorage.removeItem('isAdmin');
  window.location.href = 'login.html';
});

document.getElementById('activitiesBtn').addEventListener('click', () => {
  console.log('🟡 Navegando a la pantalla de actividades');
  window.location.href = 'activity.html';
});

document.addEventListener('DOMContentLoaded', () => {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    console.error('❌ No hay usuario autenticado');
    window.location.href = 'login.html';
  } else {
    console.log(`✅ Usuario autenticado: ${userId}`);
  }

  const adminBtn = document.getElementById('adminBtn');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  if (isAdmin) {
    console.log('✅ Mostrando botón de administración');
    adminBtn.classList.remove('hidden');
    adminBtn.addEventListener('click', () => {
      window.location.href = 'admin.html';
    });
  } else {
    console.log('❌ Ocultando botón de administración');
  }
});