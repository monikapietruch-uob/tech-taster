/*
  Colour schemes ("looks")
  ------------------------
  The site has four looks. Each one is a block of colours in css/site.css.
  This file decides which block is used:

    1. a look named in the address, such as index.html?look=night
    2. otherwise the look this browser used last time
    3. otherwise the first look in the list below

  The script is loaded in the <head>, so it runs before the page is drawn and
  the page never flashes in the wrong colours. The buttons that change the
  look are in the footer of index.html.
*/
(function () {
  "use strict";

  const LOOKS = ["tea", "battenberg", "night", "sign"];
  const STORE_KEY = "tech-taster-look";
  const page = document.documentElement; // the <html> element

  function isKnown(look) {
    return LOOKS.includes(look);
  }

  function remembered() {
    try {
      return window.localStorage.getItem(STORE_KEY);
    } catch (error) {
      return null; // storage is switched off: use the first look
    }
  }

  function remember(look) {
    try {
      window.localStorage.setItem(STORE_KEY, look);
    } catch (error) {
      // Nothing to do: the choice simply will not be remembered.
    }
  }

  function fromAddress() {
    const match = /[?&]look=([a-z]+)/.exec(window.location.search);
    return match ? match[1] : null;
  }

  // Switches the colours, and marks the matching button as pressed.
  function setLook(look) {
    page.setAttribute("data-look", look);
    document.querySelectorAll("[data-look-choice]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-look-choice") === look));
    });
  }

  const asked = fromAddress();
  let look = isKnown(asked) ? asked : remembered();
  if (!isKnown(look)) {
    look = LOOKS[0];
  }
  if (isKnown(asked)) {
    remember(asked); // so the other pages keep the look from the address
  }
  setLook(look);

  // The buttons do not exist yet when this script first runs, so wait for the page.
  document.addEventListener("DOMContentLoaded", function () {
    setLook(page.getAttribute("data-look"));
    document.addEventListener("click", function (event) {
      const button = event.target.closest("[data-look-choice]");
      if (!button) {
        return;
      }
      const choice = button.getAttribute("data-look-choice");
      if (isKnown(choice)) {
        remember(choice);
        setLook(choice);
      }
    });
  });
})();
