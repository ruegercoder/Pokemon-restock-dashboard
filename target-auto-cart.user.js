// ==UserScript==
// @name         Target Pokémon Auto Add — TEST
// @namespace    pokemon-restock-dashboard
// @version      1.0.0
// @description  Safe test for Target Pokémon auto-add logic.
// @match        https://www.target.com/p/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function () {
    "use strict";
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
        box.textContent = "🟡 TEST: Waiting for test button...";
        document.body.appendChild(box);
    }
    function setStatus(text) {
        const box = document.getElementById("pokemon-target-status");
        if (box) {
            box.textContent = text;
        }
    }
    // Create a fake Add to Cart button
    function createTestButton() {
        if (document.getElementById("pokemon-test-cart-button")) return;
        const button = document.createElement("button");
        button.id = "pokemon-test-cart-button";
        button.type = "button";
        button.textContent = "🛒 Add to Cart — TEST";
        button.style.cssText = `
            position: fixed;
            bottom: 25px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 2147483647;
            background: #cc0000;
            color: white;
            border: none;
            padding: 16px 24px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,.4);
        `;
        button.addEventListener("click", function () {
            setStatus("✅ TEST SUCCESS — Button was clicked!");
            button.textContent = "✅ TEST BUTTON CLICKED";
            console.log(
                "Target Pokémon TEST: Fake Add to Cart button clicked successfully."
            );
        });
        document.body.appendChild(button);
    }
    // Look ONLY for our fake test button
    function checkTestButton() {
        if (clicked) return;
        const testButton =
            document.getElementById("pokemon-test-cart-button");
        if (testButton && !testButton.disabled) {
            clicked = true;
            setStatus(
                "🟢 TEST BUTTON FOUND — Clicking..."
            );
            console.log(
                "Target Pokémon TEST: Fake Add to Cart button found."
            );
            setTimeout(function () {
                testButton.click();
            }, 500);
        }
    }
    function start() {
        createStatus();
        createTestButton();
        // Give the page a moment to finish rendering
        setTimeout(checkTestButton, 1500);
        // Continue checking
        setInterval(checkTestButton, 1000);
        console.log(
            "Target Pokémon Auto Add TEST: Started."
        );
    }
    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            start
        );
    } else {
        start();
    }
})();