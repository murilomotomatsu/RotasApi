import osmnx as ox
import networkx as nx
import simplekml
import csv
import matplotlib.pyplot as plt
from math import radians, cos, sin, asin, sqrt
import contextily as ctx
import geopandas as gpd
from shapely.geometry import LineString
from geopy.geocoders import Nominatim
import os
import itertools
from time import sleep
from networkx.algorithms.approximation import traveling_salesman_problem

ox.settings.log_console = False

def haversine(lat1, lon1, lat2, lon2):
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    return 6371 * c * 1000

def remove_dead_ends(graph):
    G = graph.copy()
    while True:
        dead_ends = [node for node in G.nodes if G.degree(node) == 1]
        if not dead_ends:
            break
        G.remove_nodes_from(dead_ends)
    return G

def tsp_path(G, weight='weight'):
    if not nx.is_connected(G):
        raise nx.NetworkXError("O grafo deve ser conexo")
    return traveling_salesman_problem(G, weight=weight, cycle=True)

def gerar_rota_cpp(lat_lon, raio_metros, pasta_saida):
    centro = (lat_lon)
    os.makedirs(pasta_saida, exist_ok=True)

    filtro = (
        '["highway"!~"service|track|path|footway"]'
        '["access"!~"private"]'
        '["barrier"!~"wall|fence"]'
    )

    G = ox.graph_from_point(centro, dist=raio_metros, network_type='drive', custom_filter=filtro)
    G = remove_dead_ends(G)

    G_undir = nx.Graph()
    for u, v, data in G.edges(data=True):
        length = data.get("length", haversine(G.nodes[u]['y'], G.nodes[u]['x'], G.nodes[v]['y'], G.nodes[v]['x']))
        G_undir.add_edge(u, v, weight=length)
        for node in (u, v):
            if node not in G_undir.nodes:
                G_undir.add_node(node)
            G_undir.nodes[node]['x'] = G.nodes[node]['x']
            G_undir.nodes[node]['y'] = G.nodes[node]['y']

    rota_nodes = tsp_path(G_undir, weight="weight")
    rota_nodes.append(rota_nodes[0])

    geolocator = Nominatim(user_agent="cpp_api")
    csv_path = os.path.join(pasta_saida, "rota.csv")

    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Nome do Ponto", "Rua", "Bairro", "Cidade", "Latitude", "Longitude"])
        for idx, n in enumerate(rota_nodes):
            latn = G_undir.nodes[n]['y']
            lonn = G_undir.nodes[n]['x']
            try:
                location = geolocator.reverse((latn, lonn), exactly_one=True, language='pt')
                address = location.raw.get('address', {}) if location else {}
                rua = address.get('road', '')
                bairro = address.get('suburb', '') or address.get('neighbourhood', '')
                cidade = address.get('city', '') or address.get('town', '') or address.get('village', '')
            except Exception:
                rua, bairro, cidade = '', '', ''
            writer.writerow([f"Ponto {idx+1}", rua, bairro, cidade, latn, lonn])
            sleep(1)

    coords = [(G_undir.nodes[n]['x'], G_undir.nodes[n]['y']) for n in rota_nodes]
    line = LineString(coords)
    gdf = gpd.GeoDataFrame(geometry=[line], crs="EPSG:4326").to_crs(epsg=3857)
    fig, ax = plt.subplots(figsize=(10, 10))
    gdf.plot(ax=ax, color='blue', linewidth=3)
    ctx.add_basemap(ax, source=ctx.providers.Esri.WorldImagery)
    ax.set_axis_off()
    img_path = os.path.join(pasta_saida, "rota_cpp.png")
    plt.tight_layout()
    plt.savefig(img_path, dpi=300)
    plt.close(fig)

    coords_cpp = coords

    final_coords = [coords_cpp[0]]
    for pt in coords_cpp[1:]:
        if pt != final_coords[-1]:
            final_coords.append(pt)

    pontos_gmaps = [(lat, lon) for lon, lat in final_coords]

    chunk_size = 25
    links = [
        "https://www.google.com/maps/dir/" + "/".join(f"{lat},{lon}" for lat, lon in pontos_gmaps[i:i + chunk_size])
        for i in range(0, len(pontos_gmaps), chunk_size)
    ]

    kml = simplekml.Kml()
    lin = kml.newlinestring(name="Rota CPP")
    lin.coords = final_coords
    lin.style.linestyle.width = 4
    lin.style.linestyle.color = simplekml.Color.blue
    kml_path = os.path.join(pasta_saida, "rota_cpp.kmz")
    kml.savekmz(kml_path)

    return {
        "csv": csv_path,
        "image": img_path,
        "links": links,
        "kmz": kml_path
    }
