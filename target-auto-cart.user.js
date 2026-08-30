// ==UserScript==
// @name         Target Pokémon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      1.0.0
// @description  Watches a Target Pokémon product page and clicks Add to Cart when available.
// @match        https://www.target.com/p/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    // Target Pokémon product
    const PRODUCT_ID = "A-1010892076";

    // Check every 3 seconds
    const CHECK_INTERVAL = 3000;

    let clicked = false;

    function createStatus() {
        if (document.getElementById("pokemon-target-status")) return;

        const box = document.createElement("div");
        box.id = "pokemon-target-status";

        box.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 2147483647;
            background: #222;
            color: white;
            padding: 10px 14px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,.3);
        `;

        box.textContent = "🟡 Target: Checking stock...";
        document.body.appendChild(box);
    }

    function setStatus(text) {
        const box = document.getElementById("pokemon-target-status");
        if (box) box.textContent = text;
    }

    function checkForCartButton() {
        if (clicked) return;

        const buttons = Array.from(document.querySelectorAll("button"));

        const addButton = buttons.find(button => {
            const text = (button.innerText || button.textContent || "")
                .trim()
                .toLowerCase();

            return (
                text === "add to cart" ||
                text.includes("add to cart")
            );
        });

        if (addButton && !addButton.disabled) {
            clicked = true;

            setStatus("🟢 IN STOCK — Adding to cart!");

            addButton.click();

            console.log("Target Pokémon: Add to Cart clicked.");
            return;
        }

        const pageText = document.body.innerText.toLowerCase();

        if (
            pageText.includes("out of stock") ||
            pageText.includes("sold out")
        ) {
            setStatus("🔴 Target: Out of stock");
        } else {
            setStatus("🟡 Target: Checking stock...");
        }
    }

    function start() {
        createStatus();

        // Give Target time to render its product page.
        setTimeout(checkForCartButton, 1500);

        // Continue checking without interfering with page loading.
        setInterval(checkForCartButton, CHECK_INTERVAL);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();