import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Maps from './assets/maps.svg';
import Sheets from './assets/sheets.svg';
import Kmz from './assets/kmz.svg';
import MapaComRota from './MapRouter';
import Login from './components/Login';
import HistoricoRotas from './components/HistoricoRotas';
import './App.css';
import { db } from './firebase';

export default function App() {
  const [lat, setLat] = useState('');
  const [raio, setRaio] = useState('');
  const [ssvNome, setSsvNome] = useState('');
  const [resposta, setResposta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [userEmail, setUserEmail] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const progressInterval = useRef(null);

  useEffect(() => {
    const storedPerfil = localStorage.getItem('perfil');
    if (storedPerfil) {
      try {
        const parsed = JSON.parse(storedPerfil);
        setPerfil(parsed);
        if (parsed.email) setUserEmail(parsed.email);
      } catch {
        alert('Deslogado');
      }
    }
  }, []);

  useEffect(() => {
    if (perfil) {
      localStorage.setItem('perfil', JSON.stringify(perfil));
    }
  }, [perfil]);

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

      const { data } = await axios.post('https://rotasapi-dfed.onrender.com/rota', {
        lat_lon,
        raio_metros: parseFloat(raio),
      });

      const { job_id } = data;
      pollJob(job_id);

      const novoSSV = {
        nome: ssvNome,
        coordenadas: lat_lon,
        raio: raio
      };
      const atualizado = { ...perfil, ssvs: [...(perfil?.ssvs || []), novoSSV] };
      setPerfil(atualizado);

      const ref = doc(db, 'users', userEmail);
      await updateDoc(ref, { ssvs: atualizado.ssvs });

    } catch (error) {
      console.log(error)
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

  if (!userEmail && !perfil) return <Login onLogin={(email, ssvs) => {
    setUserEmail(email);
    const perfilInicial = {
      email,
      rotasFeitas: [],
      ssvs: ssvs || [],
      anotacoes: {}
    };
    setPerfil(perfilInicial);
  }} />;

  return (
    <main>
      <button onClick={() => setMostrarHistorico(!mostrarHistorico)} style={{ position: 'absolute', top: 10, right: 10, padding: 10, background: '#222', color: '#fff', borderRadius: 5 }}>
        ☰
      </button>

      {mostrarHistorico && <HistoricoRotas rotas={perfil?.rotasFeitas || []} />}

      <h1 className="h1">TechRoutes</h1>
      <form onSubmit={handleSubmit} className="flex">
        <input type="text" value={ssvNome} onChange={(e) => setSsvNome(e.target.value)} placeholder="Nome do SSV" required />
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
          {resposta.kmz_url && (
            <MapaComRota kmzUrl={`https://rotasapi-dfed.onrender.com${resposta.kmz_url}`} teste={ssvNome} />
          )}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '5' }}>
            <a href={`https://rotasapi-dfed.onrender.com${resposta.csv_url}`} target="_blank" rel="noopener noreferrer">
              <img src={Sheets} alt="Sheets" style={{ width: '100%' }} />
            </a>
            <a href={`https://rotasapi-dfed.onrender.com${resposta.kmz_url}`} target="_blank" rel="noopener noreferrer">
              <img src={Kmz} alt="KMZ" style={{ width: '100%' }} />
            </a>
            {resposta.google_maps_urls?.map((link, i) => (
              <a key={i} href={link} target="_blank" rel="noopener noreferrer">
                {i + 1}
                <img src={Maps} alt="Maps" style={{ width: '100%' }} />
              </a>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
