const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const { authenticateUser, getJuegosPorVocal, getJuegosIncorrectos, updateUserProgress, getUserProgress, insertUser, getAllUsersProgress, deleteUser, updateUserProgressManual } = require('./src/db/mongodb');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.loadFile('src/renderer/login.html');
}

// Configurar servidor Express
const expressApp = express();
const port = 3000;

expressApp.get('/api/progress', async (req, res) => {
  try {
    const progressData = await getAllUsersProgress();
    console.log('🟡 Datos enviados por /api/progress:', progressData); // Depuración
    res.json(progressData);
  } catch (e) {
    console.error('❌ Error al obtener datos de progreso:', e);
    res.status(500).json({ error: 'Error al obtener datos de progreso' });
  }
});

expressApp.post('/api/delete-user', async (req, res) => {
  try {
    const { userId } = req.body;
    await deleteUser(userId);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event: 'userDeleted', userId }));
      }
    });
    res.json({ success: true });
  } catch (e) {
    console.error('❌ Error al eliminar usuario:', e);
    res.status(500).json({ success: false, error: 'Error al eliminar usuario' });
  }
});

expressApp.post('/api/update-user-progress', async (req, res) => {
  try {
    const { userId, progress } = req.body;
    await updateUserProgressManual(userId, progress);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event: 'progressUpdated', userId }));
      }
    });
    res.json({ success: true });
  } catch (e) {
    console.error('❌ Error al actualizar progreso manualmente:', e);
    res.status(500).json({ success: false, error: 'Error al actualizar progreso' });
  }
});

expressApp.listen(port, () => {
  console.log(`🟢 Servidor Express iniciado en http://localhost:${port}`);
});

// Configurar WebSocket
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('🟢 Cliente WebSocket conectado');
  ws.on('message', (message) => {
    console.log(`🟡 Mensaje recibido: ${message}`);
  });
});

ipcMain.handle('update-user-progress', async (event, userId, vocal) => {
  try {
    await updateUserProgress(userId, vocal);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event: 'progressUpdated', userId, vocal }));
      }
    });
    return { success: true };
  } catch (e) {
    console.error('❌ Error al actualizar progreso desde main.js:', e);
    return { success: false };
  }
});

ipcMain.handle('get-shiny-port', () => {
  return 5318; // Puerto fijo que ya funciona
});

// Otros handlers...
ipcMain.handle('authenticate-user', async (event, email, password) => {
  try {
    const result = await authenticateUser(email, password);
    return result;
  } catch (e) {
    console.error('❌ Error en autenticación desde main.js:', e);
    return null;
  }
});

ipcMain.handle('get-juegos-por-vocal', async (event, vocal) => {
  try {
    const juegos = await getJuegosPorVocal(vocal);
    return juegos;
  } catch (e) {
    console.error('❌ Error al obtener juegos por vocal desde main.js:', e);
    return [];
  }
});

ipcMain.handle('get-juegos-incorrectos', async (event, vocal) => {
  try {
    const juegos = await getJuegosIncorrectos(vocal);
    return juegos;
  } catch (e) {
    console.error('❌ Error al obtener juegos incorrectos desde main.js:', e);
    return [];
  }
});

ipcMain.handle('get-user-progress', async (event, userId) => {
  try {
    const progress = await getUserProgress(userId);
    return progress;
  } catch (e) {
    console.error('❌ Error al obtener progreso desde main.js:', e);
    return { 'a': 0, 'e': 0, 'i': 0, 'o': 0, 'u': 0 };
  }
});

ipcMain.handle('register-user', async (event, data) => {
  try {
    const result = await insertUser(data);
    return result;
  } catch (e) {
    console.error('❌ Error al registrar usuario desde main.js:', e);
    return { success: false, message: 'Error al registrar el usuario.' };
  }
});

ipcMain.on('redirect-to-login', () => {
  console.log('🟡 Redirigiendo a login.html desde main.js');
  if (mainWindow) {
    mainWindow.loadFile('src/renderer/login.html');
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});