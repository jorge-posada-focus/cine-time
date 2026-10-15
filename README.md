# Cine Time

Compara las carteleras de los multicines de Montería para encontrar la función más barata. Es un proyecto de Razonamiento Cuantitativo de la CUN.

Este repositorio es la parte de datos. Un programa en Python baja la cartelera de cada cine todos los días y la deja en `data/cartelera-monteria.json`, que es el archivo que lee la app. Así nadie tiene que escribir películas ni horarios a mano.

## Cómo funciona

El programa está en `robot/cartelera.py` y usa solo la librería estándar de Python. Cada mañana a las 6:00 (hora de Bogotá) lo ejecuta GitHub Actions, y si la cartelera cambió, guarda el archivo nuevo en el repositorio. También se puede lanzar a mano desde la pestaña Actions.

De cada función guarda la película, la duración, la fecha, la hora, el formato, el idioma, la sala y el precio, para los próximos 14 días.

## De dónde salen los datos

- Cinemark Buenavista: la página de la ciudad, que trae las funciones dentro del HTML.
- Royal Films Nuestro Montería: la API que usa su propia web, sin inicio de sesión.
- Cine Colombia Alamedas: todavía no. Su API pide un token que no se consigue sin saltarse las protecciones del sitio, así que queda pendiente.

## Precios

Ninguna de las dos webs muestra el precio sin iniciar sesión. Por eso se calcula con las tarifas de referencia del informe, que están en `robot/tarifas.json`: tarifa por cadena, mitad de precio los martes y miércoles que no sean festivo, y festivos de 2026. Solo se calcula para funciones 2D en sala estándar. Las demás (DBOX, XD, 3D, VIP) quedan con precio `null` y `precio_origen` en `sin_dato`. Cada precio dice si es `calculado` o `sin_dato`.

Si una cadena cambia sus tarifas hay que editar ese archivo a mano. Los festivos de 2027 hay que agregarlos antes de enero.

## Si una fuente falla

El programa no borra nada. Conserva las funciones anteriores de esa cadena (las que todavía no pasaron), lo anota en el campo `fuentes` del JSON con el error y la última vez que funcionó, y termina con código 1 para que el flujo de GitHub Actions quede en rojo. Si una cadena devuelve cero funciones también se toma como fallo, porque casi siempre significa que la web cambió.

## Archivos

- `robot/cartelera.py`: el programa.
- `robot/tarifas.json`: tarifas y festivos.
- `data/cartelera-monteria.json`: la cartelera del día.
- `.github/workflows/actualizar-cartelera.yml`: la ejecución diaria.

## Correrlo en el computador

Hace falta Python 3.10 o más reciente, sin instalar nada más.

```
python robot/cartelera.py
```

En cada ejecución hace pocas consultas (una a Cinemark y una por película a Royal, con pausa entre ellas) y se identifica como CineTimeBot. No usa cuentas ni evita ninguna protección.
