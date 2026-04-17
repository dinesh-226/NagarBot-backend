require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { setIO } = require('./controllers/issueController');

require('./services/cronService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin:"https://nagar-bot-frontend-7z1q.vercel.app/", methods: ['GET', 'POST'] },
});

setIO(io);

app.use(cors({ origin:"https://nagar-bot-frontend-7z1q.vercel.app/"}));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/users', require('./routes/users'));
app.get('/api/vapid-public-key', (_, res) => res.json({ key: process.env.VAPID_PUBLIC_KEY }));

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.get('/api/test-email', async (_, res) => {
  try {
    const { sendEmail } = require('./services/emailService');
    await sendEmail({ to: process.env.EMAIL_USER, subject: 'NagarBot Test Email', text: 'Email is working correctly!' });
    res.json({ message: 'Test email sent to ' + process.env.EMAIL_USER });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Server error' });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 5000;
connectDB().then(() => server.listen(PORT, () => console.log(`Server running on port ${PORT}`)));
