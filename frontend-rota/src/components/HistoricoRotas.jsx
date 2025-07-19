import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';

export default function HistoricoRotas({ rotas }) {
  return (
    <div style={{ position: 'absolute', top: 50, right: 10, background: 'grey', padding: 20, borderRadius: 8, zIndex: 2000, maxHeight: '80vh', overflowY: 'auto', width: '300px' }}>
      <h3>Histórico de Rotas</h3>
      {rotas.length === 0 ? (
        <p>Nenhuma rota registrada ainda.</p>
      ) : (
        rotas.map((rota, idx) => (
          <div key={idx} style={{ marginBottom: '1rem', border: '1px solid #ccc', borderRadius: 8, padding: 10 }}>
            <h4>{rota.nome}</h4>
            <p>{new Date(rota.data).toLocaleString()}</p>
            <p>📏 {rota.distanciaKm} km</p>
            {rota.observacao && <p>📝 {rota.observacao}</p>}
            <MapContainer
              center={rota.path[0]}
              zoom={15}
              style={{ height: '200px', width: '100%', marginTop: '0.5rem' }}
              scrollWheelZoom={true}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Polyline positions={rota.path} color="blue" />
              <Marker position={rota.path[0]} />
            </MapContainer>
          </div>
        ))
      )}
    </div>
  );
}
