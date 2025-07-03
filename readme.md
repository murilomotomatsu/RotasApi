```bash
uvicorn main:app --reload
```

## Endpoint `/rota`
POST JSON:
```json
{
  "lat": -23.5505,
  "lon": -46.6333,
  "raio_km": 1
}
```

Retorna:
```json
{
  "image_url": "/static/mapa_XXXX.png",
  "csv_url": "/static/rota_XXXX.csv",
  "google_maps_url": "https://www.google.com/maps/dir/..."
}
```
