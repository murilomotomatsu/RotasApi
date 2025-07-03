# main.py
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from cpp_core import gerar_rota_cpp
from pathlib import Path
import uuid
import os

app = FastAPI()

origins = [
    "http://localhost:5173",
    "https://murilomotomatsu.github.io/RotasApi/"
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
    raio_metros: float

@app.post("/rota")
async def rota(data: RotaInput):
    uid = str(uuid.uuid4())
    pasta_saida = f"static/rota_{uid}"
    os.makedirs(pasta_saida, exist_ok=True)

    try:
        resultado = gerar_rota_cpp(data.lat, data.lon, data.raio_metros, pasta_saida)
        return JSONResponse({
            "csv_url": f"/{resultado['csv']}",
            "image_url": f"/{resultado['image']}",
            "kmz_url": f"/{resultado['kmz']}",
            "google_maps_urls": resultado['links']
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/static/{file_path:path}")
async def serve_static(file_path: str):
    return FileResponse(path=f"static/{file_path}")
