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

  const normalize = path => path.replace(/\.html$/, '').replace(/\/$/, '') || '/index';
  const links = Array.from(navLinks.querySelectorAll('a.nav-link'));
  const currentPath = normalize(window.location.pathname);
  const sections = [];

  function activate(activeLink, value) {
    links.forEach(link => {
      link.classList.toggle('active', link === activeLink);
      if (link === activeLink) link.setAttribute('aria-current', value);
      else link.removeAttribute('aria-current');
    });
  }

  links.forEach(link => {
    const url = new URL(link.href);
    if (normalize(url.pathname) !== currentPath) return;
    if (!url.hash) activate(link, 'page');
    else {
      const section = document.getElementById(url.hash.slice(1));
      if (section) sections.push({ section, link });
    }
  });

  // Select the section at the reading position, including Vercel clean URLs.
  if (sections.length) {
    let queued = false;
    const update = () => {
      queued = false;
      const readingLine = Math.min(window.innerHeight * .35, 240);
      const active = sections.find(({ section }) => {
        const box = section.getBoundingClientRect();
        return box.top <= readingLine && box.bottom > readingLine;
      });
      activate(active ? active.link : null, 'location');
    };
    window.addEventListener('scroll', () => {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
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
    rock: { emoji: '◯', name: 'Rock' },
    paper: { emoji: '▱', name: 'Paper' },
    scissors: { emoji: '✕', name: 'Scissors' }
  };

  const WIN_SCORE = 5;
  let playerScore = 0;
  let computerScore = 0;
  let gameActive = true;
  let previousFocus = null;
  const backgroundElements = [document.querySelector('.navbar'), document.querySelector('.game__card'), document.querySelector('.footer')];

  function setDialogOpen(open) {
    if (open) previousFocus = document.activeElement;
    overlayEl.classList.toggle('show', open);
    backgroundElements.forEach(element => { if (element) element.inert = open; });
    if (open) playAgainBtn.focus();
    else if (previousFocus) previousFocus.focus();
  }

  overlayEl.addEventListener('keydown', function (event) {
    // The dialog has a single action; keep keyboard focus within it.
    if (event.key === 'Tab') { event.preventDefault(); playAgainBtn.focus(); }
  });

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
      roundResultEl.textContent = 'You win this round!';
    } else if (result === 'lose') {
      computerScore += 1;
      roundResultEl.textContent = 'Computer wins this round!';
    } else {
      roundResultEl.textContent = 'It\'s a draw!';
    }

    playerScoreEl.textContent = playerScore;
    computerScoreEl.textContent = computerScore;

    checkWinCondition();
  }

  function checkWinCondition() {
    if (playerScore >= WIN_SCORE || computerScore >= WIN_SCORE) {
      gameActive = false;

      if (playerScore > computerScore) {
        gameOverTitleEl.textContent = 'You win!';
        gameOverMessageEl.textContent =
          'Congratulations! You reached 5 points first. Final score: You ' +
          playerScore + ' – ' + computerScore + ' Computer.';
      } else {
        gameOverTitleEl.textContent = 'Computer wins!';
        gameOverMessageEl.textContent =
          'Better luck next time! Final score: You ' +
          playerScore + ' – ' + computerScore + ' Computer.';
      }

      setDialogOpen(true);
    }
  }

  function resetGame(resetMessage) {
    playerScore = 0;
    computerScore = 0;
    gameActive = true;

    playerScoreEl.textContent = '0';
    computerScoreEl.textContent = '0';

    playerEmojiEl.textContent = '—';
    playerNameEl.textContent = 'Your pick';
    computerEmojiEl.textContent = '—';
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
    setDialogOpen(false);
    resetGame('Choose your move to start!');
  });

  // Close game-over overlay on Escape
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && overlayEl.classList.contains('show')) {
      setDialogOpen(false);
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

  var DARK_BG = '#0a0a0a';
  var LIGHT_BG = '#f5f5f3';
  var TRANSITION_DURATION = 300; // ms, matches CSS theme-transition

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
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
      document.documentElement.setAttribute('data-theme', 'dark');
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
      if (fromUser) localStorage.setItem('theme', theme);
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
