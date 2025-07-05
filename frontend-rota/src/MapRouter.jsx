import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import * as toGeoJSON from '@tmcw/togeojson';
import 'leaflet/dist/leaflet.css';

function FlyToLocation({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 15);
  }, [center]);
  return null;
}

export default function MapaComRota({ kmzUrl }) {
  const [userLocation, setUserLocation] = useState(null);
  const [rotaCoords, setRotaCoords] = useState([]);

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

        // Formato [lat, lon] esperado pelo leaflet
        setRotaCoords(coords.map(([lon, lat]) => [lat, lon]));
      })
      .catch(err => console.error('Erro ao ler KMZ:', err));
  }, [kmzUrl]);

  return (
    <div style={{ height: '400px', marginTop: '2rem' }}>
      {userLocation && (
        <MapContainer center={userLocation} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <FlyToLocation center={userLocation} />
          <Marker position={userLocation} />
          {rotaCoords.length > 0 && <Polyline positions={rotaCoords} color="blue" />}
        </MapContainer>
      )}
    </div>
  );
}
