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

  // Cargar categorías (vocales)
  const categoriesContainer = document.getElementById('categories');
  const vocales = ['a', 'e', 'i', 'o', 'u'];
  vocales.forEach(vocal => {
    const button = document.createElement('button');
    button.className = 'bg-purple-600 text-white p-4 rounded-lg shadow hover:bg-purple-700';
    button.textContent = vocal.toUpperCase();
    button.addEventListener('click', () => loadActivities(vocal));
    categoriesContainer.appendChild(button);
  });
});

async function loadActivities(vocal) {
  try {
    console.log(`🟡 Cargando actividades para vocal: ${vocal}`);
    const activities = await window.electronAPI.getJuegosPorVocal(vocal);
    console.log(`✅ Actividades encontradas para la vocal ${vocal}: ${activities.length}`);

    const activitiesTitle = document.getElementById('activitiesTitle');
    activitiesTitle.textContent = `Animales con la Vocal ${vocal.toUpperCase()}`;
    activitiesTitle.classList.remove('hidden');

    const activitiesContainer = document.getElementById('activities');
    activitiesContainer.innerHTML = '';

    if (activities.length === 0) {
      activitiesContainer.innerHTML = `<p class="text-center text-gray-500">No hay actividades disponibles para la vocal ${vocal.toUpperCase()}.</p>`;
      return;
    }

    activities.forEach(activity => {
      const card = document.createElement('div');
      card.className = 'bg-white p-4 rounded-lg shadow';
      card.innerHTML = `
        <img src="${encodeURI(activity.imagen)}" alt="${activity.nombre}" class="w-full h-32 object-contain rounded mb-2" onerror="this.src='https://via.placeholder.com/150?text=Error'; console.error('❌ Error al cargar imagen de ${activity.nombre}:', '${activity.imagen}')">
        <h3 class="text-lg font-semibold text-center">${activity.nombre}</h3>
        <div class="flex justify-center gap-2 mt-2">
          <button class="playBtn bg-green-500 text-white p-2 rounded hover:bg-green-600" data-vocal="${vocal}">Jugar</button>
          ${activity.video ? `<button class="videoBtn bg-blue-500 text-white p-2 rounded hover:bg-blue-600" data-video="${activity.video}">Ver Video</button>` : ''}
        </div>
      `;
      activitiesContainer.appendChild(card);
    });

    // Añadir eventos a los botones de "Jugar"
    document.querySelectorAll('.playBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const vocal = e.target.getAttribute('data-vocal');
        window.location.href = `game.html?vocal=${vocal}`;
      });
    });

    // Añadir eventos a los botones de "Ver Video"
    document.querySelectorAll('.videoBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const videoUrl = e.target.getAttribute('data-video');
        const videoIdMatch = videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
        if (!videoIdMatch) {
          console.error('❌ Formato de YouTube URL inválido:', videoUrl);
          return;
        }
        const videoId = videoIdMatch[1];
        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        window.open(embedUrl, '_blank');
      });
    });
  } catch (e) {
    console.error('❌ Error al cargar actividades:', e);
    const activitiesContainer = document.getElementById('activities');
    activitiesContainer.innerHTML = '<p class="text-center text-red-500">Error al cargar las actividades.</p>';
  }
}