/**
 * #region Markdown Service
 */

import { AppUtils } from './utils.js';

export const MarkdownService = {
    /**
     * 解析 Markdown 内容并提取目录
     * 标签示例
     * :::info 这里是标签标题
     * 这里是标签内容
     * :::
     */
    parse(text) {
        const tocItems = [];
        const renderer = new marked.Renderer();

        // #region 处理自定义容器标签 (:::info, :::warning, :::danger, :::hint, :::abstract)
        /**
         * 处理自定义容器标签，支持 info, warning, danger, hint, abstract
         * @param {string} content - Markdown 内容
         * @returns {string} 处理后的 HTML
         */
        const processCustomBlocks = (content) => {
            // #region 优化：添加对 abstract 标签的支持，并支持可选标题
            const blockRegex = /:::(info|warning|danger|hint|abstract)(?:[ \t]+(.*))?[\r\n]+([\s\S]*?)[\r\n]+:::/g;

            return content.replace(blockRegex, (match, type, title, innerContent) => {
                const parsedInner = marked.parse(innerContent.trim());
                // 如果没有提供标题，则根据类型设置默认标题
                const displayTitle = title ? title.trim() : {
                    'info': '',
                    'warning': '',
                    'danger': '',
                    'hint': '',
                    'abstract': ''
                }[type];

                return `<div class="custom-block ${type}">
                    <p class="custom-block-title">${displayTitle}</p>
                    <div class="custom-block-content">${parsedInner}</div>
                </div>`;
            });
            // #endregion
        };
        // #endregion

        const processedText = processCustomBlocks(text);
        
        // #region 辅助方法：转义 HTML 特殊字符
        /**
         * 转义 HTML 特殊字符，防止 XSS 和渲染问题
         * @param {string} html - 待转义的字符串
         * @returns {string} 转义后的字符串
         */
        const escapeHtml = (html) => {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return html.replace(/[&<>"']/g, (m) => map[m]);
        };
        // #endregion

        // #region 自定义代码块渲染
        /**
         * 自定义代码块渲染，添加代码块头部信息
         * @param {string|object} arg1 - 代码内容或 Token 对象
         * @param {string} arg2 - 语言标识
         * @returns {string} 处理后的 HTML
         */
        renderer.code = function (arg1, arg2) {
            let code = '';
            let language = '';

            if (arg1 && typeof arg1 === 'object') {
                code = arg1.text || '';
                language = arg1.lang || '';
            } else {
                code = arg1 || '';
                language = arg2 || '';
            }

            const lang = language || 'text';
            // 修复：对代码内容进行 HTML 转义，解决 <set> 等标签不显示的问题
            const escapedCode = escapeHtml(code);
            
            // 优化：返回带有包装容器和头部信息的代码块 HTML
            return `<div class="code-block-wrapper">
                        <div class="code-block-header">
                            <span class="code-block-lang">${lang}</span>
                            <span class="code-block-copy" onclick="AppUtils.copyCode(this)">复制</span>
                        </div>
                        <pre><code class="language-${lang}">${escapedCode}</code></pre>
                    </div>`;
        };
        // #endregion

        renderer.heading = function (arg1, arg2) {
            let titleText = '';
            let level = 1;

            if (arg1 && typeof arg1 === 'object') {
                titleText = arg1.text || '';
                level = arg1.depth || 1;
            } else {
                titleText = arg1 || '';
                level = arg2 || 1;
            }

            const cleanText = titleText.replace(/\*\*|\*|__|~~/g, '');
            const id = cleanText.toLowerCase().trim().replace(/[^\w\u4e00-\u9fa5]+/g, '-');

            const { t1Level: minLevel, t2Level: maxLevel, showSubLevel } = AppUtils.TOC_CONFIG;

            const isWithinRange = level >= minLevel && level <= maxLevel;
            const isLevelAllowed = level === minLevel || showSubLevel;

            if (isWithinRange && isLevelAllowed) {
                const relativeLevel = level - minLevel + 1;
                tocItems.push({ id, text: cleanText, level: relativeLevel });
            }

            const htmlText = marked.parseInline(titleText, { gfm: true });
            return `<h${level} id="${id}">${htmlText}</h${level}>`;
        };

        const htmlContent = marked.parse(processedText, {
            renderer: renderer,
            breaks: true,
            gfm: true,
            async: false
        });

        // 兜底逻辑
        if (tocItems.length === 0) {
            const tokens = marked.lexer(processedText);
            const { t1Level: minLevel, t2Level: maxLevel, showSubLevel } = AppUtils.TOC_CONFIG;

            tokens.forEach(token => {
                if (token.type === 'heading') {
                    const level = token.depth;
                    const isWithinRange = level >= minLevel && level <= maxLevel;
                    const isLevelAllowed = level === minLevel || showSubLevel;

                    if (isWithinRange && isLevelAllowed) {
                        const cleanText = token.text.replace(/\*\*|\*|__|~~/g, '');
                        const id = cleanText.toLowerCase().trim().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
                        const relativeLevel = level - minLevel + 1;
                        tocItems.push({ id, text: cleanText, level: relativeLevel });
                    }
                }
            });
        }

        return { htmlContent, tocItems };
    },

    /**
     * 高亮代码块
     */
    highlightCode() {
        Vue.nextTick(() => {
            document.querySelectorAll('pre code').forEach((el) => {
                if (!el.className) {
                    el.classList.add('language-csharp');
                }
                hljs.highlightElement(el);
            });
        });
    }
};

/**
 * #endregion
 */
