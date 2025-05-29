const { MongoClient, ObjectId } = require('mongodb');

const url = "mongodb+srv://21030149:123@cluster0.6trvumx.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(url);
let db;

async function connect() {
  try {
    await client.connect();
    db = client.db('test');
    console.log("✅ Conectado a MongoDB");
    return db;
  } catch (e) {
    console.error("❌ Error al conectar a MongoDB:", e);
    throw e;
  }
}

async function insertUser(data) {
  try {
    if (!db) await connect();
    const userCollection = db.collection('usuarios');
    const existing = await userCollection.findOne({ email: data.email });
    if (existing) {
      console.log("⚠️ El correo ya está registrado");
      return { success: false, message: "El correo ya está registrado" };
    }

    const userData = {
      _id: new ObjectId().toHexString(),
      nombre: data.nombre,
      email: data.email,
      password: data.password,
      fecha_registro: new Date().toISOString(),
      isAdmin: data.isAdmin || false
    };

    const result = await userCollection.insertOne(userData);
    console.log("✅ Usuario registrado con ID:", userData._id);
    return { success: true, message: "Usuario registrado con éxito", userId: userData._id };
  } catch (e) {
    console.error("❌ Error al registrar usuario:", e);
    return { success: false, message: `Error al registrar usuario: ${e.message}` };
  }
}

async function authenticateUser(email, password) {
  try {
    if (!db) await connect();
    const userCollection = db.collection('usuarios');
    console.log("🟡 Buscando usuario con email:", email, "y password:", password);
    const user = await userCollection.findOne({ email, password });
    if (user) {
      console.log("✅ Usuario encontrado:", user._id);
      return { userId: user._id, isAdmin: user.isAdmin || false };
    } else {
      console.log("❌ Usuario no encontrado o contraseña incorrecta");
      return null;
    }
  } catch (e) {
    console.error("❌ Error durante la autenticación:", e);
    return null;
  }
}

async function getActivitiesByCategory(category) {
  try {
    if (!db) await connect();
    const lessonsCollection = db.collection('actividades');
    const activities = await lessonsCollection.find({ categoria: category }).toArray();
    activities.forEach(activity => {
      if (activity._id && typeof activity._id.toHexString === 'function') {
        activity._id = activity._id.toHexString();
      }
    });
    console.log("✅ Actividades encontradas:", activities.length);
    return activities;
  } catch (e) {
    console.error("❌ Error al obtener actividades:", e);
    return [];
  }
}

async function getJuegosPorVocal(vocal) {
  try {
    if (!db) await connect();
    const normalizedVocal = vocal.toLowerCase();
    const juegosVocalesCollection = db.collection('juegos_vocales');
    console.log("🔍 Buscando juegos con vocal:", normalizedVocal);
    const juegos = await juegosVocalesCollection.find({ vocal: normalizedVocal }).toArray();
    juegos.forEach(juego => {
      if (!juego.imagen || juego.imagen === '') {
        juego.imagen = 'https://via.placeholder.com/100';
      } else {
        let imagen = juego.imagen;
        if (imagen.startsWith('%20https')) {
          imagen = 'https' + imagen.substring(6);
        } else if (!imagen.toLowerCase().startsWith('http')) {
          imagen = 'https://' + imagen;
        }
        juego.imagen = imagen;
      }
      if (juego._id && typeof juego._id.toHexString === 'function') {
        juego._id = juego._id.toHexString();
      }
    });
    console.log("✅ Juegos encontrados para la vocal", normalizedVocal, ":", juegos.length);
    return juegos;
  } catch (e) {
    console.error("❌ Error al obtener juegos:", e);
    return [];
  }
}

async function getJuegosIncorrectos(vocal) {
  try {
    if (!db) await connect();
    const juegosVocalesCollection = db.collection('juegos_vocales');
    const todosJuegos = await juegosVocalesCollection.find().toArray();
    const juegos = todosJuegos.filter(juego => juego.vocal !== vocal).slice(0, 50);
    juegos.forEach(juego => {
      juego.esCorrecto = false;
      if (juego._id && typeof juego._id.toHexString === 'function') {
        juego._id = juego._id.toHexString();
      }
    });
    console.log("✅ Juegos incorrectos encontrados para vocal", vocal, ":", juegos.length);
    return juegos;
  } catch (e) {
    console.error("❌ Error al obtener juegos incorrectos:", e);
    return [];
  }
}

async function updateUserProgress(userId, vocal) {
  try {
    if (!db) await connect();
    const progressCollection = db.collection('progreso_usuarios');
    const progress = await progressCollection.findOne({ userId, vocal: vocal.toLowerCase() });
    if (progress) {
      const currentProgress = progress.progress || 0;
      await progressCollection.updateOne(
        { userId, vocal: vocal.toLowerCase() },
        { $set: { progress: currentProgress + 1 } }
      );
      console.log("📊 Progreso actualizado para usuario", userId, "vocal", vocal, ":", currentProgress + 1);
    } else {
      await progressCollection.insertOne({
        userId,
        vocal: vocal.toLowerCase(),
        progress: 1
      });
      console.log("📊 Nuevo progreso creado para usuario", userId, "vocal", vocal, ": 1");
    }
  } catch (e) {
    console.error("❌ Error al actualizar progreso:", e);
  }
}

async function getUserProgress(userId) {
  try {
    if (!db) await connect();
    const progressCollection = db.collection('progreso_usuarios');
    const progressList = await progressCollection.find({ userId }).toArray();
    const progressMap = { 'a': 0, 'e': 0, 'i': 0, 'o': 0, 'u': 0 };
    progressList.forEach(entry => {
      progressMap[entry.vocal] = entry.progress || 0;
    });
    console.log("📊 Progreso obtenido para usuario", userId, ":", progressMap);
    return progressMap;
  } catch (e) {
    console.error("❌ Error al obtener progreso:", e);
    return { 'a': 0, 'e': 0, 'i': 0, 'o': 0, 'u': 0 };
  }
}

async function getAllUsersProgress() {
  try {
    if (!db) await connect();
    const userCollection = db.collection('usuarios');
    const users = await userCollection.find().toArray();
    const allProgress = [];

    for (const user of users) {
      if (user.isAdmin) continue;
      const userId = typeof user._id === 'string' ? user._id : user._id.toHexString();
      const userProgress = await getUserProgress(userId);
      allProgress.push({
        userId,
        nombre: user.nombre || 'Usuario Desconocido',
        email: user.email || 'Sin email',
        progress: userProgress
      });
    }

    console.log("📊 Progreso de todos los usuarios obtenido:", allProgress.length, "usuarios");
    return allProgress;
  } catch (e) {
    console.error("❌ Error al obtener progreso de todos los usuarios:", e);
    return [];
  }
}

async function testAuth(email, password) {
  const result = await authenticateUser(email, password);
  console.log("Resultado de autenticación:", result);
  return result;
}

// src/db/mongodb.js
async function deleteUser(userId) {
  const db = await getDb();
  await db.collection('usuarios').deleteOne({ userId });
  await db.collection('progreso_usuarios').deleteOne({ userId });
}

async function updateUserProgressManual(userId, progress) {
  const db = await getDb();
  await db.collection('progreso_usuarios').updateOne(
    { userId },
    { $set: { progress } },
    { upsert: true }
  );
}

module.exports = {
  connect,
  insertUser,
  authenticateUser,
  getActivitiesByCategory,
  getJuegosPorVocal,
  getJuegosIncorrectos,
  updateUserProgress,
  getUserProgress,
  getAllUsersProgress,
  testAuth
};