"""Robot de datos de Cine Time: cartelera de Montería de Cinemark y Royal Films.

Genera data/cartelera-monteria.json con el formato de PLAN_FINAL.md (sección 4).
Solo usa la librería estándar, así GitHub Actions no instala nada.

    python robot/cartelera.py                 # escribe data/cartelera-monteria.json
    python robot/cartelera.py --salida x.json # otra ruta

Fuentes (no requieren inicio de sesión):
  Cinemark: página de ciudad https://www.cinemark.com.co/ciudad/monteria (JSON embebido en __NEXT_DATA__).
  Royal:    https://cinemasroyalfilms.com/api (billboard y movies/functions).

Si una cadena falla, se conservan sus funciones del archivo anterior (las que no hayan pasado)
y la fuente queda marcada con ok=false. El proceso termina con código 1 si alguna fuente falló.
"""

import argparse
import json
import re
import sys
import time
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
BOGOTA = timezone(timedelta(hours=-5))  # Colombia no tiene horario de verano: siempre UTC-5
# Nos identificamos con honestidad en vez de fingir ser un navegador
UA = "CineTimeBot/0.1 (proyecto academico CUN Monteria; una consulta al dia)"
DIAS_ADELANTE = 14  # la app solo necesita las funciones de las próximas dos semanas

CINEMARK_URL = "https://www.cinemark.com.co/ciudad/monteria"
CINEMARK_CINEMA_ID = "2409"  # Buenavista Montería
ROYAL_API = "https://cinemasroyalfilms.com/api"
ROYAL_CIUDAD_ID = 1009  # Montería
ROYAL_MULTICINE_ID = 2029  # Nuestro Montería

CINES = [
    {"id": "cm-buenavista", "cadena": "Cinemark", "nombre": "Buenavista", "recargo_web": 0},
    {"id": "rf-nuestro-monteria", "cadena": "Royal Films", "nombre": "Nuestro Montería", "recargo_web": 0},
]
IDIOMAS = {"DOB": "doblada", "SUB": "subtitulada", "ORI": "original"}


class FuenteError(Exception):
    pass


def descargar(url, intentos=3):
    # Reintenta con espera creciente (2 s, 4 s, 6 s): una caída corta de la web no debe tumbar el robot
    ultimo = None
    for i in range(intentos):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json, text/html"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8")
        except Exception as e:  # red, HTTP, decodificación
            ultimo = e
            time.sleep(2 * (i + 1))
    raise FuenteError(f"no se pudo leer {url}: {ultimo}")


def hoy():
    return datetime.now(BOGOTA).date()


# ---------------------------------------------------------------- precios
# Ninguna de las dos webs muestra el precio sin iniciar sesión, así que se calcula con
# las tarifas de tarifas.json. Lo que no tiene tarifa conocida queda en None ("sin_dato").

def es_festivo(fecha, tarifas):
    return fecha.isoformat() in tarifas["festivos"]


def aplicar_descuento(base, fecha, t, tarifas):
    # lunes=0 ... domingo=6; martes y miércoles son 1 y 2. El descuento no aplica en festivos.
    if fecha.weekday() in (1, 2) and not es_festivo(fecha, tarifas):
        base = base * t["descuento_martes_miercoles"]
    return int(round(base))


def precio_cinemark(fecha, formato, tarifas):
    if formato != "2D":  # DBOX, XD, 3D: no hay tarifa en el modelo, no se inventa
        return None, "sin_dato"
    t = tarifas["cadenas"]["cinemark"]
    finde = fecha.weekday() >= 5 or es_festivo(fecha, tarifas)
    base = t["fin_de_semana_o_festivo"] if finde else t["entre_semana"]
    return aplicar_descuento(base, fecha, t, tarifas), "calculado"


def precio_royal(fecha, formato, servicio, tarifas):
    if formato != "2D" or servicio != "Standard":  # solo salas estándar 2D
        return None, "sin_dato"
    t = tarifas["cadenas"]["royal"]
    return aplicar_descuento(t["todos_los_dias"], fecha, t, tarifas), "calculado"


# ---------------------------------------------------------------- Cinemark

