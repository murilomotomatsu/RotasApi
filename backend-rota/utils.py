import csv
from geopy.distance import distance
import matplotlib.pyplot as plt
import math

def gerar_csv_rota(lat, lon, raio_km, csv_path, num_pontos=12):
    pontos = []
    for i in range(num_pontos):
        angulo = (360 / num_pontos) * i
        destino = distance(kilometers=raio_km).destination((lat, lon), bearing=angulo)
        pontos.append((destino.latitude, destino.longitude))

    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["latitude", "longitude"])
        writer.writerows(pontos)

    return pontos

def gerar_imagem_rota(pontos, imagem_path):
    lats = [p[0] for p in pontos]
    lons = [p[1] for p in pontos]

    plt.figure(figsize=(8, 6))
    plt.plot(lons + [lons[0]], lats + [lats[0]], marker='o')
    plt.title("Rota Circular")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.grid(True)
    plt.savefig(imagem_path)
    plt.close()

def gerar_link_google_maps(pontos):
    base = "https://www.google.com/maps/dir/"
    path = "/".join(f"{lat},{lon}" for lat, lon in pontos)
    return base + path