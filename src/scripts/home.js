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
});