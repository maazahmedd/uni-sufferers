# Web Port: Uni Sufferers

This is a browser-playable port of the original Processing Python game.

## Run locally

From the project root:

```bash
cd web
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Notes:
- Use arrow keys to move.
- Press space on the intro screen to start.
- Click after game over to restart.
- Browsers may block autoplay audio until first user interaction.
- If you still see a stale `Loading...` screen, hard refresh (`Cmd+Shift+R` on macOS).

## Deploy

Any static hosting works (GitHub Pages, Netlify, Vercel static site):
- Publish the `web/` directory as the site root.

## Quick sanity check

You should see:
- A title and game canvas (1024x768) with the intro screen.
- Space starts level 1.
- Arrow keys move the player.
