# main.py
from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from cpp_core import gerar_rota_cpp
from pathlib import Path
import uuid
import os
import requests
from typing import Dict

FCM_SERVER_KEY = "BEb8lSDu8z9f_ejV670IU_9gl9m7RpSKMwei-A1J9m4juMgj9gxzujJxM1PycsJxeMXJNph6CVzlKy61Q88YbKs"

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

jobs: Dict[str, Dict] = {}

class RotaInput(BaseModel):
    lat_lon: str
    raio_metros: float
    fcm_token: str = None
    user_id: str = None

def enviar_notificacao_fcm(token: str, job_id: str):
    headers = {
        "Authorization": f"key={FCM_SERVER_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "to": token,
        "notification": {
            "title": "Rota finalizada!",
            "body": "Seu trajeto solicitado já está pronto."
        },
        "data": {
            "job_id": job_id
        }
    }
    response = requests.post("https://fcm.googleapis.com/fcm/send", json=payload, headers=headers)
    print("FCM status:", response.status_code, response.text)

def processar_rota(uid: str, data: RotaInput):
    pasta_saida = f"static/rota_{uid}"
    os.makedirs(pasta_saida, exist_ok=True)

    try:
        lat, lon = map(float, data.lat_lon.split(','))
        resultado = gerar_rota_cpp((lat, lon), data.raio_metros, pasta_saida)

        jobs[uid].update({
            "status": "completo",
            "resultado": {
                "csv_url": f"/{resultado['csv']}",
                "image_url": f"/{resultado['image']}",
                "kmz_url": f"/{resultado['kmz']}",
                "google_maps_urls": resultado["links"]
            }
        })

        if data.fcm_token:
            enviar_notificacao_fcm(data.fcm_token, uid)

    except Exception as e:
        jobs[uid].update({"status": "erro", "erro": str(e)})

@app.post("/rota")
async def rota(data: RotaInput, background_tasks: BackgroundTasks):
    uid = str(uuid.uuid4())
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
