/**
 * #region Markdown Service
 */

import { AppUtils } from './utils.js';

export const MarkdownService = {
    /**
     * 解析 Markdown 内容并提取目录
     */
    parse(text) {
        const tocItems = [];
        const renderer = new marked.Renderer();

        // 处理自定义容器标签 (:::info, :::warning, :::danger)
        const processCustomBlocks = (content) => {
            const blockRegex = /:::(info|warning|danger)\s*[\r\n]+([\s\S]*?)[\r\n]+:::/g;

            return content.replace(blockRegex, (match, type, innerContent) => {
                const parsedInner = marked.parse(innerContent.trim());
                return `<div class="custom-block ${type}">
                    <div class="custom-block-content">${parsedInner}</div>
                </div>`;
            });
        };

        const processedText = processCustomBlocks(text);

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

            const cleanText = titleText.replace(/\*\*|\*|__/g, '');
            const id = cleanText.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');

            const { t1Level: minLevel, t2Level: maxLevel, showSubLevel } = AppUtils.TOC_CONFIG;

            const isWithinRange = level >= minLevel && level <= maxLevel;
            const isLevelAllowed = level === minLevel || showSubLevel;

            if (isWithinRange && isLevelAllowed) {
                const relativeLevel = level - minLevel + 1;
                tocItems.push({ id, text: cleanText, level: relativeLevel });
            }

            const htmlText = marked.parseInline(titleText);
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
                        const cleanText = token.text.replace(/\*\*|\*|__/g, '');
                        const id = cleanText.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
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
