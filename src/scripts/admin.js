document.addEventListener('DOMContentLoaded', () => {
  console.log('🟡 admin.js cargado correctamente a las ' + new Date().toLocaleTimeString());

  async function loadProgress() {
    try {
      const response = await window.electronAPI.loadAdminProgress();
      const { userData, vocalData, progress } = response || {};

      // Renderizar lista de usuarios
      const userList = document.getElementById('userList');
      userList.innerHTML = '';
      if (progress && Array.isArray(progress)) {
        progress.forEach(user => {
          const card = document.createElement('div');
          card.className = 'bg-white p-4 rounded shadow';
          card.innerHTML = `<h3 class="font-bold">${user.nombre}</h3><p>${user.email}</p>`;
          card.addEventListener('click', () => showUserProgressDialog(user));
          userList.appendChild(card);
        });
      } else {
        userList.innerHTML = '<p class="text-red-500">No se encontraron usuarios.</p>';
      }

      // Renderizar gráficos con Plotly si los datos están disponibles
      const userProgressChart = document.getElementById('userProgressChart');
      const vocalProgressChart = document.getElementById('vocalProgressChart');

      if (userData && userData.x && userData.y) {
        const chartTypeUser = document.getElementById('chartTypeUser').value;
        Plotly.newPlot('userProgressChart', [{
          x: userData.x,
          y: userData.y,
          type: chartTypeUser,
          marker: userData.marker || {}
        }], {
          title: 'Avance General por Usuario',
          xaxis: { title: 'Usuario' },
          yaxis: { title: 'Aciertos Totales' }
        });
      } else {
        userProgressChart.innerHTML = '<p class="text-red-500">Error al cargar el gráfico de usuarios. Los datos no están disponibles.</p>';
      }

      if (vocalData && vocalData.x && vocalData.y) {
        const chartTypeVocal = document.getElementById('chartTypeVocal').value;
        Plotly.newPlot('vocalProgressChart', [{
          x: vocalData.x,
          y: vocalData.y,
          type: chartTypeVocal,
          marker: vocalData.marker || {}
        }], {
          title: 'Avance General por Vocal',
          xaxis: { title: 'Vocal' },
          yaxis: { title: 'Promedio de Aciertos' }
        });
      } else {
        vocalProgressChart.innerHTML = '<p class="text-red-500">Error al cargar el gráfico de vocales. Los datos no están disponibles.</p>';
      }
    } catch (e) {
      console.error('❌ Error al cargar progreso:', e);
      const userProgressChart = document.getElementById('userProgressChart');
      const vocalProgressChart = document.getElementById('vocalProgressChart');
      userProgressChart.innerHTML = '<p class="text-red-500">Error al cargar el gráfico: ' + e.message + '</p>';
      vocalProgressChart.innerHTML = '<p class="text-red-500">Error al cargar el gráfico: ' + e.message + '</p>';
    }
  }

  function showUserProgressDialog(user) {
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
    dialog.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 class="text-xl font-bold mb-4">Progreso de ${user.nombre} (${user.email})</h2>
        <div id="userProgressDialogChart" class="h-64"></div>
        <div class="mt-4">
          ${Object.entries(user.progress).map(([vocal, aciertos]) => `
            <div class="flex justify-between">
              <span>Vocal ${vocal.toUpperCase()}:</span>
              <span>${aciertos} aciertos</span>
            </div>
          `).join('')}
        </div>
        <button class="mt-4 bg-purple-500 text-white p-2 rounded hover:bg-purple-600">Cerrar</button>
      </div>
    `;
    document.body.appendChild(dialog);

    Plotly.newPlot('userProgressDialogChart', [{
      x: ['A', 'E', 'I', 'O', 'U'],
      y: Object.values(user.progress),
      type: 'bar',
      marker: { color: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'] }
    }], {
      title: 'Progreso por Vocal',
      xaxis: { title: 'Vocal' },
      yaxis: { title: 'Aciertos' }
    });

    dialog.querySelector('button').addEventListener('click', () => dialog.remove());
  }

  document.getElementById('chartTypeUser').addEventListener('change', loadProgress);
  document.getElementById('chartTypeVocal').addEventListener('change', loadProgress);
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('email');
    window.location.href = 'login.html';
  });

  loadProgress();

  let intervalId = setInterval(() => {
    loadProgress().catch(() => {
      console.log('🟡 Deteniendo intervalo debido a errores persistentes');
      clearInterval(intervalId);
    });
  }, 10000);
});