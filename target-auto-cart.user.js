// ==UserScript==
// @name         Target Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.6.7-test
// @description  Target-only scoped auto-add with safe manual test
// @match        https://www.target.com/p/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const TARGET_PRODUCT_ID = "A-1010892076";

    const REQUIRED_WORDS = [
        "30th",
        "celebration",
        "elite trainer box"
    ];

    const CHECK_INTERVAL = 1500;

    let alreadyClicked = false;
    let testMode = false;

    function createStatusBox() {
        let box = document.getElementById("pokemon-target-status");

        if (!box) {
            box = document.createElement("div");
            box.id = "pokemon-target-status";

            box.style.cssText = `
                position: fixed;
                top: 15px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 999999;
                background: #111;
                color: #fff;
                padding: 12px 16px;
                border-radius: 14px;
                font-size: 15px;
                font-weight: bold;
                font-family: Arial, sans-serif;
                text-align: center;
                box-shadow: 0 4px 14px rgba(0,0,0,.25);
            `;

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(message) {
        createStatusBox().textContent = message;
    }

    function correctProductPage() {
        const url = window.location.href.toLowerCase();

        if (!url.includes(TARGET_PRODUCT_ID.toLowerCase())) {
            return false;
        }

        const pageText = (
            document.querySelector("main")?.innerText ||
            document.body.innerText ||
            ""
        ).toLowerCase();

        return REQUIRED_WORDS.every(word =>
            pageText.includes(word)
        );
    }

    function findMainProductArea() {
        const main = document.querySelector("main");

        if (!main) return null;

        const headings = Array.from(
            main.querySelectorAll("h1, h2, [data-test]")
        );

        const matchingHeading = headings.find(el => {
            const text = (el.innerText || el.textContent || "")
                .toLowerCase();

            return REQUIRED_WORDS.every(word =>
                text.includes(word)
            );
        });

        if (!matchingHeading) {
            return main;
        }

        let container = matchingHeading;

        for (let i = 0; i < 8 && container; i++) {
            const text = (container.innerText || "")
                .toLowerCase();

            if (
                text.includes("out of stock") ||
                text.includes("add to cart") ||
                text.includes("shipping") ||
                text.includes("pickup")
            ) {
                return container;
            }

            container = container.parentElement;
        }

        return main;
    }

    function findTargetAddToCartButton() {
        const productArea = findMainProductArea();

        if (!productArea) return null;

        const buttons = Array.from(
            productArea.querySelectorAll("button")
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
                text.includes("add to cart") &&
                !button.disabled &&
                button.offsetParent !== null
            );
        }) || null;
    }

    function productLooksSoldOut() {
        const area = findMainProductArea();

        if (!area) return false;

        const text = (
            area.innerText ||
            area.textContent ||
            ""
        ).toLowerCase();

        return (
            text.includes("out of stock") ||
            text.includes("sold out")
        );
    }

    function checkStock() {
        if (!correctProductPage()) {
            setStatus("⚪ WRONG PRODUCT — NOT ACTIVE");
            return;
        }

        if (alreadyClicked) {
            setStatus("✅ ADD TO CART CLICKED");
            return;
        }

        const button = findTargetAddToCartButton();

        if (button) {

            if (testMode) {
                setStatus("🧪 TEST PASSED — CORRECT BUTTON FOUND");
                console.log(
                    "TEST MODE: Correct target Add to Cart button found.",
                    button
                );

                testMode = false;
                return;
            }

            setStatus("🟢 IN STOCK — ADDING TO CART");

            alreadyClicked = true;

            button.click();

            console.log(
                "Target Pokemon Auto Add: clicked target product button."
            );

            return;
        }

        if (productLooksSoldOut()) {
            setStatus("🟡 SOLD OUT — WATCHING");
        } else {
            setStatus("🔎 WATCHING TARGET PRODUCT");
        }
    }

    function createTestButton() {
        if (document.getElementById("pokemon-test-button")) {
            return;
        }

        const button = document.createElement("button");

        button.id = "pokemon-test-button";
        button.textContent = "🧪 TEST TARGET";

        button.style.cssText = `
            position: fixed;
            bottom: 25px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 999999;
            background: #fff;
            color: #111;
            border: 2px solid #111;
            padding: 12px 18px;
            border-radius: 14px;
            font-size: 15px;
            font-weight: bold;
            font-family: Arial, sans-serif;
        `;

        button.addEventListener("click", () => {
            testMode = true;

            setStatus("🧪 TESTING TARGET PRODUCT");

            checkStock();
        });

        document.body.appendChild(button);
    }

    createStatusBox();
    createTestButton();

    setStatus("🔎 STARTING TARGET WATCH");

    checkStock();

    setInterval(checkStock, CHECK_INTERVAL);

})();