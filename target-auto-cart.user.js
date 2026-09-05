// ==UserScript==
// @name         Target Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.6.1-test
// @description  Diagnostic test
// @match        https://www.target.com/p/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const box = document.createElement("div");
    box.textContent = "✅ USERSCRIPT 2.6.1 IS RUNNING";

    box.style.cssText = `
        position:fixed;
        top:15px;
        left:50%;
        transform:translateX(-50%);
        z-index:999999;
        background:#111;
        color:#fff;
        padding:14px 18px;
        border-radius:14px;
        font-size:16px;
        font-weight:bold;
    `;

    document.body.appendChild(box);
})();