def leer_cinemark(tarifas):
    html = descargar(CINEMARK_URL)
    # Next.js deja los datos de la página dentro del HTML en este bloque JSON
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:  # si Cinemark rediseña la web, esto falla fuerte en vez de devolver datos vacíos
        raise FuenteError("Cinemark: no aparece __NEXT_DATA__ (la página cambió)")
    props = json.loads(m.group(1))["props"]["pageProps"]
    limite = hoy() + timedelta(days=DIAS_ADELANTE)
    peliculas, funciones = {}, []
    vistas = set()
    # "PremieresBillboard" son las que están en cartelera y "Presales" las de preventa
    for clave in ("PremieresBillboard", "Presales"):
        for peli in props.get(clave) or []:
            if peli.get("CinemaId") != CINEMARK_CINEMA_ID:
                continue
            # TitleAlt trae el título limpio; el campo Title viene con sufijo tipo "(DOB 2D)"
            titulo = (peli.get("TitleAlt") or re.sub(r"\(.*\)$", "", peli["Title"])).strip()
            idioma = next((IDIOMAS[c] for c in re.findall(r"\b(DOB|SUB|ORI)\b", peli["Title"]) if c in IDIOMAS), None)
            pid = "cm-" + peli["ScheduledFilmId"]  # prefijo por cadena: los ids no chocan con los de Royal
            for s in peli.get("Sessions") or []:
                if s["ID"] in vistas:  # evita duplicar una función que salga en las dos listas
                    continue
                vistas.add(s["ID"])
                dt = datetime.fromisoformat(s["Showtime"])
                # solo las próximas dos semanas y las que se pueden comprar
                if not (hoy() <= dt.date() <= limite) or not s.get("AllowTicketSales", True):
                    continue
                attrs = s.get("SessionAttributesNames") or []
                formato = " ".join(a for a in attrs if a != "2D") or "2D"
                precio, origen = precio_cinemark(dt.date(), formato, tarifas)
                peliculas[pid] = {
                    "id": pid,
                    "titulo": titulo,
                    "duracion_min": int(peli["RunTime"]) if str(peli.get("RunTime", "")).isdigit() else None,
                    "clasificacion": peli.get("Rating") or None,
                }
                funciones.append({
                    "cine": "cm-buenavista", "pelicula": pid,
                    "fecha": dt.date().isoformat(), "hora": dt.strftime("%H:%M"),
                    "formato": formato, "idioma": idioma, "sala": s.get("ScreenName"),
                    "precio": precio, "precio_origen": origen,
                })
    return list(peliculas.values()), funciones


# ---------------------------------------------------------------- Royal

def leer_royal(tarifas):
    # Paso 1: la cartelera de la ciudad (lista de películas)
    cartelera = json.loads(descargar(f"{ROYAL_API}/billboard/city/{ROYAL_CIUDAD_ID}"))
    if not cartelera.get("status"):
        raise FuenteError("Royal: la cartelera respondió status false")
    limite = hoy() + timedelta(days=DIAS_ADELANTE)
    peliculas, funciones = {}, []
    for item in cartelera["data"]:
        p = item["pelicula"]
        pid = f"rf-{p['pelicula_id']}"
        # Paso 2: las funciones de cada película (una consulta por película, con pausa para no saturar)
        resp = json.loads(descargar(f"{ROYAL_API}/movies/functions/{p['pelicula_id']}/city/{ROYAL_CIUDAD_ID}"))
        time.sleep(0.5)
        for f in resp.get("data") or []:
            if f["funcion_multicine_id"] != ROYAL_MULTICINE_ID:
                continue
            fecha = date.fromisoformat(f["funcion_fecha"])
            if not (hoy() <= fecha <= limite):
                continue
            # La hora viene como "1970-01-01T16:20:00.000Z": la fecha es de relleno y la hora
            # ya es la local (se comprobó contra la web de Royal), por eso se corta sin convertir zona
            hora = f["funcion_hora_inicio"][11:16]
            formato = f["formato"]["formato_nombre"]
            servicio = f["sala"]["servicio"]["servicio_nombre"]
            precio, origen = precio_royal(fecha, formato, servicio, tarifas)
            peliculas[pid] = {
                "id": pid,
                "titulo": (p.get("pelicula_titulo") or p["pelicula_nombre_formato"]).strip(),
                "duracion_min": p.get("duracion") or None,
                "clasificacion": (p.get("clasificacion") or {}).get("clasificacion_nombre"),
            }
            funciones.append({
                "cine": "rf-nuestro-monteria", "pelicula": pid,
                "fecha": fecha.isoformat(), "hora": hora,
                "formato": formato if servicio == "Standard" else f"{formato} {servicio}",
                "idioma": IDIOMAS.get((f.get("version") or {}).get("version_nombre")),
                "sala": f["sala"]["sala_nombre"],
                "precio": precio, "precio_origen": origen,
            })
    return list(peliculas.values()), funciones


