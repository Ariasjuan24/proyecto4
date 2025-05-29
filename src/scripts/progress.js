document.getElementById('homeBtn').addEventListener('click', () => {
  window.location.href = 'home.html';
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('userId');
  localStorage.removeItem('email');
  localStorage.removeItem('isAdmin');
  window.location.href = 'login.html';
});

document.addEventListener('DOMContentLoaded', async () => {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    console.error('❌ No hay usuario autenticado');
    window.location.href = 'login.html';
    return;
  }

  try {
    const progress = await window.electronAPI.getUserProgress(userId);
    console.log('📊 Progreso obtenido:', progress);

    // Mostrar detalles de progreso
    const progressDetails = document.getElementById('progressDetails');
    progressDetails.innerHTML = `
      <p>A: ${progress['a']} intentos</p>
      <p>E: ${progress['e']} intentos</p>
      <p>I: ${progress['i']} intentos</p>
      <p>O: ${progress['o']} intentos</p>
      <p>U: ${progress['u']} intentos</p>
    `;

    // Configurar el gráfico con Chart.js
    const ctx = document.getElementById('progressCanvas').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['A', 'E', 'I', 'O', 'U'],
        datasets: [{
          label: 'Intentos',
          data: [progress['a'], progress['e'], progress['i'], progress['o'], progress['u']],
          backgroundColor: ['#4B5EAA', '#5DADE2', '#58D68D', '#F4A261', '#D35400'],
          borderColor: ['#2E4057', '#2874A6', '#27AE60', '#BA6F4E', '#A93226'],
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Número de Intentos' }
          },
          x: {
            title: { display: true, text: 'Vocales' }
          }
        }
      }
    });
  } catch (e) {
    console.error('❌ Error al cargar el progreso:', e);
    document.getElementById('progressDetails').innerHTML = '<p>Error al cargar el progreso</p>';
  }
});