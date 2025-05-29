let currentVocal = '';
let correctGames = [];
let incorrectGames = [];
let currentGameIndex = 0;
let options = [];
let userId = '';
let currentVideoUrl = '';

async function loadGame(vocal) {
  currentVocal = vocal.toLowerCase();
  userId = localStorage.getItem('userId');
  if (!userId) {
    console.error('❌ No hay usuario autenticado');
    alert('Por favor inicia sesión nuevamente');
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('vocalTitle').textContent = `Vocal: ${currentVocal.toUpperCase()}`;
  document.getElementById('instruction').textContent = `Selecciona la imagen que corresponde a la vocal ${currentVocal.toUpperCase()}`;

  try {
    console.log(`🟡 Cargando juegos para vocal: ${currentVocal}`);
    correctGames = await window.electronAPI.getJuegosPorVocal(currentVocal);
    incorrectGames = await window.electronAPI.getJuegosIncorrectos(currentVocal);
    console.log(`✅ Correctos: ${correctGames.length}, Incorrectos: ${incorrectGames.length}`);
    if (correctGames.length === 0) {
      console.error(`❌ No se encontraron juegos para la vocal: ${currentVocal}`);
      alert(`No hay juegos disponibles para la vocal ${currentVocal.toUpperCase()}`);
      window.location.href = 'home.html';
      return;
    }
    currentGameIndex = 0;
    playInstructionsAndNames();
  } catch (e) {
    console.error('❌ Error al cargar juegos:', e);
    alert('Error al cargar el juego');
  }
}

function playInstructionsAndNames() {
  const instructionsSound = new Howl({
    src: ['../utils/audio/instrucciones.mp3'],
    format: ['mp3'],
    onend: () => {
      playNamesSequentially(0);
    },
    onplayerror: () => console.error('❌ Error al reproducir instrucciones.mp3'),
    onloaderror: () => console.error('❌ Error al cargar instrucciones.mp3')
  });
  instructionsSound.play();

  showNextGame();
}

function playNamesSequentially(index) {
  if (index >= options.length) return;

  const option = options[index];
  if (option.audio_nombre) {
    const nameSound = new Howl({
      src: [`../utils/audio/${option.audio_nombre}`],
      format: ['mp3'],
      onend: () => {
        playNamesSequentially(index + 1);
      },
      onplayerror: (id, e) => console.error(`❌ Error al reproducir audio de ${option.nombre}:`, e),
      onloaderror: (id, e) => console.error(`❌ Error al cargar audio de ${option.nombre}:`, e)
    });
    nameSound.play();
  } else {
    playNamesSequentially(index + 1);
  }
}

function showNextGame() {
  if (currentGameIndex >= correctGames.length) {
    alert('¡Juego completado!');
    window.location.href = 'progress.html';
    return;
  }

  const gameArea = document.getElementById('gameArea');
  const feedback = document.getElementById('feedback');
  const nextBtn = document.getElementById('nextBtn');
  const showVideoBtn = document.getElementById('showVideoBtn');
  gameArea.innerHTML = '';
  feedback.classList.add('hidden');
  nextBtn.classList.add('hidden');
  showVideoBtn.classList.add('hidden');

  const correctGame = correctGames[currentGameIndex];
  const incorrectOptions = incorrectGames.sort(() => Math.random() - 0.5).slice(0, 3);
  options = [correctGame, ...incorrectOptions].sort(() => Math.random() - 0.5);

  options.forEach(option => {
    const card = document.createElement('div');
    card.className = 'bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-lg';
    let imageUrl = option.imagen || 'https://via.placeholder.com/150?text=Sin Imagen';
    if (!imageUrl.startsWith('http')) {
      imageUrl = 'https://' + imageUrl;
    } else {
      imageUrl = imageUrl.replace('https://https://', 'https://');
    }
    card.innerHTML = `
      <img src="${encodeURI(imageUrl)}" alt="${option.nombre}" class="w-full h-32 object-contain rounded mb-2" onerror="this.src='https://via.placeholder.com/150?text=Error'; console.error('❌ Error al cargar imagen de ${option.nombre}:', '${option.imagen}')">
      <p class="text-center font-semibold">${option.nombre}</p>
    `;
    card.addEventListener('click', () => handleSelection(option));
    gameArea.appendChild(card);
  });

  currentVideoUrl = correctGame.video || '';
  if (currentVideoUrl) {
    showVideoBtn.classList.remove('hidden');
  }
}

async function handleSelection(selectedOption) {
  const feedback = document.getElementById('feedback');
  const nextBtn = document.getElementById('nextBtn');
  const showVideoBtn = document.getElementById('showVideoBtn');
  const descriptionDiv = document.getElementById('description');
  const isCorrect = selectedOption.vocal === currentVocal;

  feedback.classList.remove('hidden');
  feedback.textContent = isCorrect ? '¡Correcto!' : 'Incorrecto';
  feedback.className = `text-center text-2xl font-bold mb-4 ${isCorrect ? 'text-green-600' : 'text-red-500'}`;

  if (isCorrect) {
    try {
      await window.electronAPI.updateUserProgress(userId, currentVocal);
      console.log('📊 Progreso actualizado');

      if (selectedOption.descripcion && selectedOption.audio_descripcion) {
        descriptionDiv.textContent = selectedOption.descripcion;
        descriptionDiv.classList.remove('hidden');
        const descriptionSound = new Howl({
          src: [`../utils/audio/${selectedOption.audio_descripcion}`],
          format: ['mp3'],
          onplayerror: (id, e) => console.error(`❌ Error al reproducir audio de descripción de ${selectedOption.nombre}:`, e),
          onloaderror: (id, e) => console.error(`❌ Error al cargar audio de descripción de ${selectedOption.nombre}:`, e)
        });
        descriptionSound.play();
      }

      const successSound = new Howl({
        src: ['https://cdn.pixabay.com/audio/2023/07/06/audio_4c2e18a357.mp3'],
        onplayerror: () => console.error('❌ Error al reproducir sonido de éxito'),
        onloaderror: () => console.error('❌ Error al cargar sonido de éxito')
      });
      successSound.play();
    } catch (e) {
      console.error('❌ Error al actualizar progreso:', e);
    }
  } else {
    const errorSound = new Howl({
      src: ['https://cdn.pixabay.com/audio/2023/07/06/audio_1a3b4c2e18.mp3'],
      onplayerror: () => console.error('❌ Error al reproducir sonido de error'),
      onloaderror: () => console.error('❌ Error al cargar sonido de error')
    });
    errorSound.play();
  }

  nextBtn.classList.remove('hidden');
}

function showVideo() {
  if (!currentVideoUrl) return;

  const videoModal = document.getElementById('videoModal');
  const videoContainer = document.getElementById('videoContainer');
  const videoIdMatch = currentVideoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  if (!videoIdMatch) {
    console.error('❌ Formato de YouTube URL inválido:', currentVideoUrl);
    return;
  }
  const videoId = videoIdMatch[1];
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  console.log(`🖼️ Cargando video: ${embedUrl}`);
  videoContainer.innerHTML = `
    <iframe width="100%" height="100%" src="${embedUrl}" title="YouTube video" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  `;
  videoModal.classList.remove('hidden');
}

document.getElementById('showVideoBtn').addEventListener('click', showVideo);
document.getElementById('closeVideoBtn').addEventListener('click', () => {
  const videoModal = document.getElementById('videoModal');
  const videoContainer = document.getElementById('videoContainer');
  videoContainer.innerHTML = '';
  videoModal.classList.add('hidden');
});
document.getElementById('nextBtn').addEventListener('click', () => {
  currentGameIndex++;
  showNextGame();
});
document.getElementById('homeBtn').addEventListener('click', () => {
  window.location.href = 'home.html';
});
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('userId');
  localStorage.removeItem('email');
  localStorage.removeItem('isAdmin');
  window.location.href = 'login.html';
});

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const vocal = urlParams.get('vocal');
  if (!vocal) {
    console.error('❌ No se proporcionó una vocal en la URL');
    alert('Por favor selecciona una vocal desde la página principal');
    window.location.href = 'home.html';
    return;
  }
  console.log(`🚀 Iniciando juego para vocal: ${vocal}`);
  loadGame(vocal);
});