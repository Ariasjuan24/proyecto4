document.addEventListener('DOMContentLoaded', () => {
  console.log('🟡 admin.js cargado correctamente');

  const adminContent = document.getElementById('adminContent');
  const noAdminMessage = document.getElementById('noAdminMessage');
  const shinyIframe = document.getElementById('shinyIframe');
  const logoutBtn = document.getElementById('logoutBtn');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  if (isAdmin) {
    console.log('✅ Usuario es administrador');
    adminContent.classList.remove('hidden');
    noAdminMessage.classList.add('hidden');

    // Obtener el puerto de Shiny dinámicamente
    window.electronAPI.getShinyPort().then((port) => {
      console.log(`🟡 Puerto de Shiny obtenido: ${port}`);
      shinyIframe.src = `http://127.0.0.1:${port}`;
    }).catch((error) => {
      console.error('❌ Error al obtener el puerto de Shiny:', error);
      shinyIframe.src = 'http://127.0.0.1:5318'; // Fallback a puerto por defecto
    });
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