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
themes, mobile app switching and scrolling, reduced motion, template error/retry,
repeated close/reopen, unchanged URLs, every application launcher, Home and skip
controls, embedded email, JavaScript-disabled behavior, and the original game.
Tests use the existing real assets and links; external demo uptime is not tested.

## Content and window lifecycle

The `template-about`, `template-projects`, `template-skills`, and `template-contact`
elements in `index.html` hold the application's content. `interface.js` clones the
requested template without fetching or navigating to another page. Keep their
`.about-bio`, `.info-cards`, `.skills-grid`, `.project-card`, `.contact-grid`, and
`.contact-links` selectors when editing content. Application launchers and Home
are buttons, so modifier clicks have no internal URL to open. Project screenshots
stay inside the project detail view. Error recovery retries inside the window.

Each window has one state record and its own `AbortController`. Minimizing keeps
its DOM and state; closing aborts its listeners and removes it. The workspace
observer clamps windows after resizing. On phones, only the active window is
visible and interactive; the application launcher and Home control stay available.
