const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  authenticateUser: (email, password) => {
    return ipcRenderer.invoke('authenticate-user', email, password);
  },
  getJuegosPorVocal: (vocal) => {
    return ipcRenderer.invoke('get-juegos-por-vocal', vocal);
  },
  getJuegosIncorrectos: (vocal) => {
    return ipcRenderer.invoke('get-juegos-incorrectos', vocal);
  },
  updateUserProgress: (userId, vocal) => {
    return ipcRenderer.invoke('update-user-progress', userId, vocal);
  },
  getUserProgress: (userId) => {
    return ipcRenderer.invoke('get-user-progress', userId);
  },
  registerUser: (data) => {
    return ipcRenderer.invoke('register-user', data);
  },
  redirectToLogin: () => {
    ipcRenderer.send('redirect-to-login');
  },
  setCSP: (callback) => {
    callback();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = `
    default-src *;
    script-src 'self' 'unsafe-inline';
    style-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;
    img-src *;
    media-src *;
    frame-src *;
    connect-src *;
  `;
  document.head.appendChild(meta);
});