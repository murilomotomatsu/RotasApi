// /components/MapaComRota.jsx
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import * as toGeoJSON from '@tmcw/togeojson';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-polylinedecorator';
import 'leaflet.fullscreen/Control.FullScreen.css';
import 'leaflet.fullscreen';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/RotasApi/leaflet/marker-icon-2x.png',
  iconUrl: '/RotasApi/leaflet/marker-icon.png',
  shadowUrl: '/RotasApi/leaflet/marker-shadow.png',
});

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
    } else {
      console.warn('L.control.fullscreen não está disponível');
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
    console.log(center, 'a')
    control.addTo(map);
    return () => control.remove();
  }, [map, center]);
  return null;
}


function smoothPolyline(coords) {
  const smooth = [];
  for (let i = 1; i < coords.length; i++) {
    const [lat1, lon1] = coords[i - 1];
    const [lat2, lon2] = coords[i];
    if (
      [lat1, lon1, lat2, lon2].some(v => isNaN(v))
    ) continue;
    smooth.push([lat1, lon1]);
    const midLat = (lat1 + lat2) / 2;
    const midLon = (lon1 + lon2) / 2;
    smooth.push([midLat, midLon]);
  }
  if (coords.length > 0) {
    smooth.push(coords[coords.length - 1]);
  }
  return smooth;
}

export default function MapaComRota({ kmzUrl }) {
  const [userLocation, setUserLocation] = useState(null);
  const [rotaCoords, setRotaCoords] = useState([]);
  const [tracking, setTracking] = useState(false);
  const [recordedPath, setRecordedPath] = useState([]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      (err) => alert('Erro ao obter localização: ' + err.message)
    );
  }, []);

  useEffect(() => {
    if (!kmzUrl) return;
    fetch(kmzUrl)
      .then(res => res.arrayBuffer())
      .then(JSZip.loadAsync)
      .then(zip => {
        const kmlFile = Object.keys(zip.files).find(f => f.endsWith('.kml'));
        return zip.files[kmlFile].async('string');
      })
      .then(kmlString => {
        const parser = new DOMParser();
        const kmlDom = parser.parseFromString(kmlString, 'text/xml');
        const geojson = toGeoJSON.kml(kmlDom);

        const coords = geojson.features.flatMap(f => {
          if (f.geometry.type === 'LineString') return f.geometry.coordinates;
          if (f.geometry.type === 'MultiLineString') return f.geometry.coordinates.flat();
          return [];
        });

        const latLngCoords = coords
          .map(c => c.slice(0, 2))
          .filter(c => c.length === 2 && !isNaN(c[0]) && !isNaN(c[1]))
          .map(([lon, lat]) => [lat, lon]);

        console.log("Raw coords:", coords);
        console.log("LatLng coords:", latLngCoords);

        setRotaCoords(smoothPolyline(latLngCoords));
      })
      .catch(err => console.error('Erro ao ler KMZ:', err));
  }, [kmzUrl]);

  useEffect(() => {
    if (!tracking) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const latlng = [pos.coords.latitude, pos.coords.longitude];
        setRecordedPath(prev => [...prev, latlng]);
      },
      (err) => console.error('Erro ao gravar localização:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [tracking]);

  return (
    <div style={{ height: '500px', position: 'relative', marginTop: '2rem' }}>
      <button
        onClick={() => setTracking(prev => !prev)}
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          zIndex: 1000,
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

      {userLocation && (
        <MapContainer
          center={userLocation}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
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
            </>
          )}
          {recordedPath.length > 1 && <Polyline positions={recordedPath} color="red" />}
        </MapContainer>
      )}
    </div>
  );
}