/* ============================================================
   PERSONAL PORTFOLIO WEBSITE — Shared JavaScript
   Alexis Genille S. Palicte
   ============================================================ */

'use strict';

/* ============================================================
   1. MOBILE NAVIGATION TOGGLE
   ============================================================ */
(function initNavToggle() {
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (!navToggle || !navLinks) return;

  navToggle.addEventListener('click', function () {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));

    // Swap hamburger icon to X when open
    const icon = navToggle.querySelector('i');
    if (icon) {
      icon.className = isOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
    }
  });

  // Close menu when a nav link is clicked (mobile)
  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      const icon = navToggle.querySelector('i');
      if (icon) icon.className = 'fa-solid fa-bars';
    });
  });

  // Close menu when clicking outside (mobile)
  document.addEventListener('click', function (event) {
    const isClickInsideNav = navLinks.contains(event.target) || navToggle.contains(event.target);
    if (!isClickInsideNav && navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      const icon = navToggle.querySelector('i');
      if (icon) icon.className = 'fa-solid fa-bars';
    }
  });

  // Close menu on escape key
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.focus();
      const icon = navToggle.querySelector('i');
      if (icon) icon.className = 'fa-solid fa-bars';
    }
  });
})();

/* ============================================================
   2. ACTIVE NAV LINK DETECTION
      (Sets .active on the link matching the current page)
   ============================================================ */
