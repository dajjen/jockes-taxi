// Jockes Taxi — liten progressiv förbättring. Sidan fungerar helt utan JS.
(function () {
  "use strict";

  // Håll copyright-året aktuellt.
  var yr = document.getElementById("ar");
  if (yr) {
    yr.textContent = String(new Date().getFullYear());
  }

  // Mobilmeny: hamburgar-knappen fäller ut/in navigeringen.
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("huvudmeny");
  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Stäng meny" : "Öppna meny");
    };
    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("is-open"));
    });
    // Stäng när man valt en länk eller trycker Escape.
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  // Visa kvitto/felmeddelande efter att recensionsformuläret skickats.
  // send-review.php skickar tillbaka besökaren med ?tack=1 eller ?fel=<orsak>.
  var status = document.getElementById("form-status");
  if (status) {
    var params = new URLSearchParams(window.location.search);
    var fel = {
      validering: "Fyll i namn, betyg och recensionstext så skickar vi den.",
      epost: "E-postadressen ser inte giltig ut — kontrollera den eller lämna fältet tomt.",
      skick: "Något gick fel när recensionen skulle skickas. Försök gärna igen om en stund.",
      metod: "Något gick fel. Försök igen."
    };

    if (params.has("tack")) {
      status.textContent = "Tack för din recension! Vi har tagit emot den.";
      status.classList.add("ok");
      status.hidden = false;
    } else if (params.has("fel")) {
      status.textContent = fel[params.get("fel")] || "Något gick fel. Försök igen.";
      status.classList.add("err");
      status.hidden = false;
    }

    // Städa bort statusen ur URL:en så den inte dyker upp igen vid omladdning.
    if (!status.hidden && window.history.replaceState) {
      window.history.replaceState(null, "", window.location.pathname + "#recensera");
    }
  }
})();
