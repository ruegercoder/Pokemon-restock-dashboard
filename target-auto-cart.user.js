// ==UserScript==
// @name         Pokémon Target Auto Add to Cart
// @namespace    pokemon-restock-dashboard
// @version      1.0.0
// @description  Automatically clicks Target's Add to Cart button when available.
// @match        https://www.target.com/p/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    const PRODUCT_URL_PART =
        "/p/pok-233-mon-trading-card-game-30th-celebration-elite-trainer-box/";

    let addedToCart = false;

    function isTargetProduct() {
        return window.location.pathname.includes(PRODUCT_URL_PART);
    }

    function findAddToCartButton() {
        const buttons = Array.from(document.querySelectorAll("button"));

        return buttons.find(button => {
            const text = (button.innerText || button.textContent || "")
                .trim()
                .toLowerCase();

            return (
                text.includes("add to cart") &&
                !button.disabled &&
                button.offsetParent !== null
            );
        });
    }

    function tryAddToCart() {
        if (addedToCart || !isTargetProduct()) {
            return;
        }

        const button = findAddToCartButton();

        if (!button) {
            return;
        }

        console.log("[Pokémon Target Monitor] Add to Cart found.");

        button.click();

        addedToCart = true;

        console.log(
            "[Pokémon Target Monitor] Add to Cart clicked. Manual checkout required."
        );

        showNotification();
    }

    function showNotification() {
        const notice = document.createElement("div");

        notice.textContent =
            "Pokémon found — Add to Cart clicked. Complete checkout manually.";

        notice.style.position = "fixed";
        notice.style.top = "20px";
        notice.style.left = "50%";
        notice.style.transform = "translateX(-50%)";
        notice.style.zIndex = "999999";
        notice.style.background = "#111";
        notice.style.color = "#fff";
        notice.style.padding = "14px 18px";
        notice.style.borderRadius = "12px";
        notice.style.fontSize = "15px";
        notice.style.fontWeight = "600";
        notice.style.boxShadow = "0 4px 20px rgba(0,0,0,.3)";

        document.body.appendChild(notice);

        setTimeout(() => {
            notice.remove();
        }, 8000);
    }

    function startMonitor() {
        console.log("[Pokémon Target Monitor] Running.");

        tryAddToCart();

        const observer = new MutationObserver(() => {
            tryAddToCart();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setInterval(() => {
            tryAddToCart();
        }, 2000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startMonitor);
    } else {
        startMonitor();
    }
})();