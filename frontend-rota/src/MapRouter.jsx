import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import * as toGeoJSON from '@tmcw/togeojson';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.fullscreen/Control.FullScreen.css';
import 'leaflet.fullscreen';
import 'leaflet-polylinedecorator';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: './assets/marker-icon-2x.png',
  iconUrl: './assets/marker-icon.png',
  shadowUrl: './assets/marker-shadow.png',
});

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImZkOTM1MDMzNDgxYTQwZTQ5YzQxMThmNmRmMTJjNzMxIiwiaCI6Im11cm11cjY0In0=';


function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function fetchRouteFromORS(start, end) {
  const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: {
      'Authorization': ORS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      coordinates: [start, end]
    })
  });

  if (!response.ok) throw new Error('Erro ao buscar rota ORS');
  const data = await response.json();
  return data.features[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
}

function AddFullscreenControl() {
  const map = useMap();
  useEffect(() => {
    if (L.control.fullscreen) {
      const control = L.control.fullscreen();
      map.addControl(control);
      return () => map.removeControl(control);
    }
  }, [map]);
  return null;
}

function ResetViewButton({ center }) {
  const map = useMap();
  useEffect(() => {
    const control = L.control({ position: 'topleft' });
    control.onAdd = function () {
      const btn = L.DomUtil.create('button', 'leaflet-bar');
      btn.innerHTML = 'Center';
      btn.style.padding = '4px';
      btn.style.cursor = 'pointer';
      btn.onclick = () => map.flyTo(center, 17);
      return btn;
    };
    control.addTo(map);
    return () => control.remove();
  }, [map, center]);
  return null;
}

// 🔋 Wake Lock Hook
function useWakeLock(tracking) {
  useEffect(() => {
    if (!tracking) {
      return
    }
    let wakeLock = null;

    const requestWakeLock = async () => {
      try {
        wakeLock = await navigator.wakeLock?.request('screen');

        wakeLock?.addEventListener('release', () => {

        });
      } catch (err) {
        console.error('Erro ao solicitar Wake Lock:', err);
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    });

    return () => {
      document.removeEventListener('visibilitychange', requestWakeLock);
      wakeLock?.release?.();
    };
  }, []);
}




