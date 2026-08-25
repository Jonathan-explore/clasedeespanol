# clasedeespanol — notas para trabajar aquí

Web de español de la ungdomsskole (8.–9. årgang). **Está en producción**: la usan
alumnos reales, así que lo que se sube a `main` se publica.

## Lo primero de todo

```bash
git pull
```

Esta carpeta **es** la copia de trabajo del repo
`https://github.com/Jonathan-explore/clasedeespanol`. Antes de tocar nada, `git pull`.

**No trabajes desde `C:\Users\Usuario\Desktop\pagina web undgom`.** Esa carpeta es
una línea antigua y distinta del proyecto (agosto 2026): no es un clon, va muy por
detrás, y trabajar allí ya provocó una vez que un cambio estuviera a punto de borrar
del repo la despedida, Pasapalabra, Pinturillo y Similar Words. Si el usuario te
señala esa carpeta, avísale antes de copiar nada.

## Cómo está montada la web

- `index.html` — portada + SPA. Las tarjetas con `data-view` abren vistas que pinta
  `script.js`; las tarjetas con `data-href` saltan a una página propia.
- `script.js` (110 KB) — el motor de la SPA: admin, tablón, Supabase, ordbog.
  Arranca en `DOMContentLoaded` y **da error fuera de `index.html`**, porque espera
  el DOM de la SPA (`#back-btn`, las secciones `view-*`). No lo cargues en páginas
  sueltas.
- `mini.js` — la versión ligera (fondo, partículas, ordbog rápida) para las páginas
  sueltas. Es lo que cargan las páginas de tema.
- `tema1.html`, `tema2.html` + `tema.js` / `tema.css` — un tema por semana. Cada
  página define `window.TEMA = {...}` con su contenido y `tema.js` lo pinta. `tema.js`
  es autónomo, no depende de `script.js`.
- `pasarela.html` — juego de vestir, autocontenido en un solo archivo (SVG a mano).
- `game.js` / `game.css` — LinguaStrike, dentro de la SPA (`view-spil`).

Actividades que ya no salen en el menú (Tablón, Kultur, Prøve, Pasapalabra,
Pinturillo, Despedida, Fremskridt, Lignende Ord, Stile, Yderligere, Temario):
**sus archivos y sus vistas siguen aquí a propósito**. Se quitaron de la portada en
agosto de 2026 para simplificarla, no se borraron. Volver a enseñar una es añadir
otra vez su tarjeta en `index.html`.

## El tema de cada semana

1. Copia `_plantilla-tema.html` a `tema3.html` y rellena `window.TEMA`.
2. En `index.html`, copia la tarjeta del Tema 2 y cambia `data-href`, número, título
   y descripción.

La regla CSS de la portada ya reparte bien cualquier número de tarjetas: la última
ocupa toda la fila solo si se queda sola.

## Cuidado con esto

- El repo es **público**. `scratch/pass.txt`, `scratch/downloads_analysis.csv` y
  `AGENTS.md` contienen datos personales y siguen visibles en GitHub — limpiarlos del
  historial está pendiente. No añadas nada de `scratch/` a un commit.
- Nada de librerías de terceros sin permiso expreso (ver `AGENTS.md`).
- Antes de un cambio grande en producción, enséñaselo al usuario en local
  (`python -m http.server`) antes de subirlo.
