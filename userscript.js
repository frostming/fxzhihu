// ==UserScript==
// @name         Zhihu Link Fixer
// @namespace    http://tampermonkey.net/
// @version      0.1
// @author       Frost Ming
// @license      MIT
// @description  Adds a button beside Zhihu answer links to open them in FxZhihu
// @match        https://www.zhihu.com/*
// @match        https://zhuanlan.zhihu.com/*
// @grant        none
// @icon         https://cdn.jsdelivr.net/gh/frostming/fxzhihu_bot/zhihu.webp
// ==/UserScript==

function createFxZhihuButton(link) {
    const button = document.createElement('a');
    button.textContent = '复制预览链接';
    button.className = 'fxzhihu-button';
    button.style.cssText = `
        margin-left: 10px;
        padding: 2px;
        background-color: #0084ff;
        text-align: center;
        color: white;
        min-width: 82px;
        border-radius: 3px;
        font-size: 12px;
        text-decoration: none;
        transition: all 0.3s ease;
    `;
    button.addEventListener('click', (e) => {
        e.preventDefault();
        navigator.clipboard.writeText(link.replace('.zhihu.com', '.fxzhihu.com'));
        button.textContent = '已复制';
        setTimeout(() => {
            button.textContent = '复制预览链接';
        }, 1000);
    });
    button.href = 'javascript:void(0)';
    return button;
}

(function() {
    'use strict';

    function addFxZhihuButton() {
        const answerItems = target.querySelectorAll('.ContentItem.AnswerItem');
        answerItems.forEach(item => {
            if (item.querySelector('.fxzhihu-button')) return;

            let link = item.querySelector('.ContentItem-title a');
            if (!link) {
                link = item.querySelector('.ContentItem-time a');
            }
            const actions = item.querySelector('.ContentItem-actions');
            actions.insertBefore(createFxZhihuButton(link.href), actions.firstChild.nextSibling);
        });
    }

    if (window.location.hostname.startsWith('zhuanlan.zhihu.com')) {
        const actions = document.querySelector('.ContentItem-actions');
        actions.insertBefore(createFxZhihuButton(window.location.href), actions.firstChild.nextSibling);
        return;
    }

    const target = document.querySelector('.ListShortcut');
    if (!target) {
        return;
    }
    // Run the function initially
    addFxZhihuButton();

    // Create a MutationObserver to watch for changes in the DOM
    const observer = new MutationObserver(addFxZhihuButton);

    // Start observing the document with the configured parameters
    observer.observe(target, { childList: true, subtree: true });
})();