# ---------------------------------------------------------------- validación y armado

def validar_cadena(nombre, peliculas, funciones):
    # Cero funciones casi siempre significa que la web cambió, no que no haya cartelera:
    # se trata como fallo para no borrar datos buenos con un archivo vacío
    if not funciones:
        raise FuenteError(f"{nombre}: 0 funciones (se trata como fallo para no borrar datos buenos)")
    ids = {p["id"] for p in peliculas}
    for f in funciones:
        if f["pelicula"] not in ids:
            raise FuenteError(f"{nombre}: función con película desconocida {f['pelicula']}")
        if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", f["hora"]):
            raise FuenteError(f"{nombre}: hora inválida {f['hora']!r}")


def cargar_previo(ruta):
    try:
        return json.loads(ruta.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def conservar_previo(previo, prefijo):
    """Funciones y películas de una cadena que no se pudo actualizar, sin las que ya pasaron."""
    if not previo:
        return [], []
    funciones = [f for f in previo.get("funciones", [])
                 if f["cine"].startswith(prefijo) and f["fecha"] >= hoy().isoformat()]
    usadas = {f["pelicula"] for f in funciones}
    peliculas = [p for p in previo.get("peliculas", []) if p["id"] in usadas]
    return peliculas, funciones


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--salida", type=Path, default=RAIZ / "data" / "cartelera-monteria.json")
    ap.add_argument("--tarifas", type=Path, default=AQUI / "tarifas.json")
    args = ap.parse_args()

    tarifas = json.loads(args.tarifas.read_text(encoding="utf-8"))
    previo = cargar_previo(args.salida)  # el archivo de ayer, por si hay que conservar algo
    ahora = datetime.now(BOGOTA).replace(microsecond=0)

    fuentes, peliculas, funciones = {}, [], []
    # Cada cadena va en su propio try: si una falla, la otra se actualiza igual
    for nombre, prefijo, leer in (("cinemark", "cm-", leer_cinemark), ("royal", "rf-", leer_royal)):
        try:
            p, f = leer(tarifas)
            validar_cadena(nombre, p, f)
            fuentes[nombre] = {"ok": True, "actualizado": ahora.isoformat(), "funciones": len(f)}
        except Exception as e:
            p, f = conservar_previo(previo, prefijo)  # se quedan los datos de ayer de esa cadena
            antes = ((previo or {}).get("fuentes", {}).get(nombre, {}) or {})
            ult = antes.get("actualizado") or antes.get("ultima_actualizacion_ok")
            fuentes[nombre] = {"ok": False, "error": str(e)[:300], "ultima_actualizacion_ok": ult, "funciones": len(f)}
            print(f"[{nombre}] FALLO: {e}", file=sys.stderr)
        peliculas += p
        funciones += f
    fuentes["cine_colombia"] = {"ok": False, "error": "no implementada: su API exige un token que aún no se obtiene", "funciones": 0}

    funciones.sort(key=lambda f: (f["fecha"], f["hora"], f["cine"]))
    salida = {
        "ciudad": "Monteria",
        "actualizado": ahora.isoformat(),
        "fuentes": fuentes,  # la app puede mostrar de dónde viene cada dato y si alguno está desactualizado
        "cines": CINES,
        "peliculas": sorted(peliculas, key=lambda p: p["titulo"].lower()),
        "funciones": funciones,
        "combos": (previo or {}).get("combos", []),  # los combos se llenan a mano: el robot no los borra
    }
    args.salida.parent.mkdir(parents=True, exist_ok=True)
    args.salida.write_text(json.dumps(salida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for n, s in fuentes.items():
        print(f"{n}: {'ok' if s['ok'] else 'FALLO'} ({s['funciones']} funciones)")
    print(f"escrito {args.salida}")
    # Código 1 si falló Cinemark o Royal: en GitHub Actions el flujo se pone en rojo y avisa
    sys.exit(0 if all(fuentes[n]["ok"] for n in ("cinemark", "royal")) else 1)


if __name__ == "__main__":
    main()
