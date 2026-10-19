# Interface browser checks

This is a buildless HTML/CSS/JavaScript portfolio. There is no package installation,
build, lint, or TypeScript command. The browser checks use Node's built-in WebSocket
client and Chrome's DevTools protocol; no automation package is needed.

1. From the project directory, start the static server:

   ```powershell
   python -m http.server 4173 --bind 127.0.0.1
   ```

2. In another PowerShell session, start a dedicated headless Chrome instance:

   ```powershell
   $previewProfile = Join-Path $env:TEMP 'alexis-interface-tests'
   Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -WindowStyle Hidden -ArgumentList @('--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9222', ('--user-data-dir="' + $previewProfile + '"'), 'about:blank')
   ```

   Use a separate test profile, not your normal browser profile. Adjust the Chrome
   executable path for your installation.

3. With Node 22 or newer, run:

   ```powershell
   node --check script.js
   node --check interface.js
   node tests/interface.browser.mjs
   git diff --check
   ```

The test opens and closes its own tab. Stop the server and the dedicated Chrome
instance when finished. `PORTFOLIO_URL` and `CHROME_DEBUG_URL` can override the
default HTTP addresses. Screenshots are saved in the operating system's temporary
directory as `alexis-interface-*.png`.

Coverage includes single-instance apps, stacking, pointer and keyboard movement,
viewport bounds, minimize/restore state, maximize/restore geometry, focus return,
project selection, clipboard success/failure, eight viewport widths in both
themes, mobile app switching and scrolling, reduced motion, load failure/retry,
repeated close/reopen, JavaScript-disabled navigation, and the original game.
Tests use the existing real assets and links; external demo uptime is not tested.

## Content and window lifecycle

`about.html` is the source for biography, skills, projects, and contact information.
`interface.js` fetches it once on demand and copies known content nodes into the
applications. The readable page remains available if JavaScript or the request
fails. Keep its `.about-bio`, `.info-cards`, `.skills-grid`, `.project-card`,
`.contact-grid`, and `.contact-links` selectors when editing content.

Each window has one state record and its own `AbortController`. Minimizing keeps
its DOM and state; closing aborts its listeners and removes it. The workspace
observer clamps windows after resizing. On phones, only the active window is
visible and interactive; the launcher and reading-view link stay available.
