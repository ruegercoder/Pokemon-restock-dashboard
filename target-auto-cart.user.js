// ==UserScript==
// @name         Target Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.4
// @description  Direct auto-click diagnostic test.
// @match        https://www.target.com/p/*
// @updateURL    https://raw.githubusercontent.com/ruegercoder/Pokemon-restock-dashboard/main/target-auto-cart.user.js
// @downloadURL  https://raw.githubusercontent.com/ruegercoder/Pokemon-restock-dashboard/main/target-auto-cart.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    function createStatusBox() {
        let box = document.getElementById("pokemon-target-status");

        if (box) return box;

        box = document.createElement("div");
        box.id = "pokemon-target-status";

        box.style.cssText = `
            position: fixed;
            top: 90px;
            right: 15px;
            z-index: 999999;
            background: #111;
            color: white;
            padding: 12px 16px;
            border-radius: 14px;
            font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
            font-size: 16px;
            font-weight: 600;
            box-shadow: 0 4px 14px rgba(0,0,0,.3);
        `;

        document.body.appendChild(box);
        return box;
    }

    function setStatus(text) {
        const box = createStatusBox();
        box.textContent = text;
    }

    function createFakeButton() {
        let button = document.getElementById("pokemon-test-add-button");

        if (button) return button;

        button = document.createElement("button");
        button.id = "pokemon-test-add-button";
        button.textContent = "🧪 Add to Cart — TEST";

        button.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 999999;
            background: #cc0000;
            color: white;
            border: none;
            padding: 16px 24px;
            border-radius: 999px;
            font-size: 18px;
            font-weight: 700;
        `;

        button.addEventListener("click", function () {
            button.textContent = "✅ AUTO CLICK WORKED";
            setStatus("✅ DIRECT AUTO CLICK PASSED");
        });

        document.body.appendChild(button);

        return button;
    }

    setStatus("🟡 v2.4 loaded — waiting 2 seconds");

    const testButton = createFakeButton();

    setTimeout(function () {
        setStatus("🔵 Attempting automatic click...");

        const button = document.getElementById(
            "pokemon-test-add-button"
        );

        if (!button) {
            setStatus("❌ TEST BUTTON NOT FOUND");
            return;
        }

        button.click();
    }, 2000);

})();
