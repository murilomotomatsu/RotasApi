# main.py
from fastapi import FastAPI, BackgroundTasks, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from cpp_core import gerar_rota_cpp
from pathlib import Path
import uuid
import os
import firebase_admin
from firebase_admin import messaging, credentials
from typing import Dict

# Inicializa Firebase
cred = credentials.Certificate("firebase-adminsdk.json")
firebase_admin.initialize_app(cred)

app = FastAPI()

origins = [
    "http://localhost:5173",
    "https://murilomotomatsu.github.io",
    "https://murilomotomatsu.github.io/RotasApi",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

os.makedirs("static", exist_ok=True)

# Armazena jobs em memória
jobs: Dict[str, Dict] = {}

class RotaInput(BaseModel):
    lat_lon: str
    raio_metros: float
    fcm_token: str = None
    user_id: str = None

def processar_rota(uid: str, data: RotaInput):
    pasta_saida = f"static/rota_{uid}"
    os.makedirs(pasta_saida, exist_ok=True)

    try:
        lat, lon = map(float, data.lat_lon.split(','))
        resultado = gerar_rota_cpp((lat, lon), data.raio_metros, pasta_saida)

        # Atualiza job
        jobs[uid].update({
            "status": "completo",
            "resultado": {
                "csv_url": f"/{resultado['csv']}",
                "image_url": f"/{resultado['image']}",
                "kmz_url": f"/{resultado['kmz']}",
                "google_maps_urls": resultado["links"]
            }
        })

        # Envia notificação push
        if data.fcm_token:
            messaging.send(messaging.Message(
                token=data.fcm_token,
                notification=messaging.Notification(
                    title="Rota finalizada!",
                    body=f"Seu trajeto solicitado já está pronto.",
                ),
                data={"job_id": uid}
            ))

    except Exception as e:
        jobs[uid].update({"status": "erro", "erro": str(e)})

@app.post("/rota")
async def rota(data: RotaInput, background_tasks: BackgroundTasks):
    uid = str(uuid.uuid4())

    # Salva job inicial
    jobs[uid] = {
        "status": "em_andamento",
        "fcm_token": data.fcm_token,
        "user_id": data.user_id
    }

    background_tasks.add_task(processar_rota, uid, data)
    return {"job_id": uid}

@app.get("/rota/{job_id}")
async def get_status(job_id: str):
    if job_id not in jobs:
        return JSONResponse(status_code=404, content={"error": "Job não encontrado"})

    job = jobs[job_id]
    if job["status"] == "completo":
        return {**{"status": "completo"}, **job["resultado"]}
    elif job["status"] == "erro":
        return {"status": "erro", "erro": job["erro"]}
    else:
        return {"status": job["status"]}

@app.get("/static/{file_path:path}")
async def serve_static(file_path: str):
    return FileResponse(path=f"static/{file_path}")
