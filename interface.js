/* ALEXIS / INTERFACE — dependency-free portfolio window manager.
   about.html remains the canonical, readable source of portfolio content. */
'use strict';

(() => {
  const layer = document.getElementById('windowLayer');
  if (!layer) return;

  const applications = {
    about: { number: '001', name: 'About', width: 760, height: 600, anchor: 'profile' },
    projects: { number: '002', name: 'Projects', width: 1000, height: 650, anchor: 'projects' },
    skills: { number: '003', name: 'Skills', width: 590, height: 610, anchor: 'toolkit' },
    contact: { number: '004', name: 'Contact', width: 580, height: 510, anchor: 'contact' }
  };
  const mobile = window.matchMedia('(max-width: 700px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const home = document.getElementById('interfaceHome');
  const status = document.getElementById('interfaceStatus');
  const lifetime = new AbortController();
  let sourcePromise;

  function announce(message) { status.textContent = message; }

  function loadSource() {
    if (!sourcePromise) {
      sourcePromise = fetch('about.html?v=20261020', { signal: lifetime.signal })
        .then(response => {
          if (!response.ok) throw new Error('Portfolio content is unavailable.');
          return response.text();
        })
        .then(html => {
          const source = new DOMParser().parseFromString(html, 'text/html');
          if (!source.querySelector('.about-bio') || source.querySelectorAll('.project-card').length !== 4) {
            throw new Error('Portfolio content could not be read.');
          }
          return source;
        })
        .catch(error => { sourcePromise = null; throw error; });
    }
    return sourcePromise;
  }

  // Only clone known nodes from our own static page; no scripts are executed.
  function copy(source, selector) {
    const original = source.querySelector(selector);
    if (!original) throw new Error('Missing portfolio section.');
    const node = original.cloneNode(true);
    [node, ...node.querySelectorAll('[id], .fade-in')].forEach(item => {
      item.removeAttribute('id');
      item.classList.remove('fade-in', 'visible');
    });
    return node;
  }

  class WindowManager {
    constructor() {
      this.windows = new Map();
      this.active = null;
      this.order = 0;
      this.placement = 0;
      this.drag = null;
      const options = { signal: lifetime.signal };
      document.addEventListener('click', event => {
        const launcher = event.target.closest('[data-open-app]');
        // Preserve native open-in-new-tab and fallback navigation.
        if (!launcher || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        this.open(launcher.dataset.openApp, launcher, launcher.dataset.project);
      }, options);
      layer.addEventListener('pointerdown', event => this.startDrag(event), options);
      layer.addEventListener('pointermove', event => this.moveDrag(event), options);
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => {
        layer.addEventListener(type, () => this.endDrag(), options);
      });
      layer.addEventListener('focusin', event => {
        const element = event.target.closest('.app-window');
        if (element) this.focus(this.windows.get(element.dataset.app), false);
      }, options);
      layer.addEventListener('click', event => {
        const control = event.target.closest('[data-window-action]');
        if (!control) return;
        const win = this.windows.get(control.closest('.app-window').dataset.app);
        if (control.dataset.windowAction === 'close') this.close(win);
        if (control.dataset.windowAction === 'minimize') this.minimize(win);
        if (control.dataset.windowAction === 'maximize') this.maximize(win);
      }, options);
      layer.addEventListener('keydown', event => this.keydown(event), options);
      document.getElementById('showHome').hidden = false;
      document.getElementById('showHome').addEventListener('click', () => {
        this.endDrag();
        this.windows.forEach(win => { win.minimized = true; });
        this.active = null;
        this.sync();
        document.querySelector('.app-tile').focus({ preventScroll: true });
        announce('Home. Your open applications are saved in the launcher.');
      }, options);
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(layer);
      mobile.addEventListener('change', () => this.resize(), options);
      document.body.classList.add('interface-ready');
    }

    bounds() { return { width: layer.clientWidth, height: layer.clientHeight }; }

    clamp(rect) {
      const area = this.bounds();
      const width = Math.min(rect.width, area.width);
      const height = Math.min(rect.height, area.height);
      return { width, height, x: Math.max(0, Math.min(rect.x, area.width - width)), y: Math.max(0, Math.min(rect.y, area.height - height)) };
    }

    layout(win) {
      const area = this.bounds();
      const rect = mobile.matches || win.maximized ? { x: 0, y: 0, width: area.width, height: area.height } : this.clamp(win.rect);
      Object.assign(win.element.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      win.element.classList.toggle('is-maximized', win.maximized);
      const maximize = win.element.querySelector('[data-window-action="maximize"]');
      maximize.setAttribute('aria-label', `${win.maximized ? 'Restore' : 'Maximize'} ${applications[win.id].name} window`);
      maximize.title = win.maximized ? 'Restore size' : 'Maximize';
      maximize.setAttribute('aria-pressed', String(win.maximized));
      maximize.querySelector('span').textContent = win.maximized ? '❐' : '□';
    }

    sync() {
      this.windows.forEach(win => {
        const hidden = win.minimized || (mobile.matches && win.id !== this.active);
        win.element.hidden = hidden;
        win.element.inert = hidden || win.closing;
        win.element.classList.toggle('is-active', win.id === this.active && !hidden);
      });
      home.inert = mobile.matches && this.active !== null;
      home.setAttribute('aria-hidden', String(home.inert));
      document.querySelectorAll('[data-open-app]').forEach(launcher => {
        const win = this.windows.get(launcher.dataset.openApp);
        launcher.classList.toggle('is-open', Boolean(win));
        launcher.classList.toggle('is-current', Boolean(win && this.active === win.id && !win.minimized));
        if (launcher.classList.contains('dock-app')) {
          const name = applications[launcher.dataset.openApp].name;
          const action = win ? (win.minimized || win.element.hidden ? 'Restore' : 'Focus') : 'Open';
          launcher.setAttribute('aria-label', `${action} ${name}${win ? ' (open)' : ''}`);
          if (win && this.active === win.id) launcher.setAttribute('aria-current', 'true');
          else launcher.removeAttribute('aria-current');
        }
      });
      document.getElementById('windowCount').textContent = this.windows.size ? `${String(this.windows.size).padStart(2, '0')} OPEN / ${this.active ? applications[this.active].name.toUpperCase() : 'HOME'}` : 'YOUR SPACE TO EXPLORE';
    }

    focus(win, moveFocus = true) {
      if (!win || win.closing) return;
      win.minimized = false;
      if (this.active !== win.id) {
        win.order = ++this.order;
        win.element.style.zIndex = win.order;
      }
      this.active = win.id;
      this.sync();
      if (moveFocus) win.element.querySelector('.window-title').focus({ preventScroll: true });
    }

    open(id, opener, project) {
      if (!applications[id]) return;
      const existing = this.windows.get(id);
      if (existing) {
        // A launch during a closing transition cancels the pending close.
        if (existing.closing) {
          clearTimeout(existing.closeTimer);
          existing.closing = false;
          existing.element.classList.remove('is-closing');
        }
        existing.opener = opener;
        if (project !== undefined) {
          existing.selectedProject = Number(project);
          existing.selectProject?.(Number(project));
        }
        this.focus(existing);
        announce(`${applications[id].name} focused.`);
        return;
      }
      const config = applications[id];
      const area = this.bounds();
      const step = this.placement++ % 4;
      const width = Math.min(config.width, area.width);
      const height = Math.min(config.height, area.height);
      const rect = this.clamp({ width, height, x: (area.width - width) / 2 - 48 + step * 36, y: Math.min(25 + step * 28, (area.height - height) / 2) });
      const element = document.createElement('section');
      element.className = `app-window app-window--${id}`;
      element.dataset.app = id;
      element.setAttribute('role', 'dialog');
      element.setAttribute('aria-labelledby', `window-${id}-title`);
      element.innerHTML = `
        <header class="window-header">
          <span class="window-signal" aria-hidden="true"></span>
          <h2 class="window-title" id="window-${id}-title" tabindex="-1"><span>${config.number} /</span> ${config.name}</h2>
          <button class="window-move" type="button" aria-label="Move ${config.name} window with arrow keys" aria-describedby="window-${id}-hint" title="Drag title bar or use arrow keys here">⠿</button>
          <span class="sr-only" id="window-${id}-hint">Use arrow keys to move. Hold Shift for larger steps. Windows stay inside the workspace.</span>
          <div class="window-controls">
            <button type="button" data-window-action="minimize" aria-label="Minimize ${config.name} window" title="Minimize"><span aria-hidden="true">−</span></button>
            <button type="button" data-window-action="maximize" aria-label="Maximize ${config.name} window" title="Maximize" aria-pressed="false"><span aria-hidden="true">□</span></button>
            <button type="button" data-window-action="close" aria-label="Close ${config.name} window" title="Close (Escape)"><span aria-hidden="true">×</span></button>
          </div>
        </header>
        <div class="window-content" tabindex="0" aria-label="${config.name} content" aria-busy="true"><p class="window-loading">Opening ${config.name.toLowerCase()}…</p></div>
        <footer class="window-footer"><span>ALEXIS / ${config.name.toUpperCase()}</span><a href="about.html#${config.anchor}">Read as a page ↗</a></footer>`;
      const win = { id, element, opener, rect, order: 0, minimized: false, maximized: false, closing: false, selectedProject: Number(project || 0), abort: new AbortController() };
      this.windows.set(id, win);
      layer.append(element);
      this.layout(win);
      this.focus(win);
      announce(`${config.name} opened. Escape closes the window.`);
      this.populate(win);
    }

    async populate(win) {
      const content = win.element.querySelector('.window-content');
      try {
        const source = await loadSource();
        if (win.abort.signal.aborted) return;
        content.replaceChildren();
        if (win.id === 'about') {
          content.append(copy(source, '.about-bio'), copy(source, '.info-cards'));
          const projects = content.querySelector('a[href="#projects"]');
          projects.href = 'about.html#projects';
          projects.dataset.openApp = 'projects';
        } else if (win.id === 'skills') {
          content.innerHTML = '<p class="micro-label">TECHNICAL INDEX / 07 TECHNOLOGIES</p><h3 class="app-content-title">The tools behind<br>the work.</h3>';
          content.append(copy(source, '.skills-grid'));
        } else if (win.id === 'projects') {
          this.populateProjects(win, source, content);
        } else if (win.id === 'contact') {
          content.append(copy(source, '.contact-grid'), copy(source, '.contact-links'));
          const github = source.querySelector('.contact-links a[href*="github.com"]');
          const row = document.createElement('div');
          row.className = 'copy-profile';
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'copy-button';
          button.textContent = 'Copy GitHub profile link';
          const feedback = document.createElement('p');
          feedback.className = 'copy-feedback';
          feedback.setAttribute('role', 'status');
          row.append(button, feedback);
          content.append(row);
          button.addEventListener('click', async () => {
            try {
              if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
              await navigator.clipboard.writeText(github.href);
              if (win.abort.signal.aborted) return;
              feedback.textContent = 'Copied. Ready to paste.';
            } catch {
              if (win.abort.signal.aborted) return;
              feedback.replaceChildren();
              const label = document.createElement('label');
              label.textContent = 'Copy manually: ';
              const input = document.createElement('input');
              input.readOnly = true;
              input.value = github.href;
              label.append(input);
              feedback.append(label);
              input.focus();
              input.select();
            }
          }, { signal: win.abort.signal });
        }
      } catch {
        if (win.abort.signal.aborted) return;
        content.innerHTML = `<div class="window-error"><h3>Let's take the direct route.</h3><p>This window couldn't load its content. The complete portfolio is also available as a regular page.</p><a class="btn btn--primary" href="about.html#${applications[win.id].anchor}">Read ${applications[win.id].name.toLowerCase()} ↗</a><button class="retry-button" type="button">Try again</button></div>`;
        content.querySelector('.retry-button').addEventListener('click', () => {
          content.setAttribute('aria-busy', 'true');
          this.populate(win);
        }, { once: true, signal: win.abort.signal });
      } finally {
        if (!win.abort.signal.aborted) content.setAttribute('aria-busy', 'false');
      }
    }

    populateProjects(win, source, content) {
      const projects = Array.from(source.querySelectorAll('.project-card'));
      const labels = ['Veritas Core', 'DormiHub', 'POS System', 'Portfolio'];
      content.innerHTML = '<div class="project-explorer"><div class="project-index"><p class="micro-label">SELECTED WORK / 04</p><div class="project-tabs" role="tablist" aria-label="Select a project" aria-orientation="vertical"></div><p class="project-index-note">Built to put learning<br>into practice.</p></div><div class="project-detail" id="project-detail" role="tabpanel" tabindex="0"></div></div>';
      const tabs = content.querySelector('.project-tabs');
      const panel = content.querySelector('.project-detail');
      projects.forEach((project, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'project-tab';
        button.id = `project-tab-${index}`;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', 'project-detail');
        button.innerHTML = `<span class="project-tab__number">0${index + 1}</span><span>${labels[index]}</span><span class="project-tab__arrow" aria-hidden="true">↗</span>`;
        button.addEventListener('click', () => win.selectProject(index), { signal: win.abort.signal });
        tabs.append(button);
      });
      tabs.addEventListener('keydown', event => {
        const buttons = Array.from(tabs.children);
        let index = buttons.indexOf(event.target);
        if (index < 0) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') index = (index + 1) % buttons.length;
        else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') index = (index + buttons.length - 1) % buttons.length;
        else if (event.key === 'Home') index = 0;
        else if (event.key === 'End') index = buttons.length - 1;
        else return;
        event.preventDefault();
        win.selectProject(index);
        buttons[index].focus();
      }, { signal: win.abort.signal });
      win.selectProject = index => {
        if (!projects[index]) return;
        win.selectedProject = index;
        Array.from(tabs.children).forEach((button, i) => {
          button.setAttribute('aria-selected', String(i === index));
          button.tabIndex = i === index ? 0 : -1;
        });
        panel.setAttribute('aria-labelledby', `project-tab-${index}`);
        const card = projects[index].cloneNode(true);
        card.removeAttribute('id');
        card.className = 'explorer-project';
        card.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
        panel.replaceChildren(card);
        panel.scrollTop = 0;
        if (!reducedMotion.matches) card.animate([{ opacity: .5, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 160 });
      };
      win.selectProject(win.selectedProject);
    }

    nextFocus(opener) {
      const next = Array.from(this.windows.values()).filter(win => !win.minimized && !win.closing).sort((a, b) => b.order - a.order)[0];
      this.active = null;
      if (next) this.focus(next);
      else {
        this.sync();
        const fallback = opener?.isConnected && !opener.closest('[inert], [hidden]') ? opener : document.querySelector('.dock-app');
        fallback.focus({ preventScroll: true });
      }
    }

    minimize(win) {
      if (!win) return;
      this.endDrag();
      win.minimized = true;
      this.nextFocus(document.querySelector(`.dock-app[data-open-app="${win.id}"]`));
      announce(`${applications[win.id].name} minimized. Restore it from the launcher.`);
    }

    maximize(win) {
      if (!win || mobile.matches) return;
      this.endDrag();
      win.maximized = !win.maximized;
      this.layout(win);
      this.focus(win, false);
      announce(`${applications[win.id].name} ${win.maximized ? 'maximized' : 'restored'}.`);
    }

    close(win) {
      if (!win || win.closing) return;
      this.endDrag();
      win.closing = true;
      win.element.inert = true;
      win.element.classList.add('is-closing');
      this.nextFocus(win.opener);
      const finish = () => {
        win.abort.abort();
        win.element.remove();
        this.windows.delete(win.id);
        this.sync();
        announce(`${applications[win.id].name} closed.`);
      };
      if (reducedMotion.matches) finish();
      else win.closeTimer = setTimeout(finish, 120);
    }

    startDrag(event) {
      const element = event.target.closest('.app-window');
      if (!element) return;
      const win = this.windows.get(element.dataset.app);
      this.focus(win, false);
      if (mobile.matches || win.maximized || !event.isPrimary || event.button !== 0) return;
      const header = event.target.closest('.window-header');
      if (!header || event.target.closest('.window-controls')) return;
      event.preventDefault();
      const rect = this.clamp(win.rect);
      win.rect = rect;
      this.drag = { win, header, pointer: event.pointerId, startX: event.clientX, startY: event.clientY, x: rect.x, y: rect.y };
      header.setPointerCapture(event.pointerId);
      element.classList.add('is-dragging');
      element.querySelector('.window-move').focus({ preventScroll: true });
    }

    moveDrag(event) {
      if (!this.drag || this.drag.pointer !== event.pointerId) return;
      const { win, x, y, startX, startY } = this.drag;
      win.rect = this.clamp({ ...win.rect, x: x + event.clientX - startX, y: y + event.clientY - startY });
      this.layout(win);
    }

    endDrag() {
      if (!this.drag) return;
      const { header, pointer, win } = this.drag;
      this.drag = null;
      if (header.hasPointerCapture(pointer)) header.releasePointerCapture(pointer);
      win.element.classList.remove('is-dragging');
    }

    keydown(event) {
      const element = event.target.closest('.app-window');
      if (!element) return;
      const win = this.windows.get(element.dataset.app);
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close(win);
        return;
      }
      if (!event.target.closest('.window-move') || mobile.matches || win.maximized) return;
      const step = event.shiftKey ? 40 : 10;
      const directions = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (directions[event.key]) {
        event.preventDefault();
        const rect = this.clamp(win.rect);
        win.rect = this.clamp({ ...rect, x: rect.x + directions[event.key][0], y: rect.y + directions[event.key][1] });
        this.layout(win);
      }
    }

    resize() {
      this.endDrag();
      this.windows.forEach(win => this.layout(win));
      this.sync();
      // If a responsive change hides the focused window, move focus to the visible one.
      if (document.activeElement.closest('.app-window[hidden]') && this.active) this.focus(this.windows.get(this.active));
    }

    destroy() {
      this.endDrag();
      this.resizeObserver.disconnect();
      this.windows.forEach(win => { clearTimeout(win.closeTimer); win.abort.abort(); });
      lifetime.abort();
    }
  }

  const manager = new WindowManager();
  window.addEventListener('pagehide', event => { if (!event.persisted) manager.destroy(); }, { signal: lifetime.signal });
})();
