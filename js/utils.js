/**
 * #region Utilities & Constants
 */

import { extractFrontMatter, slugify, stripMarkdown } from './text-utils.js';

export const AppUtils = {
    /**
     * 目录配置
     */
    TOC_CONFIG: {
        t1Level: 2,
        t2Level: 3,
        showSubLevel: true
    },

    /**
     * 对资源路径进行编码
     * @param {string} path - 资源路径
     * @returns {string} 编码后的路径
     */
    encodePath(path) {
        if (!path) {
            return '';
        }

        return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
    },

    /**
     * 生成可复用的 slug
     * @param {string} value - 原始文本
     * @returns {string} slug
     */
    slugify,

    /**
     * 去除 Markdown 中常见标记，提取纯文本
     * @param {string} markdown - Markdown 文本
     * @returns {string} 纯文本
     */
    stripMarkdown,

    /**
     * 解析 Front Matter
     * @param {string} rawText - 原始 Markdown
     * @returns {{ metadata: Record<string, any>, body: string }} 解析结果
     */
    extractFrontMatter,

    /**
     * 构建文章锚点分享链接
     * @param {string} anchorId - 标题锚点
     * @returns {string} 完整链接
     */
    buildAnchorUrl(anchorId) {
        const hash = window.location.hash || '#/';
        const routeWithQuery = hash.startsWith('#') ? hash.slice(1) : hash;
        const [routePath, queryString = ''] = routeWithQuery.split('?');
        const params = new URLSearchParams(queryString);

        if (anchorId) {
            params.set('anchor', anchorId);
        }

        const nextHash = `${routePath}?${params.toString()}`;
        return `${window.location.origin}${window.location.pathname}${window.location.search}#${nextHash}`;
    },

    /**
     * 复制代码块内容
     * @param {HTMLElement} button - 复制按钮
     */
    copyCode(button) {
        const wrapper = button?.closest('.code-block-wrapper');
        const code = wrapper?.querySelector('code')?.innerText || '';

        navigator.clipboard.writeText(code).then(() => {
            const originalText = button.innerText;
            button.innerText = '已复制';
            button.classList.add('copied');

            setTimeout(() => {
                button.innerText = originalText;
                button.classList.remove('copied');
            }, 2000);
        }).catch(error => {
            console.error('复制代码失败：', error);
            button.innerText = '失败';
        });
    },

    /**
     * 复制标题锚点链接
     * @param {string} anchorId - 标题锚点
     * @param {HTMLElement} button - 触发按钮
     */
    copyAnchorLink(anchorId, button) {
        const url = this.buildAnchorUrl(anchorId);

        navigator.clipboard.writeText(url).then(() => {
            if (!button) {
                return;
            }

            const originalText = button.innerText;
            button.innerText = '已复制';
            button.classList.add('copied');

            setTimeout(() => {
                button.innerText = originalText;
                button.classList.remove('copied');
            }, 1800);
        }).catch(error => {
            console.error('复制锚点链接失败：', error);
        });
    },

    /**
     * 平滑滚动到顶部
     */
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
};

window.AppUtils = AppUtils;

/**
 * #endregion
 */
