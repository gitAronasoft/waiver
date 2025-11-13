// routes/events.js
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// dossier uploads/events
const uploadDir = path.join(__dirname, '..', 'uploads', 'events');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, `${ts}_${safe}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/* ---------------------------- Helpers --------------------------- */
function normLabel(x) {
  if (typeof x !== 'string') return null;
  const t = x.trim().slice(0, 40);
  return t.length ? t : null;
}

/* ---------------------------- Helpers Récurrence --------------------------- */

/** Retourne le prochain Date >= baseDate correspondant au dayOfWeek (0=dim..6=sam) */
function nextDayOfWeek(baseDate, dayOfWeek) {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(),
                     baseDate.getHours(), baseDate.getMinutes(), baseDate.getSeconds(), 0);
  const diff = (dayOfWeek + 7 - d.getDay()) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Combine une date (yyyy-mm-dd) avec l'heure (h/m/s) d'une source */
function combineDateWithTime(targetDate, srcDate) {
  return new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    srcDate.getHours(),
    srcDate.getMinutes(),
    srcDate.getSeconds(),
    0
  );
}

/**
 * Génère les occurrences hebdo d’un event sur un horizon (jours).
 * - start_at / end_at: DATETIME
 * - recurrence_day_of_week: 0..6
 * - recurrence_until: 'YYYY-MM-DD' (ou null)
 */
function generateWeeklyOccurrences(event, horizonDays = 60) {
  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + horizonDays);

  const startBase = event.start_at ? new Date(event.start_at) : null;
  const endBase = event.end_at ? new Date(event.end_at) : null;
  const durationMs = (startBase && endBase) ? (endBase - startBase) : 0;

  let until = null;
  if (event.recurrence_until) {
    const u = new Date(event.recurrence_until);
    until = new Date(u.getFullYear(), u.getMonth(), u.getDate(), 23, 59, 59, 999);
  }

  const baseStart = startBase ? new Date(Math.max(now.getTime(), startBase.getTime())) : now;
  let cursorDay = nextDayOfWeek(baseStart, Number(event.recurrence_day_of_week));

  const out = [];
  while (cursorDay <= horizon && (!until || cursorDay <= until)) {
    const occStart = startBase ? combineDateWithTime(cursorDay, startBase) : cursorDay;
    const occEnd = durationMs > 0 ? new Date(occStart.getTime() + durationMs) : null;

    out.push({
      ...event,
      start_at: occStart,
      end_at: occEnd,
      _is_occurrence: true,
    });

    cursorDay = new Date(cursorDay.getTime());
    cursorDay.setDate(cursorDay.getDate() + 7);
  }
  return out;
}

/* --------------------------------- PUBLIC --------------------------------- */
/**
 * GET /public
 * - Retourne les events publics “simples”
 * - + génère les occurrences pour ceux à récurrence weekly (horizon par défaut 60 jours)
 * Query: ?horizon_days=60
 */
router.get('/public', async (req, res) => {
  try {
    const horizonDays = Math.max(1, Math.min(365, Number(req.query.horizon_days) || 60));
    const [rows] = await db.query(
      `SELECT id, title, description, start_at, end_at, image_url, payment_url,
              button_label,
              recurrence_rule, recurrence_day_of_week, recurrence_until,
              is_public, sort_order, created_at, updated_at
       FROM events
       WHERE is_public = 1
         AND (
           (end_at IS NULL OR end_at >= NOW())
           OR recurrence_rule <> 'none'
         )
       ORDER BY sort_order ASC, start_at ASC`
    );

    const result = [];
    const now = new Date();

    for (const ev of rows) {
      const isRecurring = ev.recurrence_rule === 'weekly' && ev.recurrence_day_of_week !== null;
      if (isRecurring) {
        result.push(...generateWeeklyOccurrences(ev, horizonDays));
      } else {
        const end = ev.end_at ? new Date(ev.end_at) : null;
        if (!end || end >= now) result.push(ev);
      }
    }

    // Tri final
    result.sort((a, b) => {
      const so = (a.sort_order || 0) - (b.sort_order || 0);
      if (so !== 0) return so;
      const sa = a.start_at ? new Date(a.start_at).getTime() : 0;
      const sb = b.start_at ? new Date(b.start_at).getTime() : 0;
      return sa - sb;
    });

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* --------------------------------- ADMIN ---------------------------------- */

// GET / (liste admin)
router.get('/', async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, description, start_at, end_at, is_public, sort_order,
              image_url, payment_url, button_label,
              recurrence_rule, recurrence_day_of_week, recurrence_until
       FROM events
       ORDER BY sort_order ASC, start_at DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST / (création)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const {
      title,
      description = null,
      start_at,
      end_at = null,
      is_public = 1,
      sort_order = 0,
      payment_url = null,
      button_label = null,            // ⬅️ nouveau
      recurrence_rule = 'none',       // 'none' | 'weekly'
      recurrence_day_of_week = null,  // 0..6 si weekly
      recurrence_until = null         // 'YYYY-MM-DD' ou null
    } = req.body || {};

    if (!title || !start_at) {
      return res.status(400).json({ message: 'title et start_at requis' });
    }

    if (payment_url && !/^https?:\/\//i.test(String(payment_url))) {
      return res.status(400).json({ message: 'payment_url invalide (http/https requis)' });
    }

    const label = normLabel(button_label);

    let image_url = null;
    if (req.file) image_url = `/uploads/events/${req.file.filename}`;

    const [r] = await db.query(
      `INSERT INTO events
        (title, description, start_at, end_at, is_public, sort_order,
         image_url, payment_url, button_label,
         recurrence_rule, recurrence_day_of_week, recurrence_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        start_at,
        end_at,
        is_public ? 1 : 0,
        Number(sort_order) || 0,
        image_url,
        payment_url,
        label, // ⬅️
        recurrence_rule,
        (recurrence_day_of_week === undefined || recurrence_day_of_week === '' ? null : Number(recurrence_day_of_week)),
        (recurrence_until || null)
      ]
      
    );
   


    res.status(201).json({
      id: r.insertId,
      message: 'Event created',
      image_url,
      payment_url,
      button_label: label
      
    });
    
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }

 


});

