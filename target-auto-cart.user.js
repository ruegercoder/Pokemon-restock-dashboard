// ==UserScript==
// @name         Target Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.1
// @description  TEST version for Target auto-add detection.
// @match        https://www.target.com/p/*
// @updateURL    https://raw.githubusercontent.com/ruegercoder/Pokemon-restock-dashboard/main/target-auto-cart.user.js
// @downloadURL  https://raw.githubusercontent.com/ruegercoder/Pokemon-restock-dashboard/main/target-auto-cart.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const CHECK_INTERVAL = 1000;
    let addedToCart = false;

    function createStatusBox() {
        if (document.getElementById("pokemon-target-status")) return;

        const box = document.createElement("div");
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

        box.textContent = "🟡 TEST: Waiting...";
        document.body.appendChild(box);
    }

    function setStatus(text) {
        const box = document.getElementById("pokemon-target-status");
        if (box) box.textContent = text;
    }

    function createFakeAddButton() {
        if (document.getElementById("pokemon-test-add-button")) return;

        const button = document.createElement("button");
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

        button.addEventListener("click", () => {
            button.textContent = "✅ TEST BUTTON CLICKED";
        });

        document.body.appendChild(button);
    }

    function findAddToCartButton() {
        return Array.from(document.querySelectorAll("button"))
            .filter(button => button.offsetParent !== null)
            .find(button => {
                const text = (button.innerText || button.textContent || "")
                    .trim()
                    .toLowerCase();

                return (
                    text.includes("add to cart") &&
                    !button.disabled
                );
            });
    }

    function checkStock() {
        if (addedToCart) return;

        const addButton = findAddToCartButton();

        if (!addButton) {
            setStatus("🟡 TEST: Waiting for Add to Cart");
            return;
        }

        setStatus("🟢 TEST: Add to Cart detected");

        addedToCart = true;

        setTimeout(() => {
            addButton.click();
            setStatus("✅ TEST PASSED — button clicked");
        }, 500);
    }

    createStatusBox();
    createFakeAddButton();

    setInterval(checkStock, CHECK_INTERVAL);
})();
