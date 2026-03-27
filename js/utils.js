/**
 * #region Utilities & Constants
 */

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
     * 格式化文章标题，移除扩展名
     * @param {string} title - 原始标题
     * @returns {string} 格式化后的标题
     */
    formatTitle(title) {
        return title ? title.replace(/\.md$/i, '') : '';
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
    slugify(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },

    /**
     * 去除 Markdown 中常见标记，提取纯文本
     * @param {string} markdown - Markdown 文本
     * @returns {string} 纯文本
     */
    stripMarkdown(markdown) {
        return String(markdown || '')
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`[^`]*`/g, ' ')
            .replace(/!\[[^\]]*]\(([^)]+)\)/g, ' ')
            .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1')
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/^>\s?/gm, '')
            .replace(/^[-*+]\s+/gm, '')
            .replace(/^\d+\.\s+/gm, '')
            .replace(/[*_~>#]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },

    /**
     * 解析 Front Matter
     * @param {string} rawText - 原始 Markdown
     * @returns {{ metadata: Record<string, any>, body: string }} 解析结果
     */
    extractFrontMatter(rawText) {
        const text = String(rawText || '').replace(/^\uFEFF/, '');

        if (!text.startsWith('---')) {
            return { metadata: {}, body: text };
        }

        const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

        if (!match) {
            return { metadata: {}, body: text };
        }

        const metadata = {};
        const metadataBlock = match[1];

        const parseScalar = (value) => {
            const trimmed = value.trim();

            if (!trimmed) {
                return '';
            }

            if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('\'') && trimmed.endsWith('\''))) {
                return trimmed.slice(1, -1);
            }

            if (trimmed === 'true') {
                return true;
            }

            if (trimmed === 'false') {
                return false;
            }

            if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
                return Number(trimmed);
            }

            return trimmed;
        };

        const parseArray = (value) => {
            const trimmed = value.trim();

            if (!trimmed) {
                return [];
            }

            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                return trimmed
                    .slice(1, -1)
                    .split(',')
                    .map(item => String(parseScalar(item)).trim())
                    .filter(Boolean);
            }

            return trimmed
                .split(',')
                .map(item => String(parseScalar(item)).trim())
                .filter(Boolean);
        };

        for (const line of metadataBlock.split(/\r?\n/)) {
            if (!line.trim() || line.trim().startsWith('#')) {
                continue;
            }

            const separatorIndex = line.indexOf(':');

            if (separatorIndex <= 0) {
                continue;
            }

            const key = line.slice(0, separatorIndex).trim();
            const rawValue = line.slice(separatorIndex + 1);
            const lowerKey = key.toLowerCase();

            if (lowerKey === 'tags' || lowerKey === 'keywords') {
                metadata[key] = parseArray(rawValue);
                continue;
            }

            metadata[key] = parseScalar(rawValue);
        }

        return {
            metadata,
            body: text.slice(match[0].length)
        };
    },

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
     * 初始化主题
     */
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeButton(savedTheme);
    },

    /**
     * 切换主题
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.body.classList.add('theme-transition');
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeButton(newTheme);

        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 300);
    },

    /**
     * 更新主题按钮状态
     * @param {string} theme - 当前主题
     */
    updateThemeButton(theme) {
        const button = document.getElementById('theme-toggle-btn');

        if (!button) {
            return;
        }

        const icon = button.querySelector('.icon');
        const text = button.querySelector('.text');

        if (theme === 'dark') {
            if (icon) {
                icon.innerText = '夜';
            }

            if (text) {
                text.innerText = '深色';
            }

            return;
        }

        if (icon) {
            icon.innerText = '日';
        }

        if (text) {
            text.innerText = '浅色';
        }
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
