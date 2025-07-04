import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Maps from './assets/maps.svg'
import Sheets from './assets/sheets.svg'
import Kmz from './assets/kmz.svg'
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
      current += current < 30 ? 0.3 : current < 70 ? 0.05 : 0.01;
      if (current >= 99) {
        current = 99;
        clearInterval(progressInterval.current);
      }
      setProgress(current);
    }, current < 30 ? 100 : current < 70 ? 500000 : 100000);
  };

  const stopFakeProgress = () => {
    clearInterval(progressInterval.current);
    setProgress(100);
    setTimeout(() => setProgress(0), 1000);
  };

  const handleSubmit = async (e) => {
    console.log(lat)
    e.preventDefault();
    setLoading(true);
    setResposta(null);
    setProgress(0);
    startFakeProgress();

    try {
      const { data } = await axios.post('https://rotasapi-dfed.onrender.com/rota', {
        lat_lon: lat.trim(),
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
        <input type="any" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude, longitude" required />
        <input type="number" step="any" value={raio} onChange={(e) => setRaio(e.target.value)} placeholder="Raio em metros" required />
        <button type="submit">Gerar Rota</button>
      </form>

      {loading && (
        <div className="Loading-Bar">
          <div
            className="Loading-Bar-Progress"
            style={{ width: `${progress}%` }}
            />
            <p>Carregando..`${progress}%`</p>
        </div>
      )}

      {resposta && (
        <div className="flex">
          <img
            src={`https://rotasapi-dfed.onrender.com${resposta.image_url}`}
            alt="Rota"
            style={{ maxWidth: '100%', borderRadius: '8px', margin: '1rem' }}
          />
          <a href={`https://rotasapi-dfed.onrender.com${resposta.csv_url}`} target="_blank" rel="noopener noreferrer" >
          Baixar CSV
          <img src={Sheets} alt="Maps" style={{width:'10%', margin:'10px 10px -3%'}}/>
          </a>
          <a href={`https://rotasapi-dfed.onrender.com${resposta.kmz_url}`} target="_blank" rel="noopener noreferrer" >
          Baixar KMZ
          <img src={Kmz} alt="Maps" style={{width:'10%', margin:'10px 10px -3%'}}/>
          </a>
          {resposta.google_maps_urls.map((link, i) => (
            <a key={i} href={link} target="_blank" rel="noopener noreferrer" >
               Trecho {i + 1}
               <img src={Maps} alt="Maps" style={{width:'10%', margin:'10px 10px -3%'}}/>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
