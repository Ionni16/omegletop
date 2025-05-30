// client/src/App.js
import React, { useEffect, useRef, useState } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Box, 
  Button, 
  Switch, 
  FormControlLabel 
} from '@mui/material';
import { io } from 'socket.io-client';

function App() {
  // ---------- Stati ----------
  const [socket, setSocket] = useState(null);        // Socket.io client instance
  const [isConnected, setIsConnected] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);

  // ---------- Riferimenti ai video ----------
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // ---------- Stream locale ----------
  const localStreamRef = useRef(null);

  // ---------- Tema Material-UI (colore primario e secondario personalizzati) ----------
  const theme = createTheme({
    palette: {
      primary: {
        main: '#4caf50' // verde
      },
      secondary: {
        main: '#ff9800' // arancione
      }
    },
    typography: {
      fontFamily: 'Roboto, sans-serif'
    }
  });

  // ---------- useEffect: Connessione Socket.io (base) ----------
  useEffect(() => {
    const newSocket = io('http://localhost:5000', { autoConnect: false });
    
    // Collegamento manuale
    newSocket.connect();

    // Una volta connesso
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connesso, ID:', newSocket.id);
    });

    // Eventuali altri eventi base (disconnect, ecc.)
    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnesso');
    });

    // Salviamo la socket
    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.close();
    };
  }, []);

  // Quando isCameraOn diventa true, collega lo stream al video
useEffect(() => {
  if (isCameraOn && localStreamRef.current && localVideoRef.current) {
    const videoEl = localVideoRef.current;
    videoEl.srcObject = localStreamRef.current;
    videoEl.play().catch(err => console.warn('Impossibile avviare play():', err));
  }
}, [isCameraOn]);


  // ---------- Avvio fotocamera e acquisizione video ----------
  // (La attiviamo solo dopo che l’utente clicca “Accendi camera” per esempio)
  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      console.log('Stream ottenuto:', stream);
      console.log('Video tracks:', stream.getVideoTracks());
      setIsCameraOn(true);  // monta il video e fa partire l'useEffect
    } catch (err) {
      console.error('Errore getUserMedia:', err);
      alert('Impossibile accedere alla videocamera/microfono.');
    }
  };
  
  

  // ---------- Esempio di funzione base per inviare/ricevere un messaggio (opzionale) ----------
  const handleTestMessage = () => {
    if (!socket) return;
    socket.emit('testMessage', { msg: 'Ciao dal front-end!' });
  };

  // ---------- Interruttore per l’effetto specchio ----------
  const toggleMirror = () => {
    setIsMirrored(prev => !prev);
  };

  // ---------- Render ----------
  return (
    <ThemeProvider theme={theme}>
      {/* Barretta in alto */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            OmegleTop
          </Typography>
          <Typography variant="body1">
            {isConnected ? 'Connesso' : 'Disconnesso'}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        {/* Titolo / descrizione */}
        <Typography variant="h4" gutterBottom>
          Benvenuto su OmegleTop
        </Typography>

        {/* Pulsante per accendere la camera */}
        {!isCameraOn && (
          <Button variant="contained" color="primary" onClick={handleStartCamera} sx={{ mr: 2 }}>
            Accendi la Fotocamera
          </Button>
        )}
        {/* Switch per l’effetto mirror */}
        {isCameraOn && (
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={isMirrored} 
                  onChange={toggleMirror} 
                  color="secondary"
                />
              }
              label="Effetto specchio"
            />
          </Box>
        )}

        {/* Sezione video: locale e remoto (il remoto è facoltativo finché non implementi WebRTC) */}
        <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'center' }}>
          {/* Video locale */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
  {isCameraOn ? (
    <video
      ref={localVideoRef}
      autoPlay
      muted
      playsInline
      style={{
        width: '800px',
        height: '450px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        objectFit: 'cover',
        transform: isMirrored ? 'scaleX(-1)' : 'none'
      }}
    />
  ) : (
    <Box
      sx={{
        width: '800px',
        height: '450px',
        background: 'repeating-linear-gradient(45deg, #999, #999 10px, #ccc 10px, #ccc 20px)',
        border: '1px solid #ccc',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#333',
        fontFamily: 'Montserrat, sans-serif',
        fontSize: '1.2rem',
        fontStyle: 'italic'
      }}
    >
      Telecamera spenta
    </Box>
  )}

  {isCameraOn && (
    <Button 
      variant="contained" 
      color="secondary" 
      sx={{ 
        mt: 5,
        px: 4,
        py: 1.5,
        fontSize: '1.3rem',
        fontWeight: 'bold',
        fontFamily: 'Montserrat, sans-serif'
      }}
      onClick={() => {
        alert('Hai cliccato su INIZIA!');
      }}
    >
      Inizia
    </Button>
  )}
</Box>



       </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;





