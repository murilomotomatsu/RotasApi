import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css'

export default function App() {
  const [lat, setLat] = useState('');
  const [raio, setRaio] = useState('');
  const [resposta, setResposta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef(null);

  const startFakeProgress = () => {
    let current = 0;
    progressInterval.current = setInterval(() => {
      current += current < 30 ? 2 : current < 70 ? 1 : 0.5;
      if (current >= 99) {
        current = 99;
        clearInterval(progressInterval.current);
      }
      setProgress(current);
    }, current < 30 ? 100 : current < 70 ? 300 : 1000);
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
      const { data } = await axios.post('https://rotasapi-dfed.onrender.com/rota', {
        lat_lon: parseFloat(lat),
        raio_metros: parseFloat(raio)
      });
      setResposta(data);
    } catch (error) {
      alert('Erro ao obter rota');
    } finally {
      stopFakeProgress();
      setLoading(false);
    }
  };



  return (
    <main>
      <h1 className="h1">TechRoutes</h1>
      <form onSubmit={handleSubmit} className="flex">
        <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude, longitude" required />
        <input type="number" step="any" value={raio} onChange={(e) => setRaio(e.target.value)} placeholder="Raio em metros" required />
        <button type="submit">Consultar</button>
      </form>

      {loading && (
        <div className="Loading-Bar">
          <div
            className="Loading-Bar-Progress"
            style={{ width: `${progress}%` }}
          />
          <p>Carregando... {Math.floor(progress)}%</p>
        </div>
      )}

      {resposta && (
        <div className="flex">
          <img
            src={`https://rotasapi-dfed.onrender.com${resposta.image_url}`}
            alt="Rota"
            style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '1rem' }}
          />
          <a href={`https://rotasapi-dfed.onrender.com${resposta.csv_url}`} target="_blank" rel="noopener noreferrer" >Baixar CSV</a>
          {resposta.google_maps_urls.map((link, i) => (
            <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline block">
              Abrir trecho {i + 1} no Google Maps
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
