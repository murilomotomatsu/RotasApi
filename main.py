from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from utils import gerar_csv_rota, gerar_imagem_rota, gerar_link_google_maps
from pathlib import Path
import uuid
import os

app = FastAPI()

# CORS LIBERADO PARA LOCALHOST E GITHUB
origins = [
    "http://localhost:5173",
    "https://muritocg.github.io"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

os.makedirs("static", exist_ok=True)

class RotaInput(BaseModel):
    lat: float
    lon: float
    raio_km: float

@app.post("/rota")
async def rota(data: RotaInput):
    uid = str(uuid.uuid4())
    imagem_path = f"static/mapa_{uid}.png"
    csv_path = f"static/rota_{uid}.csv"

    pontos = gerar_csv_rota(data.lat, data.lon, data.raio_km, csv_path)
    gerar_imagem_rota(pontos, imagem_path)
    google_maps_url = gerar_link_google_maps(pontos)

    return JSONResponse({
        "image_url": f"/{imagem_path}",
        "csv_url": f"/{csv_path}",
        "google_maps_url": google_maps_url
    })

@app.get("/static/{file_path:path}")
async def serve_static(file_path: str):
    return FileResponse(path=f"static/{file_path}")