// App.jsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Maps from './assets/maps.svg';
import Sheets from './assets/sheets.svg';
import Kmz from './assets/kmz.svg';
import MapaComRota from './MapRouter';
import { messaging, getToken, onMessage } from './firebase';
import './App.css';

export default function App() {
  const [lat, setLat] = useState('');
  const [raio, setRaio] = useState('');
  const [resposta, setResposta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef(null);
  const hasRegisteredRef = useRef(false);

  useEffect(() => {
    if (hasRegisteredRef.current) return;
    hasRegisteredRef.current = true;

    onMessage(messaging, (payload) => {
      alert(payload.notification?.title + '\n' + payload.notification?.body);
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}firebase-messaging-sw.js`)
        .then((registration) => {
          getToken(messaging, {
            vapidKey: 'BEb8lSDu8z9f_ejV670IU_9gl9m7RpSKMwei-A1J9m4juMgj9gxzujJxM1PycsJxeMXJNph6CVzlKy61Q88YbKs',
            serviceWorkerRegistration: registration
          }).then((currentToken) => {
            if (currentToken) {
              localStorage.setItem('fcm_token', currentToken);
            } else {
              console.warn('Nenhum token disponível');
            }
          });
        });
    }
  }, []); 


  const startFakeProgress = () => {
    let current = 0;
    progressInterval.current = setInterval(() => {
      current += current < 30 ? 0.3 : current < 70 ? 0.05 : 0.01;
      if (current >= 99) {
        current = 99;
        clearInterval(progressInterval.current);
      }
      setProgress(current);
    }, 200);
  };

  const stopFakeProgress = () => {
    clearInterval(progressInterval.current);
    setProgress(100);
    setTimeout(() => setProgress(0), 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResposta(null);
    setProgress(0);
    startFakeProgress();

    try {
      const lat_lon = lat.replace(/\s+/g, '');
      const token = localStorage.getItem('fcm_token');

      const { data } = await axios.post('https://rotasapi-dfed.onrender.com/rota', {
        lat_lon,
        raio_metros: parseFloat(raio),
        fcm_token: token
      });
      const { job_id } = data;
      pollJob(job_id);
    } catch (error) {
      alert('Erro ao iniciar geração de rota');
      stopFakeProgress();
      setLoading(false);
    }
  };

  const pollJob = (jobId) => {
    const interval = setInterval(async () => {
      const { data } = await axios.get(`https://rotasapi-dfed.onrender.com/rota/${jobId}`);
      if (data.status === 'completo') {
        clearInterval(interval);
        setResposta(data);
        stopFakeProgress();
        setLoading(false);
      } else if (data.status === 'erro') {
        clearInterval(interval);
        alert('Erro ao gerar rota: ' + data.erro);
        stopFakeProgress();
        setLoading(false);
      }
    }, 2000);
  };

  return (
    <main>
      <h1 className="h1">TechRoutes</h1>
      <form onSubmit={handleSubmit} className="flex">
        <input type="text" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude, longitude" required />
        <input type="number" step="any" value={raio} onChange={(e) => setRaio(e.target.value)} placeholder="Raio em metros" required />
        <button type="submit">Gerar Rota</button>
      </form>

      {loading && (
        <div className="Loading-Bar">
          <div className="Loading-Bar-Progress" style={{ width: `${progress}%` }} />
          <p>Carregando... {Math.floor(progress)}%</p>
        </div>
      )}

      {resposta && resposta.status === 'completo' && (
        <div className="flex">
          <img
            src={`https://rotasapi-dfed.onrender.com${resposta.image_url}`}
            alt="Rota"
            style={{ maxWidth: '100%', height: '20%', borderRadius: '8px', margin: '1rem' }}
          />
          <a href={`https://rotasapi-dfed.onrender.com${resposta.csv_url}`} target="_blank" rel="noopener noreferrer" >
            Baixar CSV
            <img src={Sheets} alt="Sheets" style={{ width: '10%', margin: '10px 10px -3%' }} />
          </a>
          <a href={`https://rotasapi-dfed.onrender.com${resposta.kmz_url}`} target="_blank" rel="noopener noreferrer" >
            Baixar KMZ
            <img src={Kmz} alt="KMZ" style={{ width: '10%', margin: '10px 10px -3%' }} />
          </a>
          {resposta.kmz_url && (
            <MapaComRota kmzUrl={`https://rotasapi-dfed.onrender.com${resposta.kmz_url}`} />
          )}
          {resposta.google_maps_urls?.map((link, i) => (
            <a key={i} href={link} target="_blank" rel="noopener noreferrer" >
              Trecho {i + 1}
              <img src={Maps} alt="Maps" style={{ width: '10%', margin: '10px 10px -3%' }} />
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
