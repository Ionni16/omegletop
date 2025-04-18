// server/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connesso!'))
.catch(err => console.error('Errore connessione DB:', err));

app.get('/', (req, res) => res.send('Server attivo!'));

// Solo un utente in attesa (FIFO head)
let waiting = null;

io.on('connection', socket => {
  console.log('Nuovo utente connesso:', socket.id);

  // Chat broadcast
  socket.on('chatMessage', ({ text }) => {
    socket.broadcast.emit('chatMessage', { text });
  });

  // Join queue per matching
  socket.on('joinQueue', () => {
    console.log('joinQueue da', socket.id);
    if (!waiting) {
      waiting = socket.id;
      socket.emit('matchWaiting');
    } else {
      const partnerId = waiting;
      waiting = null;
      const users = [socket.id, partnerId];
      // Notifica entrambi con l'evento 'matched'
      socket.emit('matched', { users });
      io.to(partnerId).emit('matched', { users });
      console.log('Matched:', users);
    }
  });

  // WebRTC signaling
  socket.on('rtcOffer', ({ to, offer }) => io.to(to).emit('rtcOffer', { from: socket.id, offer }));
  socket.on('rtcAnswer', ({ to, answer }) => io.to(to).emit('rtcAnswer', { from: socket.id, answer }));
  socket.on('iceCandidate', ({ to, candidate }) => io.to(to).emit('iceCandidate', { from: socket.id, candidate }));

  socket.on('disconnect', () => {
    console.log('Utente disconnesso:', socket.id);
    if (waiting === socket.id) waiting = null;
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server in ascolto sulla porta ${PORT}`));
