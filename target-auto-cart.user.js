// ==UserScript==
// @name         Pokémon Target Auto Cart
// @namespace    pokemon-restock-dashboard
// @version      7.0.0
// @description  Lightweight Target Pokémon Add-to-Cart monitor.
// @match        https://www.target.com/p/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    let addedToCart = false;
    let checkTimer = null;
    let observer = null;

    const CHECK_INTERVAL = 2000;

    function createStatus() {

        if (document.getElementById("pokemon-target-status")) {
            return;
        }

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
            padding: "10px 16px",
            borderRadius: "12px",
            fontFamily: "Arial,sans-serif",
            fontSize: "14px",
            fontWeight: "700",
            boxShadow: "0 4px 16px rgba(0,0,0,.3)",
            textAlign: "center",
            pointerEvents: "none"
        });

        document.body.appendChild(box);
    }

    function status(message) {

        createStatus();

        const box =
            document.getElementById(
                "pokemon-target-status"
            );

        if (box) {
            box.textContent = message;
        }

        console.log(
            "[Pokémon Target]",
            message
        );
    }

    function findAddToCart() {

        const buttons =
            document.querySelectorAll(
                "button"
            );

        for (const button of buttons) {

            if (button.disabled) {
                continue;
            }

            const text = (
                button.innerText ||
                button.textContent ||
                button.getAttribute("aria-label") ||
                ""
            )
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();

            if (
                text.includes("add to cart") &&
                button.offsetParent !== null
            ) {
                return button;
            }
        }

        return null;
    }

    function checkStock() {

        if (addedToCart) {
            return;
        }

        const button =
            findAddToCart();

        if (button) {

            addedToCart = true;

            status(
                "🟢 ADD TO CART FOUND — CLICKING"
            );

            setTimeout(function () {

                try {

                    button.click();

                    status(
                        "🛒 ADDED TO CART — CHECKOUT MANUALLY"
                    );

                } catch (error) {

                    console.error(
                        "[Pokémon Target]",
                        error
                    );

                    addedToCart = false;

                    status(
                        "⚠️ CLICK FAILED — RETRYING"
                    );
                }

            }, 100);

            return;
        }

        const text =
            document.body?.innerText
                ?.replace(/\s+/g, " ")
                .toLowerCase() || "";

        if (
            text.includes("verify you are human") ||
            text.includes("robot or human") ||
            text.includes("captcha")
        ) {

            status(
                "⚠️ TARGET VERIFICATION"
            );

            return;
        }

        if (
            text.includes("out of stock") ||
            text.includes("sold out") ||
            text.includes("currently unavailable")
        ) {

            status(
                "🔴 OUT OF STOCK"
            );

            return;
        }

        status(
            "🟡 CHECKING STOCK..."
        );
    }

    function startObserver() {

        observer =
            new MutationObserver(function (
                mutations
            ) {

                if (addedToCart) {
                    return;
                }

                /*
                 * Only react when Target adds
                 * new elements.
                 */

                for (const mutation of mutations) {

                    if (
                        mutation.addedNodes &&
                        mutation.addedNodes.length
                    ) {

                        checkStock();

                        break;
                    }
                }

            });

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );
    }

    function start() {

        createStatus();

        status(
            "🟡 TARGET MONITOR ACTIVE"
        );

        /*
         * Initial check.
         */

        checkStock();

        /*
         * Lightweight backup polling.
         */

        checkTimer =
            setInterval(
                checkStock,
                CHECK_INTERVAL
            );

        /*
         * Watch only for newly added
         * elements — NOT every attribute.
         */

        startObserver();
    }

    /*
     * Don't start until the page has
     * a body.
     */

    if (document.body) {

        start();

    } else {

        const wait =
            setInterval(function () {

                if (document.body) {

                    clearInterval(wait);

                    start();
                }

            }, 100);
    }

})();