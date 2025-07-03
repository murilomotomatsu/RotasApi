// src/App.jsx
import { useState } from 'react';
import axios from 'axios';

export default function App() {
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [raio, setRaio] = useState('');
  const [resposta, setResposta] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResposta(null);

    try {
      const { data } = await axios.post('https://rotasapi-dfed.onrender.com/rota', {
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        raio_km: parseFloat(raio)
      });
      setResposta(data);
    } catch (error) {
      alert('Erro ao obter rota');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-4 bg-gray-100 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Consulta de Rota</h1>
      <form onSubmit={handleSubmit} className="space-y-3 bg-white p-4 rounded shadow w-full max-w-sm">
        <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" className="w-full border px-3 py-2" required />
        <input type="number" step="any" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="Longitude" className="w-full border px-3 py-2" required />
        <input type="number" step="any" value={raio} onChange={(e) => setRaio(e.target.value)} placeholder="Raio em km" className="w-full border px-3 py-2" required />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">Consultar</button>
      </form>

      {loading && <p className="mt-4">Carregando...</p>}

      {resposta && (
        <div className="mt-6 bg-white p-4 rounded shadow w-full max-w-md space-y-3">
          <a href={`https://rotasapi-dfed.onrender.com${resposta.image_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Ver Imagem</a>
          <a href={`https://rotasapi-dfed.onrender.com${resposta.csv_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Baixar CSV</a>
          <a href={resposta.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Abrir no Google Maps</a>
        </div>
      )}
    </main>
  );
}
