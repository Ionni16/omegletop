// server/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' } // o 'http://localhost:3000'
});

app.use(cors());
app.use(express.json());

// Connessione a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connesso!');
}).catch((err) => {
  console.error('Errore connessione DB:', err);
});

app.get('/', (req, res) => {
  res.send('Server attivo!');
});

// coda di utenti in attesa
let waitingQueue = [];

// socket.io
io.on('connection', (socket) => {
  console.log('Nuovo utente connesso:', socket.id);

  // Ricevo la richiesta di entrare in coda
  socket.on('joinQueue', () => {
    console.log(`joinQueue da utente: ${socket.id}`);

    if (waitingQueue.length === 0) {
      // Nessuno in attesa -> inserisco l'utente nella coda
      waitingQueue.push(socket.id);
      console.log('Utente aggiunto in coda:', socket.id);
    } else {
      // C'è qualcuno in attesa -> match
      const partnerId = waitingQueue.shift(); // rimuovo il primo dalla coda
      const roomName = `${socket.id}#${partnerId}`;
      
      // Faccio joinare entrambi in una "room"
      socket.join(roomName);
      io.sockets.sockets.get(partnerId)?.join(roomName);

      // Invio evento di "matched" ai due
      io.to(roomName).emit('matched', {
        roomName,
        users: [socket.id, partnerId]
      });

      socket.on('rtcOffer', ({ to, offer }) => {
        // 'to' è l'ID socket dell'altro utente
        io.to(to).emit('rtcOffer', { from: socket.id, offer });
      });
    
      socket.on('rtcAnswer', ({ to, answer }) => {
        io.to(to).emit('rtcAnswer', { from: socket.id, answer });
      });
    
      socket.on('iceCandidate', ({ to, candidate }) => {
        io.to(to).emit('iceCandidate', { from: socket.id, candidate });
      });
    

      console.log(`Creato match: ${socket.id} e ${partnerId} in room ${roomName}`);
    }
  });

  // Gestione messaggi in chat
  socket.on('chatMessage', ({ roomName, message }) => {
    // Inoltro il messaggio a tutti nella stanza
    io.to(roomName).emit('chatMessage', {
      from: socket.id,
      message
    });
  });

  // Gestione di skip/uscita
  socket.on('skip', ({ roomName }) => {
    // Avvisa l'altra persona
    io.to(roomName).emit('chatEnded', { reason: 'skip' });
    // Scollega i socket dalla stanza
    socket.leave(roomName);
    // In un caso base, potresti rimettere l'altro in coda,
    // dipende dalla logica che vuoi.
  });

  // Quando un utente si disconnette
  socket.on('disconnect', () => {
    console.log(`Utente disconnesso: ${socket.id}`);
    // Se l'utente era in coda, lo rimuovo
    waitingQueue = waitingQueue.filter(id => id !== socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});