(function setActiveNavLink() {
  const navLinks = document.getElementById('navLinks');
  if (!navLinks) return;

  const currentFile = window.location.pathname.split('/').pop() || 'index.html';

  navLinks.querySelectorAll('a.nav-link').forEach(function (link) {
    const href = link.getAttribute('href');

    // Remove any hardcoded active class first
    if (link.classList.contains('active')) {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }

    // Only update aria-current on the active link
    if (href === currentFile) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
})();

/* ============================================================
   3. FADE-IN ON SCROLL (Intersection Observer)
   ============================================================ */
(function initFadeIn() {
  const fadeElements = document.querySelectorAll('.fade-in');

  if (!('IntersectionObserver' in window)) {
    // Fallback: just show everything
    fadeElements.forEach(function (el) {
      el.classList.add('visible');
    });
    return;
  }

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  fadeElements.forEach(function (el) {
    observer.observe(el);
  });
})();

/* ============================================================
   4. TERMINAL TYPING EFFECT (index.html hero)
   ============================================================ */
(function initTerminalTyping() {
  const terminal = document.querySelector('.terminal');
  if (!terminal) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const commands = terminal.querySelectorAll('.terminal__cmd');
  const reveals = terminal.querySelectorAll('.terminal__out, .terminal__actions, .cta-btns');

  // Hide the reveal blocks until their command has "typed"
  reveals.forEach(function (el) { el.style.visibility = 'hidden'; });

  if (prefersReducedMotion) {
    reveals.forEach(function (el) { el.style.visibility = 'visible'; });
    return;
  }

  const originalText = [];
  commands.forEach(function (el) {
    originalText.push(el.textContent);
    el.textContent = '';
  });

  let cmdIndex = 0;
  let charIndex = 0;

  function typeNextChar() {
    if (cmdIndex >= commands.length) return;

    const currentCmd = commands[cmdIndex];
    const text = originalText[cmdIndex];

    if (charIndex < text.length) {
      currentCmd.textContent += text.charAt(charIndex);
      charIndex += 1;
      setTimeout(typeNextChar, 28);
    } else {
      // Reveal the output block(s) tied to this command line
      const line = currentCmd.closest('.terminal__line');
      let next = line ? line.nextElementSibling : null;
      while (next && (next.classList.contains('terminal__out') || next.classList.contains('terminal__actions') || next.classList.contains('cta-btns'))) {
        next.style.visibility = 'visible';
        const afterNext = next.nextElementSibling;
        if (afterNext && afterNext.classList.contains('terminal__line')) break;
        next = afterNext;
      }

      cmdIndex += 1;
      charIndex = 0;
      setTimeout(typeNextChar, 280);
    }
  }

  setTimeout(typeNextChar, 400);
})();

/* ============================================================
   5. ROCK PAPER SCISSORS GAME (game.html)
   ============================================================ */
(function initRPSGame() {
  const playerScoreEl = document.getElementById('playerScore');
  const computerScoreEl = document.getElementById('computerScore');
  const playerEmojiEl = document.getElementById('playerEmoji');
  const playerNameEl = document.getElementById('playerChoiceName');
  const computerEmojiEl = document.getElementById('computerEmoji');
  const computerNameEl = document.getElementById('computerChoiceName');
  const playerBoxEl = document.getElementById('playerChoiceBox');
  const computerBoxEl = document.getElementById('computerChoiceBox');
  const roundResultEl = document.getElementById('roundResult');
  const gameButtons = document.querySelectorAll('.game__btn');
  const resetBtn = document.getElementById('resetGame');
  const overlayEl = document.getElementById('gameOverOverlay');
  const gameOverTitleEl = document.getElementById('gameOverTitle');
  const gameOverMessageEl = document.getElementById('gameOverMessage');
  const playAgainBtn = document.getElementById('playAgainBtn');

  // Only run if the game elements exist (i.e., we're on game.html)
  const isGamePage =
    playerScoreEl && computerScoreEl && roundResultEl && gameButtons.length > 0;

  if (!isGamePage) return;

  const CHOICES = {
    rock: { emoji: '🪨', name: 'Rock' },
    paper: { emoji: '📄', name: 'Paper' },
    scissors: { emoji: '✂️', name: 'Scissors' }
  };

  const WIN_SCORE = 5;
  let playerScore = 0;
  let computerScore = 0;
  let gameActive = true;

  function getRandomChoice() {
    const keys = Object.keys(CHOICES);
    const randomIndex = Math.floor(Math.random() * keys.length);
    return keys[randomIndex];
  }

  function getRoundResult(playerChoice, computerChoice) {
    if (playerChoice === computerChoice) return 'draw';

    const winMap = {
      rock: 'scissors',
      paper: 'rock',
      scissors: 'paper'
    };

    return winMap[playerChoice] === computerChoice ? 'win' : 'lose';
  }

  function playRound(playerChoice) {
    if (!gameActive) return;

    const computerChoice = getRandomChoice();
    const result = getRoundResult(playerChoice, computerChoice);

    // Update choice display
    playerEmojiEl.textContent = CHOICES[playerChoice].emoji;
    playerNameEl.textContent = CHOICES[playerChoice].name;
    computerEmojiEl.textContent = CHOICES[computerChoice].emoji;
    computerNameEl.textContent = CHOICES[computerChoice].name;

    playerBoxEl.classList.add('has-choice');
    computerBoxEl.classList.add('has-choice');

    // Update score & message
    if (result === 'win') {
      playerScore += 1;
      roundResultEl.textContent = '🎉 You win this round!';
    } else if (result === 'lose') {
      computerScore += 1;
      roundResultEl.textContent = '😅 Computer wins this round!';
    } else {
      roundResultEl.textContent = '🤝 It\'s a draw!';
    }

    playerScoreEl.textContent = playerScore;
    computerScoreEl.textContent = computerScore;

    checkWinCondition();
  }

  function checkWinCondition() {
    if (playerScore >= WIN_SCORE || computerScore >= WIN_SCORE) {
      gameActive = false;

      if (playerScore > computerScore) {
        gameOverTitleEl.textContent = '🏆 You Win!';
        gameOverMessageEl.textContent =
          'Congratulations! You reached 5 points first. Final score: You ' +
          playerScore + ' – ' + computerScore + ' Computer.';
      } else {
        gameOverTitleEl.textContent = '🤖 Computer Wins!';
        gameOverMessageEl.textContent =
          'Better luck next time! Final score: You ' +
          playerScore + ' – ' + computerScore + ' Computer.';
      }

      overlayEl.classList.add('show');
    }
  }

  function resetGame(resetMessage) {
    playerScore = 0;
    computerScore = 0;
    gameActive = true;

    playerScoreEl.textContent = '0';
    computerScoreEl.textContent = '0';

    playerEmojiEl.textContent = '❔';
    playerNameEl.textContent = 'Your pick';
    computerEmojiEl.textContent = '❔';
    computerNameEl.textContent = 'Computer';

    playerBoxEl.classList.remove('has-choice');
    computerBoxEl.classList.remove('has-choice');

    roundResultEl.textContent = resetMessage || 'Choose your move to start!';
  }

  // Wire up action buttons
  gameButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const choice = btn.getAttribute('data-choice');
      if (choice && CHOICES[choice]) {
        playRound(choice);
      }
    });
  });

  // Reset button
  resetBtn.addEventListener('click', function () {
    resetGame('Game reset. First to 5 wins!');
  });

  // Play Again (from game-over overlay)
  playAgainBtn.addEventListener('click', function () {
    overlayEl.classList.remove('show');
    resetGame('Choose your move to start!');
  });

  // Close game-over overlay on Escape
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && overlayEl.classList.contains('show')) {
      overlayEl.classList.remove('show');
      resetGame('Choose your move to start!');
    }
  });
})();

