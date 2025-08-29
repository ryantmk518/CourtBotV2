// ==UserScript==
// @name         Don't Worry About It :)
// @namespace    thaiboygoon.plugins
// @version      1.0
// @description  Clicks the right-most date repeatedly; when a visible enabled "Book" button appears, clicks it and stops
// @match        https://active.illinois.edu/booking/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const INTERVAL_MS = 250; // how often to refresh by clicking the right-most date
  let intervalId = null;
  let armed = true; // set false after we successfully click Book

  // ---------- helpers ----------
  const isVisible = (el) => {
    if (!el || !el.offsetParent) return false;
    const st = getComputedStyle(el);
    return st.display !== 'none' && st.visibility !== 'hidden' && st.pointerEvents !== 'none';
  };

  const isEnabled = (el) => (
    !el.disabled &&
    el.getAttribute('disabled') === null &&
    (el.getAttribute('aria-disabled') || '').toLowerCase() !== 'true'
  );

  // Top-row date tiles contain a month name (AUG/SEP/…)
  function findDateButtons() {
    return Array.from(document.querySelectorAll('button, [role="tab"], [role="radio"]'))
      .filter(isVisible)
      .filter(isEnabled)
      .filter(el => /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test((el.innerText || '').trim()));
  }

  function clickRightmostDate() {
    const dates = findDateButtons();
    if (!dates.length) return false;
    const target = dates.reduce((rightmost, el) => {
      const x = el.getBoundingClientRect().left;
      return (!rightmost || x > rightmost.getBoundingClientRect().left) ? el : rightmost;
    }, null);
    if (!target) return false;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.click();
    console.log('[AutoBook] Clicked date:', (target.innerText || '').trim());
    return true;
  }

  function findBookButton() {
    const candidates = Array.from(document.querySelectorAll(
      'button, a[role="button"], [class*="btn"], [class*="button"]'
    )).filter(isVisible).filter(isEnabled);

    // prefer elements whose text/aria/testid mentions "book", "reserve", or "register"
    for (const el of candidates) {
      const txt = ((el.innerText || el.textContent || '') + ' ' +
                   (el.getAttribute('aria-label') || '') + ' ' +
                   (el.getAttribute('data-testid') || '')).toLowerCase();
      if (/(^|\b)(book|reserve|register)(\b|$)/.test(txt)) return el;
    }
    return null;
  }

  function tryClickBook() {
    const btn = findBookButton();
    if (!btn) return false;
    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => btn.click(), 120); // tiny human-ish delay
    console.log('[AutoBook] CLICKED "Book" — stopping refresher.');
    armed = false;
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    return true;
  }

  // React fast to SPA updates as well
  const mo = new MutationObserver(() => {
    if (!armed) return;
    if (tryClickBook()) return;
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  function loop() {
    if (!armed) return;
    // 1) If Book is present, click and stop
    if (tryClickBook()) return;

    // 2) Otherwise, refresh by tapping the right-most date
    clickRightmostDate();
  }

  intervalId = setInterval(loop, INTERVAL_MS);
  console.log('[AutoBook] Started: refreshing dates every', INTERVAL_MS, 'ms until "Book" appears.');
})();
