// ==UserScript==
// @name         Pokémon Target Auto Cart
// @namespace    pokemon-restock-dashboard
// @version      3.0.0
// @description  Monitor Target Pokémon products and click Add to Cart when available.
// @match        https://www.target.com/p/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    let addedToCart = false;
    let checkTimer = null;
    let timeoutTimer = null;
    let observer = null;

    const CHECK_INTERVAL = 1500;
    const MAX_LOADING_TIME = 15000;

    function createStatus() {
        if (document.getElementById("pokemon-target-status")) return;

        const box = document.createElement("div");

        box.id = "pokemon-target-status";

        Object.assign(box.style, {
            position: "fixed",
            top: "15px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: "999999",
            background: "#111",
            color: "#fff",
            padding: "12px 18px",
            borderRadius: "14px",
            fontFamily: "Arial,sans-serif",
            fontSize: "15px",
            fontWeight: "700",
            boxShadow: "0 4px 20px rgba(0,0,0,.35)",
            textAlign: "center",
            maxWidth: "90%",
            pointerEvents: "none"
        });

        document.body.appendChild(box);
    }

    function status(text) {
        createStatus();

        const box =
            document.getElementById("pokemon-target-status");

        if (box) {
            box.textContent = text;
        }

        console.log(
            "[Pokémon Target Monitor]",
            text
        );
    }

    function getPageText() {
        return (
            document.body?.innerText ||
            document.body?.textContent ||
            ""
        )
        .replace(/\s+/g, " ")
        .toLowerCase();
    }

    function findAddToCart() {

        const elements = Array.from(
            document.querySelectorAll(
                "button, [role='button']"
            )
        );

        return elements.find(el => {

            const text = (
                el.innerText ||
                el.textContent ||
                el.getAttribute("aria-label") ||
                ""
            )
            .trim()
            .toLowerCase();

            const visible =
                el.offsetParent !== null;

            const disabled =
                el.disabled ||
                el.getAttribute("aria-disabled") === "true";

            return (
                visible &&
                !disabled &&
                (
                    text === "add to cart" ||
                    text.includes("add to cart")
                )
            );
        });
    }

    function detectVerification(text) {

        return (
            text.includes("captcha") ||
            text.includes("verify you are human") ||
            text.includes("robot or human") ||
            text.includes("security check") ||
            text.includes("checking your browser")
        );
    }

    function detectOutOfStock(text) {

        const terms = [
            "out of stock",
            "sold out",
            "currently unavailable",
            "not available",
            "unavailable",
            "this item is not available",
            "shipping unavailable",
            "pickup unavailable"
        ];

        return terms.some(term =>
            text.includes(term)
        );
    }

    function clickAddToCart() {

        if (addedToCart) return;

        const button = findAddToCart();

        if (!button) return false;

        status(
            "🟢 IN STOCK — ADD TO CART FOUND"
        );

        setTimeout(() => {

            if (addedToCart) return;

            const currentButton =
                findAddToCart();

            if (!currentButton) {
                status(
                    "🟡 ADD TO CART DISAPPEARED — RETRYING"
                );
                return;
            }

            currentButton.scrollIntoView({
                behavior: "instant",
                block: "center"
            });

            currentButton.click();

            addedToCart = true;

            stopMonitoring();

            status(
                "🛒 ADDED TO CART — CHECKOUT MANUALLY"
            );

        }, 300);

        return true;
    }

    function checkStock() {

        if (addedToCart) return;

        /*
         * Always check Add to Cart first.
         */
        if (clickAddToCart()) {
            return;
        }

        const text = getPageText();

        /*
         * Target verification.
         */
        if (detectVerification(text)) {

            status(
                "⚠️ TARGET VERIFICATION REQUIRED"
            );

            return;
        }

        /*
         * Out of stock.
         */
        if (detectOutOfStock(text)) {

            status(
                "🔴 OUT OF STOCK"
            );

            return;
        }

        /*
         * Product is still loading.
         */
        status(
            "🟡 CHECKING TARGET..."
        );
    }

    function stopMonitoring() {

        if (checkTimer) {
            clearInterval(checkTimer);
            checkTimer = null;
        }

        if (timeoutTimer) {
            clearTimeout(timeoutTimer);
            timeoutTimer = null;
        }

        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    function start() {

        createStatus();

        status(
            "🟡 Pokémon Target Monitor Active"
        );

        /*
         * Give Target a moment to render.
         */
        setTimeout(() => {

            checkStock();

        }, 1000);

        /*
         * Regular stock checks.
         */
        checkTimer = setInterval(() => {

            checkStock();

        }, CHECK_INTERVAL);

        /*
         * Prevent the checker from hanging forever.
         */
        timeoutTimer = setTimeout(() => {

            if (addedToCart) return;

            const button = findAddToCart();

            if (button) {
                clickAddToCart();
                return;
            }

            const text = getPageText();

            if (detectVerification(text)) {

                status(
                    "⚠️ TARGET VERIFICATION REQUIRED"
                );

                return;
            }

            if (detectOutOfStock(text)) {

                status(
                    "🔴 OUT OF STOCK"
                );

                return;
            }

            status(
                "🟠 TARGET PAGE TOOK TOO LONG TO LOAD"
            );

        }, MAX_LOADING_TIME);

        /*
         * Watch for Target dynamically adding
         * the Add to Cart button.
         */
        observer = new MutationObserver(() => {

            if (addedToCart) return;

            if (findAddToCart()) {
                clickAddToCart();
            }

        });

        observer.observe(
            document.documentElement,
            {
                childList: true,
                subtree: true
            }
        );
    }

    /*
     * Start once the page exists.
     */
    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start,
            { once: true }
        );

    } else {

        start();

    }

})();