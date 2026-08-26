// ==UserScript==
// @name         Pokémon Target Auto Cart
// @namespace    pokemon-restock-dashboard
// @version      4.0.0
// @description  Lightweight Target Pokémon stock monitor.
// @match        https://www.target.com/p/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    let addedToCart = false;
    let timer = null;

    const CHECK_INTERVAL = 2000;

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
            pointerEvents: "none"
        });

        document.body.appendChild(box);
    }

    function status(message) {
        createStatus();

        const box =
            document.getElementById("pokemon-target-status");

        if (box) {
            box.textContent = message;
        }

        console.log(
            "[Pokémon Target Monitor]",
            message
        );
    }

    function findAddToCart() {

        const buttons =
            document.querySelectorAll(
                "button, [role='button']"
            );

        for (const button of buttons) {

            const text = (
                button.innerText ||
                button.textContent ||
                button.getAttribute("aria-label") ||
                ""
            )
            .trim()
            .toLowerCase();

            if (
                text.includes("add to cart") &&
                !button.disabled &&
                button.offsetParent !== null
            ) {
                return button;
            }
        }

        return null;
    }

    function checkStock() {

        if (addedToCart) return;

        const addButton =
            findAddToCart();

        /*
         * IN STOCK
         */
        if (addButton) {

            status(
                "🟢 IN STOCK — ADD TO CART FOUND"
            );

            clearInterval(timer);

            setTimeout(() => {

                if (addedToCart) return;

                const button =
                    findAddToCart();

                if (!button) {
                    startChecking();
                    return;
                }

                button.click();

                addedToCart = true;

                status(
                    "🛒 ADDED TO CART — CHECKOUT MANUALLY"
                );

            }, 300);

            return;
        }

        const text = (
            document.body?.innerText ||
            ""
        )
        .replace(/\s+/g, " ")
        .toLowerCase();

        /*
         * TARGET VERIFICATION
         */
        if (
            text.includes("captcha") ||
            text.includes("verify you are human") ||
            text.includes("robot or human")
        ) {

            status(
                "⚠️ TARGET VERIFICATION"
            );

            return;
        }

        /*
         * OUT OF STOCK
         */
        if (
            text.includes("out of stock") ||
            text.includes("sold out") ||
            text.includes("currently unavailable") ||
            text.includes("not available")
        ) {

            status(
                "🔴 OUT OF STOCK"
            );

            return;
        }

        /*
         * PAGE IS LOADED BUT BUTTON
         * HAS NOT APPEARED YET.
         */
        status(
            "🟡 CHECKING TARGET..."
        );
    }

    function startChecking() {

        if (timer) {
            clearInterval(timer);
        }

        timer = setInterval(
            checkStock,
            CHECK_INTERVAL
        );
    }

    function start() {

        createStatus();

        status(
            "🟡 Pokémon Target Monitor Active"
        );

        /*
         * Wait for Target to finish rendering.
         */
        setTimeout(() => {

            checkStock();
            startChecking();

        }, 1500);
    }

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