/* ============================================================
   6. THEME MANAGER — Dark/Light toggle with persistence
   ============================================================ */
(function initThemeManager() {
  var toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  var metaThemeColor = document.getElementById('metaThemeColor');

  var DARK_BG = '#0a0e14';
  var LIGHT_BG = '#f6f7fa';
  var TRANSITION_DURATION = 300; // ms, matches CSS theme-transition

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function updateIcon() {
    var theme = getTheme();
    var icon = toggle.querySelector('i');
    if (!icon) return;
    // Show sun in dark mode (meaning click to go light), moon in light mode
    icon.className = theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    toggle.setAttribute('aria-label',
      theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    toggle.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
  }

  function setTheme(theme, fromUser) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (metaThemeColor) metaThemeColor.setAttribute('content', LIGHT_BG);
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (metaThemeColor) metaThemeColor.setAttribute('content', DARK_BG);
    }

    // Only animate if the user explicitly clicked (not on page load)
    if (fromUser) {
      document.documentElement.classList.add('theme-transition');
      setTimeout(function () {
        document.documentElement.classList.remove('theme-transition');
      }, TRANSITION_DURATION);
    }

    try {
      localStorage.setItem('theme', theme);
    } catch (e) { /* storage full or private mode */ }

    updateIcon();
  }

  // Sync icon on load (the anti-FOUC script already set the theme attribute)
  updateIcon();

  // Toggle on click
  toggle.addEventListener('click', function () {
    var current = getTheme();
    var next = current === 'light' ? 'dark' : 'light';
    setTheme(next, true);
  });

  // Listen for system preference changes (only if user hasn't explicitly chosen)
  var mql = window.matchMedia('(prefers-color-scheme: light)');
  if (mql.addEventListener) {
    mql.addEventListener('change', function (e) {
      // Respect user's explicit preference; only auto-switch if theme isn't set
      var stored = null;
      try { stored = localStorage.getItem('theme'); } catch (ex) {}
      if (!stored) {
        setTheme(e.matches ? 'light' : 'dark', false);
      }
    });
  }
})();

/* Move the home panel with its file tab, pointer or keyboard. */
(function initMovablePortfolio() {
  const handle = document.getElementById('portfolioDrag');
  const reset = document.getElementById('portfolioReset');
  if (!handle || !reset) return;
  const panel = handle.closest('.editor-panel');
  const stage = panel.closest('.hero');
  let x = 0;
  let y = 0;
  let drag = null;

  function move(nextX, nextY) {
    const box = panel.getBoundingClientRect();
    const area = stage.getBoundingClientRect();
    const left = box.left - x;
    const top = box.top - y;
    const minX = 12 - left;
    const maxX = document.documentElement.clientWidth - 12 - left - box.width;
    const minY = area.top + 12 - top;
    const maxY = area.bottom - 12 - top - box.height;
    x = Math.max(minX, Math.min(Math.max(minX, maxX), nextX));
    y = Math.max(minY, Math.min(Math.max(minY, maxY), nextY));
    panel.style.setProperty('--panel-x', x + 'px');
    panel.style.setProperty('--panel-y', y + 'px');
  }

  function endDrag() {
    if (drag && handle.hasPointerCapture(drag.id)) handle.releasePointerCapture(drag.id);
    drag = null;
    panel.classList.remove('is-dragging');
  }

  function resetPosition() {
    endDrag();
    x = 0;
    y = 0;
    panel.style.removeProperty('--panel-x');
    panel.style.removeProperty('--panel-y');
  }

  handle.addEventListener('pointerdown', function (event) {
    if (!event.isPrimary || event.button !== 0) return;
    // Finish the entrance animation before measuring drag boundaries.
    panel.classList.add('visible');
    panel.style.transform = 'none';
    handle.focus({ preventScroll: true });
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: x, y: y };
    handle.setPointerCapture(event.pointerId);
    panel.classList.add('is-dragging');
  });
  handle.addEventListener('pointermove', function (event) {
    if (!drag || drag.id !== event.pointerId) return;
    move(drag.x + event.clientX - drag.startX, drag.y + event.clientY - drag.startY);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (name) {
    handle.addEventListener(name, endDrag);
  });
  handle.addEventListener('keydown', function (event) {
    const step = event.shiftKey ? 40 : 10;
    const directions = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (directions[event.key]) {
      event.preventDefault();
      move(x + directions[event.key][0], y + directions[event.key][1]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      resetPosition();
    }
  });
  reset.addEventListener('click', resetPosition);
  window.addEventListener('resize', resetPosition);
})();
