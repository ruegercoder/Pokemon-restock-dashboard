// ==UserScript==
// @name         Target Pokémon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.0.0
// @description  Watches a Target Pokémon product page and clicks Add to Cart when available.
// @match        https://www.target.com/p/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function () {
    "use strict";
    const PRODUCT_ID = "A-1010892076";
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
        if (box) {
            box.textContent = text;
        }
    }
    function findAddToCartButton() {
        const buttons = Array.from(
            document.querySelectorAll("button")
        );
        return buttons.find(button => {
            const text = (
                button.innerText ||
                button.textContent ||
                ""
            )
                .trim()
                .toLowerCase();
            return (
                text === "add to cart" ||
                text.includes("add to cart")
            );
        });
    }
    function checkStock() {
        if (clicked) return;
        const addButton = findAddToCartButton();
        // ADD TO CART FOUND
        if (addButton) {
            if (!addButton.disabled) {
                clicked = true;
                setStatus(
                    "🟢 IN STOCK — Adding to cart!"
                );
                console.log(
                    "Target Pokémon: Add to Cart button found."
                );
                // Small delay so Target finishes rendering
                setTimeout(() => {
                    addButton.scrollIntoView({
                        behavior: "instant",
                        block: "center"
                    });
                    addButton.click();
                    console.log(
                        "Target Pokémon: Add to Cart clicked."
                    );
                }, 100);
                // Verify cart action after a moment
                setTimeout(() => {
                    const pageText =
                        document.body.innerText.toLowerCase();
                    if (
                        pageText.includes("added to cart") ||
                        pageText.includes("view cart") ||
                        pageText.includes("cart")
                    ) {
                        setStatus(
                            "🟢 Added to cart!"
                        );
                    }
                }, 1500);
                return;
            }
        }
        // CHECK TARGET'S STOCK TEXT
        const pageText =
            document.body.innerText.toLowerCase();
        if (
            pageText.includes("out of stock") ||
            pageText.includes("sold out")
        ) {
            setStatus(
                "🔴 Target: Out of stock"
            );
        } else {
            setStatus(
                "🟡 Target: Checking stock..."
            );
        }
    }
    function start() {
        createStatus();
        // Initial check
        setTimeout(checkStock, 1500);
        // Continue checking every 3 seconds
        setInterval(checkStock, CHECK_INTERVAL);
        // Also watch Target for dynamically created buttons
        const observer = new MutationObserver(() => {
            if (!clicked) {
                checkStock();
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        console.log(
            "Target Pokémon Auto Add: Monitor started."
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