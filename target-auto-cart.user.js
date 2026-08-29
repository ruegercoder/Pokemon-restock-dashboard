// ==UserScript==
// @name         Pokémon Target Auto Cart
// @namespace    pokemon-restock-dashboard
// @version      5.0.0
// @description  Target Pokémon Add-to-Cart monitor.
// @match        https://www.target.com/p/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    let addedToCart = false;
    let checking = false;

    const CHECK_INTERVAL = 1500;

    // --------------------------------------------------
    // STATUS BOX
    // --------------------------------------------------

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

        console.log("[Pokémon Target Monitor]", message);
    }

    // --------------------------------------------------
    // FIND ADD TO CART
    // --------------------------------------------------

    function findAddToCart() {

        const elements = document.querySelectorAll(
            "button, [role='button'], input[type='button'], input[type='submit']"
        );

        for (const element of elements) {

            if (!element || element.disabled) {
                continue;
            }

            const style =
                window.getComputedStyle(element);

            if (
                style.display === "none" ||
                style.visibility === "hidden"
            ) {
                continue;
            }

            const text = (
                element.innerText ||
                element.textContent ||
                element.value ||
                element.getAttribute("aria-label") ||
                ""
            )
                .trim()
                .replace(/\s+/g, " ")
                .toLowerCase();

            if (text === "add to cart") {
                return element;
            }

            if (
                text.includes("add to cart") &&
                !text.includes("remove")
            ) {
                return element;
            }
        }

        return null;
    }

    // --------------------------------------------------
    // CLICK ADD TO CART
    // --------------------------------------------------

    function addToCart(button) {

        if (addedToCart) return;

        addedToCart = true;

        status("🟢 ADD TO CART FOUND — CLICKING");

        console.log(
            "[Pokémon Target Monitor] Clicking:",
            button
        );

        try {
            button.scrollIntoView({
                behavior: "instant",
                block: "center"
            });
        } catch (e) {}

        setTimeout(() => {

            try {
                button.click();

                status(
                    "🛒 ADD TO CART CLICKED — CHECKOUT MANUALLY"
                );

            } catch (error) {

                console.error(error);

                addedToCart = false;

                status(
                    "⚠️ CLICK FAILED — RETRYING"
                );
            }

        }, 100);
    }

    // --------------------------------------------------
    // CHECK PAGE
    // --------------------------------------------------

    function checkPage() {

        if (addedToCart) return;

        if (checking) return;

        checking = true;

        try {

            const addButton =
                findAddToCart();

            // -----------------------------
            // ADD TO CART FOUND
            // -----------------------------

            if (addButton) {

                addToCart(addButton);

                return;
            }

            // -----------------------------
            // PAGE TEXT
            // -----------------------------

            const pageText = (
                document.body?.innerText ||
                ""
            )
                .replace(/\s+/g, " ")
                .toLowerCase();

            // -----------------------------
            // TARGET VERIFICATION
            // -----------------------------

            if (
                pageText.includes("captcha") ||
                pageText.includes("verify you are human") ||
                pageText.includes("robot or human") ||
                pageText.includes("access denied")
            ) {

                status(
                    "⚠️ TARGET VERIFICATION — WAITING"
                );

                return;
            }

            // -----------------------------
            // OUT OF STOCK
            // -----------------------------

            if (
                pageText.includes("out of stock") ||
                pageText.includes("sold out") ||
                pageText.includes("currently unavailable")
            ) {

                status(
                    "🔴 OUT OF STOCK — MONITORING"
                );

                return;
            }

            // -----------------------------
            // STILL LOADING
            // -----------------------------

            status(
                "🟡 MONITORING TARGET..."
            );

        } finally {

            checking = false;
        }
    }

    // --------------------------------------------------
    // MUTATION OBSERVER
    // --------------------------------------------------

    function watchPageChanges() {

        const observer =
            new MutationObserver(() => {

                if (!addedToCart) {
                    checkPage();
                }

            });

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: [
                    "disabled",
                    "aria-label",
                    "class"
                ]
            }
        );
    }

    // --------------------------------------------------
    // START
    // --------------------------------------------------

    function start() {

        createStatus();

        status(
            "🟡 Pokémon Target Monitor Active"
        );

        watchPageChanges();

        // Initial checks
        checkPage();

        // Backup polling
        setInterval(
            checkPage,
            CHECK_INTERVAL
        );
    }

    // --------------------------------------------------
    // WAIT FOR PAGE
    // --------------------------------------------------

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