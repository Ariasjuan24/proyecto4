document.addEventListener('DOMContentLoaded', () => {
  console.log('🟡 admin.js cargado correctamente');

  const adminContent = document.getElementById('adminContent');
  const noAdminMessage = document.getElementById('noAdminMessage');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const logoutBtn = document.getElementById('logoutBtn');

  if (isAdmin) {
    console.log('✅ Usuario es administrador');
    adminContent.classList.remove('hidden');
    noAdminMessage.classList.add('hidden');
  } else {
    console.log('❌ Usuario no es administrador');
    adminContent.classList.add('hidden');
    noAdminMessage.classList.remove('hidden');
  }

  logoutBtn.addEventListener('click', () => {
    console.log('🟡 Cerrando sesión');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    localStorage.removeItem('isAdmin');
    window.location.href = 'login.html';
  });
});