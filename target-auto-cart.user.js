// ==UserScript==
// @name         Target Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.0
// @description  Detects Target stock and clicks Add to Cart when available.
// @match        https://www.target.com/p/*
// @updateURL    https://raw.githubusercontent.com/ruegercoder/Pokemon-restock-dashboard/main/target-auto-cart.user.js
// @downloadURL  https://raw.githubusercontent.com/ruegercoder/Pokemon-restock-dashboard/main/target-auto-cart.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const CHECK_INTERVAL = 2000;
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

        box.textContent = "🟡 Target: Checking stock...";
        document.body.appendChild(box);
    }

    function setStatus(text) {
        const box = document.getElementById("pokemon-target-status");
        if (box) box.textContent = text;
    }

    function getVisibleButtons() {
        return Array.from(document.querySelectorAll("button"))
            .filter(button => button.offsetParent !== null);
    }

    function findAddToCartButton() {
        return getVisibleButtons().find(button => {
            const text = (button.innerText || button.textContent || "")
                .trim()
                .toLowerCase();

            return (
                text.includes("add to cart") &&
                !button.disabled
            );
        });
    }

    function pageLooksSoldOut() {
        const pageText = document.body.innerText.toLowerCase();

        return (
            pageText.includes("sold out") ||
            pageText.includes("out of stock")
        );
    }

    function checkStock() {
        if (addedToCart) return;

        const addButton = findAddToCartButton();

        if (addButton) {
            setStatus("🟢 Target: IN STOCK — Adding to cart");

            addedToCart = true;

            setTimeout(() => {
                addButton.click();
                setStatus("✅ Target: Add to Cart clicked");
            }, 300);

            return;
        }

        if (pageLooksSoldOut()) {
            setStatus("🔴 Target: Out of stock");
            return;
        }

        setStatus("🟡 Target: Checking stock...");
    }

    createStatusBox();

    checkStock();

    setInterval(checkStock, CHECK_INTERVAL);
})();
