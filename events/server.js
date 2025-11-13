const express = require('express'); 
const bodyParser = require('body-parser');
const path = require("path");
const cors = require('cors');
const waiverRoutes = require('./routes/waiverRoutes');
const authRoutes = require('./routes/authRoutes');
const staffRoutes = require('./routes/staffRoutes');

const eventRoutes = require('./routes/eventRoutes');

require('./ratingEmailScheduler');

require('dotenv').config();

const db = require('./db/connection');





const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// ✅ Serve everything inside "public" folder (like CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Serve uploaded files from /public/uploads at /uploads URL
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Routes
app.use('/waivers', waiverRoutes);
app.use('/auth', authRoutes);
app.use('/staff', staffRoutes);
app.use('/api/staff', staffRoutes); // Added this line


app.use('/events', eventRoutes);  // => /events/...

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) AS total FROM customers');
    res.json({ dbConnected: true, totalCustomers: rows[0].total });
  } catch (err) {
    console.error('Erreur DB:', err.message);
    res.status(500).json({ dbConnected: false, error: err.message });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
