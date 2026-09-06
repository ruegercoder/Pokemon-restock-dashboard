// ==UserScript==
// @name         Target Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.8.0
// @description  Target 30th Celebration ETB safe auto-add watcher
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

    function createStatusBox() {
        let box = document.getElementById("pokemon-target-status");

        if (!box) {
            box = document.createElement("div");
            box.id = "pokemon-target-status";

            box.style.cssText = `
                position:fixed;
                top:15px;
                left:50%;
                transform:translateX(-50%);
                z-index:999999;
                background:#111;
                color:#fff;
                padding:12px 18px;
                border-radius:14px;
                font-size:15px;
                font-weight:bold;
                font-family:Arial,sans-serif;
                text-align:center;
                box-shadow:0 4px 14px rgba(0,0,0,.25);
                max-width:92%;
                min-width:260px;
            `;

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(text) {
        createStatusBox().textContent = text;
    }

    function isCorrectURL() {
        return window.location.href
            .toLowerCase()
            .includes(TARGET_PRODUCT_ID.toLowerCase());
    }

    function findProductTitle() {
        return Array.from(
            document.querySelectorAll("h1")
        ).find(el => {

            const text = (
                el.innerText ||
                el.textContent ||
                ""
            ).toLowerCase();

            return REQUIRED_WORDS.every(word =>
                text.includes(word)
            );

        }) || null;
    }

    /*
     * HARD SOLD-OUT LOCK.
     *
     * Target currently shows "Sold out"
     * close to the ETB title.
     *
     * If that message exists, clicking is forbidden.
     */
    function mainProductIsSoldOut() {

        const title = findProductTitle();

        if (!title) {
            return true;
        }

        const titleY =
            title.getBoundingClientRect().top +
            window.scrollY;

        const elements = Array.from(
            document.querySelectorAll(
                "div, span, p"
            )
        );

        for (const el of elements) {

            const text = (
                el.innerText ||
                el.textContent ||
                ""
            )
                .trim()
                .toLowerCase();

            if (
                text !== "sold out" &&
                text !== "out of stock"
            ) {
                continue;
            }

            const y =
                el.getBoundingClientRect().top +
                window.scrollY;

            const distance =
                Math.abs(y - titleY);

            /*
             * Main product stock wording only.
             */
            if (distance < 650) {
                return true;
            }
        }

        return false;
    }

    function getVisibleAddToCartButtons() {

        return Array.from(
            document.querySelectorAll("button")
        ).filter(button => {

            const text = (
                button.innerText ||
                button.textContent ||
                ""
            )
                .trim()
                .toLowerCase();

            return (
                (
                    text === "add to cart" ||
                    text.startsWith("add to cart")
                ) &&
                button.offsetParent !== null
            );
        });
    }

    /*
     * Score evidence around a button.
     *
     * Strong preference is given to DOM areas
     * containing the actual ETB title.
     */
    function scoreButton(button) {

        let score = 0;
        let node = button;

        for (
            let depth = 0;
            depth < 10 && node;
            depth++
        ) {

            const text = (
                node.innerText ||
                node.textContent ||
                ""
            ).toLowerCase();

            if (
                text.includes("30th") &&
                text.includes("celebration")
            ) {
                score += 8;
            }

            if (
                text.includes(
                    "elite trainer box"
                )
            ) {
                score += 8;
            }

            if (
                text.includes("69.99")
            ) {
                score += 2;
            }

            if (
                text.includes("out of stock") ||
                text.includes("sold out")
            ) {
                score += 2;
            }

            node = node.parentElement;
        }

        return score;
    }

    /*
     * Locate ONLY the real main-product button.
     *
     * Recommendation buttons farther down the page
     * are rejected by both location and product evidence.
     */
    function findRealEtbButton() {

        const title = findProductTitle();

        if (!title) {
            return null;
        }

        const titleRect =
            title.getBoundingClientRect();

        const titleY =
            titleRect.top +
            window.scrollY;

        const buttons =
            getVisibleAddToCartButtons();

        const candidates =
            buttons.map(button => {

                const rect =
                    button.getBoundingClientRect();

                const buttonY =
                    rect.top +
                    window.scrollY;

                const distance =
                    buttonY - titleY;

                return {
                    button,
                    distance,
                    score: scoreButton(button)
                };

            }).filter(item => {

                /*
                 * Real Target purchase button is below
                 * the main title/product image.
                 *
                 * Buttons much farther down are likely
                 * recommendation products.
                 */
                return (
                    item.distance > 0 &&
                    item.distance < 2300
                );
            });

        if (!candidates.length) {
            return null;
        }

        candidates.sort((a, b) => {

            if (b.score !== a.score) {
                return b.score - a.score;
            }

            return a.distance - b.distance;
        });

        const best = candidates[0];

        /*
         * Refuse to act if another button has the
         * exact same score and nearly the same distance.
         */
        const ambiguous =
            candidates.slice(1).some(item => {

                return (
                    item.score === best.score &&
                    Math.abs(
                        item.distance -
                        best.distance
                    ) < 350
                );
            });

        if (ambiguous) {
            return null;
        }

        return best.button;
    }

    function checkStock() {

        /*
         * LOCK 1:
         * Must be exact product URL.
         */
        if (!isCorrectURL()) {

            alreadyClicked = false;

            setStatus(
                "⚪ WRONG PRODUCT — NOT ACTIVE"
            );

            return;
        }

        /*
         * LOCK 2:
         * Must find exact ETB title.
         */
        const title = findProductTitle();

        if (!title) {

            setStatus(
                "🔎 WAITING FOR TARGET PRODUCT"
            );

            return;
        }

        /*
         * LOCK 3:
         * Sold-out message forbids clicking.
         */
        if (mainProductIsSoldOut()) {

            alreadyClicked = false;

            setStatus(
                "🟡 SOLD OUT — WATCHING"
            );

            return;
        }

        /*
         * Find our already-tested real ETB button.
         */
        const button =
            findRealEtbButton();

        if (!button) {

            setStatus(
                "🟠 STOCK CHANGED — SAFE ETB BUTTON NOT CONFIRMED"
            );

            return;
        }

        /*
         * Disabled button = definitely don't click.
         */
        if (
            button.disabled ||
            button.getAttribute(
                "aria-disabled"
            ) === "true"
        ) {

            alreadyClicked = false;

            setStatus(
                "🟡 ETB BUTTON DISABLED — WATCHING"
            );

            return;
        }

        /*
         * LOCK 4:
         * Recheck sold-out status immediately
         * before the click.
         */
        if (mainProductIsSoldOut()) {

            alreadyClicked = false;

            setStatus(
                "🛑 CLICK BLOCKED — SOLD OUT"
            );

            return;
        }

        /*
         * LOCK 5:
         * Never click twice.
         */
        if (alreadyClicked) {

            setStatus(
                "✅ ETB ADD TO CART CLICK SENT"
            );

            return;
        }

        /*
         * FINAL BUTTON TEXT CHECK.
         */
        const buttonText = (
            button.innerText ||
            button.textContent ||
            ""
        )
            .trim()
            .toLowerCase();

        if (
            !buttonText.startsWith(
                "add to cart"
            )
        ) {

            setStatus(
                "🛑 CLICK BLOCKED — BUTTON CHANGED"
            );

            return;
        }

        /*
         * Everything passed.
         *
         * Click THIS exact verified button once.
         */
        alreadyClicked = true;

        setStatus(
            "🟢 ETB AVAILABLE — ADDING TO CART"
        );

        button.click();

        setTimeout(() => {

            setStatus(
                "✅ ETB ADD TO CART CLICK SENT"
            );

        }, 800);
    }

    createStatusBox();

    setStatus(
        "🔎 STARTING TARGET ETB WATCH"
    );

    setTimeout(
        checkStock,
        1000
    );

    setInterval(
        checkStock,
        CHECK_INTERVAL
    );

})();