export default function MapaComRotaOpenRoute({ kmzUrl, teste = 'SSV_SR-XXXXX' }) {
  const [userLocation, setUserLocation] = useState(null);
  const [rotaCoords, setRotaCoords] = useState([]);
  const [tracking, setTracking] = useState(false);
  const [recordedPath, setRecordedPath] = useState([]);
  const [autoCenter, setAutoCenter] = useState(true);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [totalKm, setTotalKm] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [pendingFinish, setPendingFinish] = useState(false);


  const mapRef = useRef();
  const decoratorGroupRef = useRef([]);
  useWakeLock(tracking);

  useEffect(() => {
    if (!kmzUrl) return;
    fetch(kmzUrl)
      .then(res => res.arrayBuffer())
      .then(JSZip.loadAsync)
      .then(zip => {
        const kmlFile = Object.keys(zip.files).find(f => f.endsWith('.kml'));
        return zip.files[kmlFile].async('string');
      })
      .then(async kmlString => {
        const parser = new DOMParser();
        const kmlDom = parser.parseFromString(kmlString, 'text/xml');
        const geojson = toGeoJSON.kml(kmlDom);

        const rawCoords = geojson.features.flatMap(f => {
          if (f.geometry.type === 'LineString') return f.geometry.coordinates;
          if (f.geometry.type === 'MultiLineString') return f.geometry.coordinates.flat();
          return [];
        });

        const latLngs = rawCoords
          .map(([lon, lat]) => [lat, lon])
          .filter(([lat, lon]) => !isNaN(lat) && !isNaN(lon));

        const fullRoute = [];
        for (let i = 0; i < latLngs.length - 1; i++) {
          try {
            const route = await fetchRouteFromORS(
              [latLngs[i][1], latLngs[i][0]],
              [latLngs[i + 1][1], latLngs[i + 1][0]]
            );
            fullRoute.push(...route);
          } catch (err) {
            console.error(`Erro ao calcular rota ${i}:`, err);
          }
        }

        setRotaCoords(fullRoute);
        localStorage.setItem('rotaCoords', JSON.stringify(fullRoute));
      })
      .catch(err => console.error('Erro ao ler KMZ:', err));
  }, [kmzUrl]);

  useEffect(() => {
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const latlng = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(latlng);
        if (tracking) setRecordedPath(prev => [...prev, latlng]);

        if (autoCenter && mapRef.current) {
          const map = mapRef.current;
          map.setView(latlng, map.getZoom());
        }
      },
      (err) => console.error('Erro ao rastrear localização:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [tracking, autoCenter]);

  function finalizarRota() {
    const fim = new Date();
    setEndTime(fim);
    let km = 0;
    for (let i = 0; i < recordedPath.length - 1; i++) {
      const [lat1, lon1] = recordedPath[i];
      const [lat2, lon2] = recordedPath[i + 1];
      km += haversineDistance(lat1, lon1, lat2, lon2);
    }
    setTotalKm(km);

    try {
      const perfil = JSON.parse(localStorage.getItem('perfil') || '{}');

      const novaRota = {
        nome: teste,
        data: fim.toISOString(),
        distanciaKm: km.toFixed(2),
        observacao: observacao || '',
        path: recordedPath,
      };

      if (!perfil.rotasFeitas) {
        perfil.rotasFeitas = [];
      }

      perfil.rotasFeitas.push(novaRota);
      localStorage.setItem('perfil', JSON.stringify(perfil));
    } catch (err) {
      console.error('Erro ao salvar rota no perfil:', err);
    }

    const msg = `✅ TESTE: ${teste}\n` +
      `🕒 Início: ${startTime?.toLocaleString()}\n` +
      `🕓 Fim: ${fim.toLocaleString()}\n` +
      `⏱️ Duração: ${Math.round((fim - startTime) / 60000)} minutos\n` +
      `📏 Distância: ${km.toFixed(2)} km` +
      (observacao ? `\n🗒️ Observação: ${observacao}` : '');

    const encodedMsg = encodeURIComponent(msg);
    const url = `https://wa.me/?text=${encodedMsg}`;
    window.open(url, '_blank');

    setTracking(false);
    setShowModal(false);
    setObservacao('');
    setPendingFinish(false);
  }

  return (
    <div style={{ height: '500px', position: 'relative', marginTop: '2rem' }}>
      <div style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 1000 }}>
        <button
          onClick={() => {
            if (tracking) {
              setPendingFinish(true);
              setShowModal(true);
            } else {
              setStartTime(new Date());
              setTracking(true);
            }
          }}
          style={{
            marginBottom: 8,
            padding: '10px 15px',
            background: tracking ? 'red' : 'green',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer'
          }}
        >
          {tracking ? 'Parar' : 'Iniciar'}
        </button>

        <button
          onClick={() => setAutoCenter(prev => !prev)}
          style={{
            padding: '10px 15px',
            background: autoCenter ? '#555' : '#888',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
            marginTop: 5
          }}
        >
          {autoCenter ? 'Unlock' : 'Lock'}
        </button>
      </div>

      {userLocation && (
        <MapContainer
          ref={mapRef}
          center={userLocation}
          zoom={15}
          style={{ height: '500px', width: '100%' }}
        >
          <AddFullscreenControl />
          <ResetViewButton center={userLocation} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <Marker position={userLocation} />
          {rotaCoords.length > 0 && (
            <>
              <Polyline positions={rotaCoords} color="blue" />
              <Marker position={rotaCoords[0]} icon={L.icon({ iconUrl: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' })} />
            </>
          )}

          {recordedPath.length > 1 && <Polyline positions={recordedPath} color="red" />}
        </MapContainer>
      )}

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%',
          height: '100%', background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'grey', padding: 20, borderRadius: 8,
            width: '90%', maxWidth: 400, textAlign: 'center'
          }}>
            <h2 style={{ marginBottom: 10 }}>Adicione uma observação</h2>
            <textarea
              rows={4}
              placeholder="Digite algo opcional..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              style={{ width: '80%', marginBottom: 10, padding: 10 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => {
                  setShowModal(false);
                  setObservacao('');
                  setPendingFinish(false);
                }}
                style={{
                  background: '#ccc', border: 'none', padding: '10px 20px',
                  borderRadius: 5, cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={finalizarRota}
                style={{
                  background: 'green', color: 'white', border: 'none',
                  padding: '10px 20px', borderRadius: 5, cursor: 'pointer'
                }}
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
