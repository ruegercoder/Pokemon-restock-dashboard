// ==UserScript==
// @name         Best Buy Pokemon Auto Add - SAFE CLICK TEST
// @namespace    pokemon-restock-dashboard
// @version      1.0.1-test
// @description  Safe fake Add to Cart test for Best Buy Pokemon watcher
// @match        https://www.bestbuy.com/product/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const CHECK_INTERVAL = 1000;
    let clicked = false;

    function makeStatus() {
        let box = document.getElementById("bestbuy-pokemon-status");

        if (!box) {
            box = document.createElement("div");
            box.id = "bestbuy-pokemon-status";

            box.style.cssText = `
                position: fixed;
                top: 15px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999999;
                background: #8a6d00;
                color: white;
                padding: 12px 18px;
                border-radius: 16px;
                font-size: 16px;
                font-weight: 700;
                text-align: center;
                max-width: 85vw;
                box-shadow: 0 4px 14px rgba(0,0,0,.28);
            `;

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(text, color) {
        const box = makeStatus();
        box.textContent = text;
        box.style.background = color;
    }

    function createFakeButton() {
        if (document.getElementById("pokemon-fake-add")) return;

        const fake = document.createElement("button");
        fake.id = "pokemon-fake-add";
        fake.textContent = "Add to Cart — SAFE TEST";

        fake.style.cssText = `
            position: fixed;
            bottom: 25px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999999;
            width: calc(100% - 40px);
            max-width: 500px;
            padding: 18px;
            font-size: 18px;
            font-weight: 800;
            background: #ffe000;
            color: #111;
            border: 3px solid #111;
            border-radius: 12px;
        `;

        fake.addEventListener("click", () => {
            clicked = true;
            fake.textContent = "✅ SAFE TEST CLICKED";
            fake.style.background = "#2e7d32";
            fake.style.color = "white";

            setStatus(
                "✅ SAFE AUTO-CLICK TEST PASSED",
                "#2e7d32"
            );
        });

        document.body.appendChild(fake);
    }

    function checkTestButton() {
        const fake = document.getElementById("pokemon-fake-add");

        if (!fake || clicked) return;

        const text = fake.textContent.trim().toLowerCase();

        if (text === "add to cart — safe test") {
            setStatus(
                "🟢 FAKE ADD TO CART FOUND — AUTO CLICKING",
                "#2e7d32"
            );

            fake.click();
        }
    }

    setStatus(
        "🧪 SAFE CLICK TEST STARTING",
        "#555"
    );

    createFakeButton();

    setInterval(checkTestButton, CHECK_INTERVAL);
})();