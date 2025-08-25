// server.js — Carvi con Postgres en Render
console.log("➡️ Iniciando servidor Carvi con Postgres...");

const path = require('path');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---------- BD (Postgres en Render) ----------
const pool = new Pool({
  connectionString: "postgresql://carviuser:R9SnIY4LyhBjqRnTZ5jrWVHAKXZF4ssv@dpg-d2mala9r0fns73dbnnjg-a.oregon-postgres.render.com/carvidb", 
  ssl: { rejectUnauthorized: false }
});

// Crear tabla si no existe
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        source TEXT DEFAULT 'landing',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Tabla waitlist lista en Postgres");
  } catch (err) {
    console.error("❌ Error inicializando Postgres:", err);
  }
})();

// ---------- Archivos estáticos ----------
const PUBLIC_DIR = __dirname;
app.use(express.static(PUBLIC_DIR));

app.get('/', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ---------- API ----------
app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ ok:false, msg:'Email inválido' });
  }

  try {
    await pool.query('INSERT INTO waitlist (email) VALUES ($1)', [email.trim().toLowerCase()]);
    res.json({ ok:true, msg:'¡Gracias por sumarte!' });
  } catch (err) {
    if (String(err.message).includes('duplicate key')) {
      return res.status(409).json({ ok:false, msg:'Ese email ya está registrado' });
    }
    console.error('❌ Error insert:', err);
    res.status(500).json({ ok:false, msg:'Error del servidor' });
  }
});

app.get('/api/waitlist', async (_req, res) => {
  try {
    const result = await pool.query('SELECT id,email,source,created_at FROM waitlist ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ ok:false, msg:'Error al leer DB' });
  }
});

// ---------- Listen ----------
app.listen(PORT, () => {
  console.log(`🚀 Carvi server corriendo en http://localhost:${PORT}`);
});
