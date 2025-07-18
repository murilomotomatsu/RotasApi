// /components/MapaComRotaOpenRoute.jsx
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


const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImZkOTM1MDMzNDgxYTQwZTQ5YzQxMThmNmRmMTJjNzMxIiwiaCI6Im11cm11cjY0In0=';

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

function FlyToLocation({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 15);
  }, [center]);
  return null;
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
      btn.innerHTML = 'Centralizar';
      btn.style.padding = '4px';
      btn.style.cursor = 'pointer';
      btn.onclick = () => map.setView(center, 15);
      return btn;
    };
    control.addTo(map);
    return () => control.remove();
  }, [map, center]);
  return null;
}


export default function MapaComRotaOpenRoute({ kmzUrl }) {
  const [userLocation, setUserLocation] = useState(null);
  const [rotaCoords, setRotaCoords] = useState([]);
  const [tracking, setTracking] = useState(false);
  const [recordedPath, setRecordedPath] = useState([]);

  const mapRef = useRef();

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
            const route = await fetchRouteFromORS([latLngs[i][1], latLngs[i][0]], [latLngs[i + 1][1], latLngs[i + 1][0]]);
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
      },
      (err) => console.error('Erro ao rastrear localização:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [tracking]);

  return (
    <div style={{ height: '500px', position: 'relative', marginTop: '2rem' }}>
      <div style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 1000 }}>
        <button
          onClick={() => setTracking(prev => !prev)}
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
          <FlyToLocation center={userLocation} />
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
    </div>
  );
}
