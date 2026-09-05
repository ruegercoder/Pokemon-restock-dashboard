// ==UserScript==
// @name         Target Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.6
// @description  Watches Target Pokemon product pages, auto-clicks Add to Cart, and verifies cart success.
// @match        https://www.target.com/p/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const CHECK_INTERVAL = 1500;
    const VERIFY_TIMEOUT = 12000;

    let addClicked = false;
    let verifyingCart = false;

    function getStatusBox() {
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
                color: white;
                padding: 12px 18px;
                border-radius: 14px;
                font-family: Arial, sans-serif;
                font-size: 15px;
                font-weight: 700;
                text-align: center;
                box-shadow: 0 4px 14px rgba(0,0,0,.35);
                max-width: 90%;
            `;

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(message) {
        const box = getStatusBox();
        box.textContent = message;
        console.log("[Pokemon Auto Add]", message);
    }

    function visible(element) {
        if (!element) return false;

        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0
        );
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
                text.includes("add to cart") &&
                !button.disabled &&
                visible(button)
            );
        });
    }

    function pageLooksSoldOut() {
        const text = document.body.innerText.toLowerCase();

        return (
            text.includes("out of stock") ||
            text.includes("sold out") ||
            text.includes("currently unavailable")
        );
    }

    function cartSuccessDetected() {
        const bodyText = document.body.innerText.toLowerCase();

        // Target may change the button text after adding.
        const buttonTexts = Array.from(
            document.querySelectorAll("button")
        ).map(button =>
            (
                button.innerText ||
                button.textContent ||
                ""
            )
                .trim()
                .toLowerCase()
        );

        const successText =
            bodyText.includes("added to cart") ||
            bodyText.includes("added to your cart") ||
            bodyText.includes("view cart") ||
            bodyText.includes("go to cart");

        const successButton = buttonTexts.some(text =>
            text.includes("view cart") ||
            text.includes("go to cart") ||
            text.includes("added to cart")
        );

        return successText || successButton;
    }

    function verifyCart() {
        if (verifyingCart) return;

        verifyingCart = true;

        setStatus("🔵 ADD CLICKED — VERIFYING CART");

        const started = Date.now();

        const verifyTimer = setInterval(() => {
            if (cartSuccessDetected()) {
                clearInterval(verifyTimer);

                setStatus("✅ ADDED TO CART — READY TO BUY");

                console.log(
                    "[Pokemon Auto Add] Cart verification successful."
                );

                return;
            }

            if (Date.now() - started >= VERIFY_TIMEOUT) {
                clearInterval(verifyTimer);

                verifyingCart = false;
                addClicked = false;

                setStatus(
                    "🟠 CLICK SENT — CART NOT CONFIRMED"
                );

                console.log(
                    "[Pokemon Auto Add] Cart verification timed out."
                );
            }
        }, 500);
    }

    function attemptAdd() {
        if (addClicked || verifyingCart) {
            return;
        }

        const addButton = findAddToCartButton();

        if (addButton) {
            addClicked = true;

            setStatus("🟢 IN STOCK — ADDING TO CART");

            console.log(
                "[Pokemon Auto Add] Add to Cart button found:",
                addButton
            );

            addButton.click();

            setTimeout(verifyCart, 500);

            return;
        }

        if (pageLooksSoldOut()) {
            setStatus("🟡 SOLD OUT — WATCHING");
        } else {
            setStatus("🔎 WATCHING FOR STOCK");
        }
    }

    function startWatcher() {
        setStatus("🔎 TARGET WATCHER ACTIVE");

        attemptAdd();

        setInterval(attemptAdd, CHECK_INTERVAL);

        const observer = new MutationObserver(() => {
            attemptAdd();
        });

        observer.observe(document.body, {
    childList: true,
    subtree: true
});
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            startWatcher
        );
    } else {
        startWatcher();
    }
})();