// ==UserScript==
// @name         Target Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.5
// @description  Watches Target product page and clicks the real Add to Cart button when available.
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
    let checkTimer = null;

    function createStatusBox() {
        let box = document.getElementById("pokemon-target-status");

        if (box) return box;

        box = document.createElement("div");
        box.id = "pokemon-target-status";

        box.style.cssText = `
            position: fixed;
            top: 90px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 999999;
            background: #111;
            color: white;
            padding: 12px 16px;
            border-radius: 14px;
            font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
            font-size: 16px;
            font-weight: 600;
            box-shadow: 0 4px 14px rgba(0,0,0,.3);
            max-width: 90%;
            text-align: center;
        `;

        box.textContent = "🔵 Target watcher starting...";

        document.body.appendChild(box);

        return box;
    }

    function setStatus(text) {
        const box = createStatusBox();
        box.textContent = text;
    }

    function normalizeText(element) {
        return (
            element.innerText ||
            element.textContent ||
            ""
        )
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function isVisible(element) {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0" &&
            rect.width > 0 &&
            rect.height > 0
        );
    }

    function findRealAddToCartButton() {
        const buttons = Array.from(
            document.querySelectorAll("button")
        );

        const candidates = buttons.filter(button => {
            const text = normalizeText(button);

            const isAddToCart =
                text === "add to cart" ||
                text.startsWith("add to cart ");

            return (
                isAddToCart &&
                !button.disabled &&
                isVisible(button) &&
                button.id !== "pokemon-test-add-button"
            );
        });

        if (candidates.length === 0) {
            return null;
        }

        /*
         * Target can sometimes render more than one Add to Cart
         * button on a page. Prefer the one appearing earliest
         * in the actual product page.
         */
        candidates.sort((a, b) => {
            const aY =
                a.getBoundingClientRect().top +
                window.scrollY;

            const bY =
                b.getBoundingClientRect().top +
                window.scrollY;

            return aY - bY;
        });

        return candidates[0];
    }

    function pageSaysSoldOut() {
        const pageText = (
            document.body.innerText || ""
        ).toLowerCase();

        return (
            pageText.includes("sold out") ||
            pageText.includes("out of stock")
        );
    }

    function checkStock() {
        if (addedToCart) {
            return;
        }

        const addButton =
            findRealAddToCartButton();

        if (!addButton) {

            if (pageSaysSoldOut()) {
                setStatus(
                    "🟡 SOLD OUT — WATCHING"
                );
            } else {
                setStatus(
                    "🟡 WATCHING FOR ADD TO CART"
                );
            }

            return;
        }

        setStatus(
            "🟢 ADD TO CART DETECTED"
        );

        console.log(
            "🟢 Real Target Add to Cart button detected:",
            addButton
        );

        addedToCart = true;

        /*
         * Stop the watcher so we don't click twice.
         */
        if (checkTimer) {
            clearInterval(checkTimer);
        }

        setTimeout(() => {

            setStatus(
                "🔵 ADDING TO CART..."
            );

            addButton.click();

            setTimeout(() => {

                setStatus(
                    "✅ ADD TO CART CLICKED"
                );

                console.log(
                    "✅ Target Add to Cart button clicked automatically."
                );

            }, 500);

        }, 300);
    }

    createStatusBox();

    setStatus(
        "🟡 WATCHING TARGET..."
    );

    checkStock();

    checkTimer = setInterval(
        checkStock,
        CHECK_INTERVAL
    );

})();
