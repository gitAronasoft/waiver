const db = require('../config/database');
const path = require('path');
const fs = require('fs');

/**
 * Initialize events table if it doesn't exist
 */
const initializeEventsTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_at DATETIME NOT NULL,
        end_at DATETIME,
        image_url VARCHAR(500),
        payment_url VARCHAR(500),
        button_label VARCHAR(40),
        recurrence_rule VARCHAR(50) DEFAULT 'none',
        recurrence_day_of_week INT,
        recurrence_until DATE,
        is_public TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Events table initialized');
  } catch (error) {
    console.error('❌ Error initializing events table:', error);
  }
};

/**
 * Normalize button label (trim and limit to 40 chars)
 */
const normLabel = (str) => {
  if (typeof str !== 'string') return null;
  const trimmed = str.trim().slice(0, 40);
  return trimmed.length ? trimmed : null;
};

/**
 * Get next date matching the day of week
 */
const nextDayOfWeek = (baseDate, dayOfWeek) => {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(),
                     baseDate.getHours(), baseDate.getMinutes(), baseDate.getSeconds(), 0);
  const diff = (dayOfWeek + 7 - d.getDay()) % 7;
  d.setDate(d.getDate() + diff);
  return d;
};

/**
 * Combine date with time from source date
 */
const combineDateWithTime = (targetDate, srcDate) => {
  return new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    srcDate.getHours(),
    srcDate.getMinutes(),
    srcDate.getSeconds(),
    0
  );
};

/**
 * Generate weekly recurring event occurrences
 */
const generateWeeklyOccurrences = (event, horizonDays = 60) => {
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

  const occurrences = [];
  while (cursorDay <= horizon && (!until || cursorDay <= until)) {
    const occStart = startBase ? combineDateWithTime(cursorDay, startBase) : cursorDay;
    const occEnd = durationMs > 0 ? new Date(occStart.getTime() + durationMs) : null;

    occurrences.push({
      ...event,
      start_at: occStart,
      end_at: occEnd,
      _is_occurrence: true,
    });

    cursorDay = new Date(cursorDay.getTime());
    cursorDay.setDate(cursorDay.getDate() + 7);
  }
  return occurrences;
};

/**
 * GET /api/events/public
 * Get public events with generated recurrences
 */
const getPublicEvents = async (req, res) => {
  try {
    const horizonDays = Math.max(1, Math.min(365, Number(req.query.horizon_days) || 60));
    
    const [rows] = await db.query(
      `SELECT id, title, description, start_at, end_at, image_url, payment_url,
              button_label, recurrence_rule, recurrence_day_of_week, recurrence_until,
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

    // Final sort
    result.sort((a, b) => {
      const so = (a.sort_order || 0) - (b.sort_order || 0);
      if (so !== 0) return so;
      const sa = a.start_at ? new Date(a.start_at).getTime() : 0;
      const sb = b.start_at ? new Date(b.start_at).getTime() : 0;
      return sa - sb;
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching public events:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/events
 * Get all events (admin)
 */
const getAllEvents = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, description, start_at, end_at, is_public, sort_order,
              image_url, payment_url, button_label,
              recurrence_rule, recurrence_day_of_week, recurrence_until,
              created_at, updated_at
       FROM events
       ORDER BY sort_order ASC, start_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/events
 * Create new event
 */
const createEvent = async (req, res) => {
  try {
    const {
      title,
      description = null,
      start_at,
      end_at = null,
      is_public = 1,
      sort_order = 0,
      payment_url = null,
      button_label = null,
      recurrence_rule = 'none',
      recurrence_day_of_week = null,
      recurrence_until = null
    } = req.body || {};

    if (!title || !start_at) {
      return res.status(400).json({ message: 'title and start_at are required' });
    }

    if (payment_url && !/^https?:\/\//i.test(String(payment_url))) {
      return res.status(400).json({ message: 'payment_url must start with http:// or https://' });
    }

    const label = normLabel(button_label);
    let image_url = null;
    if (req.file) {
      image_url = `/uploads/events/${req.file.filename}`;
    }

    const [result] = await db.query(
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
        (is_public === 1 || is_public === '1' || is_public === true) ? 1 : 0,
        Number(sort_order) || 0,
        image_url,
        payment_url,
        label,
        recurrence_rule,
        (recurrence_day_of_week === undefined || recurrence_day_of_week === '' ? null : Number(recurrence_day_of_week)),
        (recurrence_until || null)
      ]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Event created',
      image_url,
      payment_url,
      button_label: label
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PUT /api/events/:id
 * Update event
 */
const updateEvent = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      title, description, start_at, end_at, is_public, sort_order,
      payment_url, button_label,
      recurrence_rule, recurrence_day_of_week, recurrence_until
    } = req.body || {};

    if (payment_url !== undefined && payment_url !== null && payment_url !== '' &&
        !/^https?:\/\//i.test(String(payment_url))) {
      return res.status(400).json({ message: 'payment_url must start with http:// or https://' });
    }

    const label = (button_label === undefined) ? undefined : normLabel(button_label);

    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (start_at !== undefined) { updates.push('start_at = ?'); params.push(start_at); }
    if (end_at !== undefined) { updates.push('end_at = ?'); params.push(end_at); }
    if (is_public !== undefined) { 
      updates.push('is_public = ?'); 
      params.push((is_public === 1 || is_public === '1' || is_public === true) ? 1 : 0); 
    }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(Number(sort_order) || 0); }
    if (payment_url !== undefined) { updates.push('payment_url = ?'); params.push(payment_url === '' ? null : payment_url); }
    if (label !== undefined) { updates.push('button_label = ?'); params.push(label); }
    if (recurrence_rule !== undefined) { updates.push('recurrence_rule = ?'); params.push(recurrence_rule); }
    if (recurrence_day_of_week !== undefined) {
      updates.push('recurrence_day_of_week = ?');
      params.push(recurrence_day_of_week === '' ? null : Number(recurrence_day_of_week));
    }
    if (recurrence_until !== undefined) {
      updates.push('recurrence_until = ?');
      params.push(recurrence_until === '' ? null : recurrence_until);
    }

    if (req.file) {
      updates.push('image_url = ?');
      params.push(`/uploads/events/${req.file.filename}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(id);

    const [result] = await db.query(
      `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ affected: result.affectedRows, message: 'Event updated' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * DELETE /api/events/:id
 * Delete event
 */
const deleteEvent = async (req, res) => {
  try {
    const id = req.params.id;

    // Get image URL to delete file
    const [rows] = await db.query('SELECT image_url FROM events WHERE id = ?', [id]);
    if (rows[0]?.image_url) {
      const filePath = path.join(__dirname, '../public', rows[0].image_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    const [result] = await db.query('DELETE FROM events WHERE id = ?', [id]);

    res.json({ affected: result.affectedRows, message: 'Event deleted' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  initializeEventsTable,
  getPublicEvents,
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent
};