// PUT /:id (mise à jour)
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const id = req.params.id;
    const {
      title, description, start_at, end_at, is_public, sort_order,
      payment_url, button_label, // ⬅️ nouveau
      recurrence_rule, recurrence_day_of_week, recurrence_until
    } = req.body || {};

    if (payment_url !== undefined && payment_url !== null && payment_url !== '' &&
        !/^https?:\/\//i.test(String(payment_url))) {
      return res.status(400).json({ message: 'payment_url invalide (http/https requis)' });
    }

    const label = (button_label === undefined) ? undefined : normLabel(button_label);

    let setImg = '';
    const params = [
      title,
      description,
      start_at,
      end_at,
      (is_public === undefined ? null : Number(is_public)),
      (sort_order === undefined ? null : Number(sort_order)),
      (payment_url === '' ? null : payment_url),
      // button_label peut être null (effacer) ou string normalisée; undefined => ne pas toucher
      label,
      recurrence_rule,
      (recurrence_day_of_week === undefined || recurrence_day_of_week === '' ? null : Number(recurrence_day_of_week)),
      (recurrence_until === undefined || recurrence_until === '' ? null : recurrence_until)
    ];

    if (req.file) {
      setImg = `, image_url = ?`;
      params.push(`/uploads/events/${req.file.filename}`);
    }

    params.push(id);

    // On utilise COALESCE pour tous les champs; pour button_label, si undefined -> COALESCE(undefined, button_label) = button_label (donc inchangé).
    const [r] = await db.query(
      `UPDATE events SET
         title = COALESCE(?, title),
         description = COALESCE(?, description),
         start_at = COALESCE(?, start_at),
         end_at = COALESCE(?, end_at),
         is_public = COALESCE(?, is_public),
         sort_order = COALESCE(?, sort_order),
         payment_url = COALESCE(?, payment_url),
         button_label = COALESCE(?, button_label),
         recurrence_rule = COALESCE(?, recurrence_rule),
         recurrence_day_of_week = COALESCE(?, recurrence_day_of_week),
         recurrence_until = COALESCE(?, recurrence_until)
         ${setImg}
       WHERE id = ?`,
      params
    );

    res.json({ affected: r.affectedRows, message: 'Event updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT image_url FROM events WHERE id=?', [req.params.id]);
    if (rows[0]?.image_url) {
      const fp = path.join(__dirname, '..', rows[0].image_url);
      fs.existsSync(fp) && fs.unlinkSync(fp);
    }
    const [r] = await db.query(`DELETE FROM events WHERE id = ?`, [req.params.id]);
    res.json({ affected: r.affectedRows, message: 'Event deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
