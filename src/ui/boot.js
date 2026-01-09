// A plain (non-module) script that explains what went wrong if the app never
// starts, for example when index.html is opened straight from disk.
(function () {
  setTimeout(function () {
    if (window.__noodleReady) return;
    var box = document.getElementById('boot-error');
    var reason = document.getElementById('boot-reason');
    if (!box || !reason) return;
    if (location.protocol === 'file:') {
      reason.innerHTML = 'Browsers block apps opened straight from a file. Start the tiny local server instead:<br><code>npm start</code> (or <code>node serve.js</code>), then open <code>http://localhost:5173</code>.<br>Or use the live version on GitHub Pages.';
    } else {
      reason.textContent = 'Your browser may be too old, or a script failed to load. Try refreshing, or use a recent Chrome, Edge, Firefox or Safari.';
    }
    box.hidden = false;
  }, 2500);
})();
