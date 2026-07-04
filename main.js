// Jockes Taxi — liten progressiv förbättring. Sidan fungerar helt utan JS.
(function () {
  "use strict";

  // Håll copyright-året aktuellt.
  var yr = document.getElementById("ar");
  if (yr) {
    yr.textContent = String(new Date().getFullYear());
  }
})();
