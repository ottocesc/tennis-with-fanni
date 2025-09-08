const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const express = require('express');
const multer = require('multer');
const morgan = require('morgan');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || '';

const uploadsDir = path.join(__dirname, 'uploads');
const publicDir = path.join(__dirname, 'public');
const dbFile = path.join(__dirname, 'events.json');

fse.ensureDirSync(uploadsDir);
fse.ensureDirSync(publicDir);

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Static files
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(publicDir));

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/', 'video/'];
    if (allowed.some(prefix => file.mimetype.startsWith(prefix))) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

// Helpers
function readEvents() {
  try {
    const raw = fs.readFileSync(dbFile, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function writeEvents(events) {
  fs.writeFileSync(dbFile, JSON.stringify(events, null, 2));
}

function requireAdmin(req, res, next) {
  const key = req.header('x-admin-key') || req.query.adminKey || '';
  if (!ADMIN_KEY) {
    return res.status(500).json({ error: 'Server is not configured with ADMIN_KEY' });
  }
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Events API
app.get('/api/events', (req, res) => {
  const events = readEvents().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(events);
});

app.post('/api/events', requireAdmin, upload.single('media'), (req, res) => {
  const { story } = req.body;
  if (!req.file) {
    return res.status(400).json({ error: 'media file is required' });
  }
  const mediaUrl = `/uploads/${req.file.filename}`;
  const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
  const event = {
    id: uuidv4(),
    story: story || '',
    mediaUrl,
    mediaType,
    createdAt: new Date().toISOString()
  };
  const events = readEvents();
  events.push(event);
  writeEvents(events);
  res.status(201).json(event);
});

app.delete('/api/events/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const events = readEvents();
  const index = events.findIndex(e => e.id === id);
  if (index === -1) return res.status(404).json({ error: 'Event not found' });
  const [deleted] = events.splice(index, 1);
  writeEvents(events);
  // Attempt to delete file
  if (deleted && deleted.mediaUrl) {
    const filePath = path.join(__dirname, deleted.mediaUrl.replace(/^\//, ''));
    fs.unlink(filePath, () => {});
  }
  res.json({ success: true });
});

// Contact API
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!email || !message) {
    return res.status(400).json({ error: 'email and message are required' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.COACH_EMAIL,
      subject: `New message from ${name || 'Website Visitor'}`,
      replyTo: email,
      text: message,
      html: `<p>${message.replace(/\n/g, '<br>')}</p><p>From: ${name || 'Anonymous'} &lt;${email}&gt;</p>`
    });

    res.json({ success: true, id: info.messageId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Fallback to index.html for root
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


