/**
 * #region Services
 */

import { AppUtils } from './utils.js';
import { BLOG_ARTICLES } from './modules_data.js';

function escapeHtml(html) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#039;'
    };

    return String(html || '').replace(/[&<>"']/g, match => map[match]);
}

const knownSiteRoutes = new Set(['/', '/article', '/list', '/search', '/archive', '/tags', '/series', '/about']);
const articleAliasMap = new Map();

for (const article of BLOG_ARTICLES || []) {
    const fileName = String(article.path || '').split('/').pop() || '';
    const baseName = fileName.replace(/\.md$/i, '');
    const title = String(article.title || '').trim();

    if (baseName && !articleAliasMap.has(baseName)) {
        articleAliasMap.set(baseName, article.path);
    }

    if (title && !articleAliasMap.has(title)) {
        articleAliasMap.set(title, article.path);
    }
}

function createArticleRouteHref(articlePath, anchor = '') {
    const searchParams = new URLSearchParams();
    searchParams.set('path', articlePath);

    if (anchor) {
        searchParams.set('anchor', anchor);
    }

    return `#/article?${searchParams.toString()}`;
}

function resolveInternalSiteLink(target) {
    const trimmedTarget = String(target || '').trim();

    if (!trimmedTarget.startsWith('/')) {
        return '';
    }

    const [pathPart, hashPart = ''] = trimmedTarget.split('#');
    const routePath = pathPart.split('?')[0] || '/';

    if (knownSiteRoutes.has(routePath)) {
        return routePath === '/' ? '#/' : `#${pathPart}${hashPart ? `#${hashPart}` : ''}`;
    }

    const articleAlias = pathPart.replace(/^\/+/, '').replace(/\.md$/i, '').trim();
    const articlePath = articleAliasMap.get(articleAlias);

    if (!articlePath) {
        return '';
    }

    return createArticleRouteHref(articlePath, hashPart);
}

export const MarkdownService = {
    /**
     * 解析 Markdown 内容并提取目录
     * @param {string} text - 原始 Markdown
     * @param {string} resourcePath - 当前内容资源路径
     * @returns {{ htmlContent: string, tocItems: Array, metadata: Record<string, any>, body: string }} 解析结果
     */
    parse(text, resourcePath = '') {
        const { metadata, body } = AppUtils.extractFrontMatter(text);
        const tocItems = [];
        const renderer = new marked.Renderer();

        const resolveRelativeMarkdownLinks = (content) => {
            if (!resourcePath) {
                return content;
            }

            const baseSegments = resourcePath.split('/').slice(0, -1);

            const resolveTarget = (target) => {
                if (!target || /^https?:\/\//i.test(target) || /^mailto:/i.test(target) || target.startsWith('#')) {
                    return target;
                }

                const internalSiteLink = resolveInternalSiteLink(target);
                if (internalSiteLink) {
                    return internalSiteLink;
                }

                const [pathPart, hashPart = ''] = target.split('#');
                const sameDirectorySegments = [...baseSegments, pathPart].filter(Boolean);
                const normalizedSegments = [];

                for (const segment of sameDirectorySegments) {
                    if (segment === '.' || segment === '') {
                        continue;
                    }

                    if (segment === '..') {
                        normalizedSegments.pop();
                        continue;
                    }

                    normalizedSegments.push(segment);
                }

                const normalizedPath = normalizedSegments.join('/');
                const assetFallbackPath = `Resources/Assets/${pathPart.split('/').pop()}`;
                const isLikelyAssetShortName = !pathPart.includes('/') && /\.(png|jpg|jpeg|gif|svg|webp|pdf)$/i.test(pathPart);
                const finalPath = isLikelyAssetShortName ? assetFallbackPath : normalizedPath;

                return hashPart ? `${finalPath}#${hashPart}` : finalPath;
            };

            return content.replace(/(!?\[[^\]]*]\()([^)]+)(\))/g, (match, prefix, target, suffix) => {
                return `${prefix}${resolveTarget(target.trim())}${suffix}`;
            });
        };

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

            const normalizedLanguage = String(language || '').trim().toLowerCase();
            const lang = normalizedLanguage || 'text';
            const escapedCode = escapeHtml(code);

            if (normalizedLanguage === 'mermaid') {
                return `<div class="mermaid-wrapper" data-mermaid-source="${escapedCode}">
                            <div class="mermaid-diagram"></div>
                        </div>`;
            }

            return `<div class="code-block-wrapper">
                        <div class="code-block-header">
                            <span class="code-block-lang">${lang}</span>
                            <span class="code-block-copy" onclick="AppUtils.copyCode(this)">复制</span>
                        </div>
                        <pre><code class="language-${lang}">${escapedCode}</code></pre>
                    </div>`;
        };

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
            const id = AppUtils.slugify(cleanText);
            const { t1Level: minLevel, t2Level: maxLevel, showSubLevel } = AppUtils.TOC_CONFIG;
            const isWithinRange = level >= minLevel && level <= maxLevel;
            const isLevelAllowed = level === minLevel || showSubLevel;

            if (isWithinRange && isLevelAllowed) {
                const relativeLevel = level - minLevel + 1;
                tocItems.push({ id, text: cleanText, level: relativeLevel });
            }

            const htmlText = marked.parseInline(titleText, { gfm: true });
            const anchorButton = `<button class="heading-anchor" type="button" onclick="AppUtils.copyAnchorLink('${id}', this)" aria-label="复制标题链接">#</button>`;
            return `<h${level} id="${id}">${htmlText}${anchorButton}</h${level}>`;
        };

        /**
         * 统一解析 Markdown 片段，确保正文和自定义块内部使用相同的 renderer。
         * @param {string} content - 要解析的 Markdown 文本
         * @returns {string}
         */
        const parseMarkdownFragment = (content) => marked.parse(content, {
            renderer,
            breaks: true,
            gfm: true,
            async: false
        });

        const processCustomBlocks = (content) => {
            const blockRegex = /:::(info|warning|danger|hint|abstract|ref|summary|updates)(?:[ \t]+(.*))?[\r\n]+([\s\S]*?)[\r\n]+:::/g;

            return content.replace(blockRegex, (match, type, title, innerContent) => {
                const parsedInner = parseMarkdownFragment(innerContent.trim());
                const displayTitle = title ? title.trim() : {
                    info: '',
                    warning: '',
                    danger: '',
                    hint: '',
                    abstract: '',
                    ref: '引用',
                    summary: '摘要',
                    updates: '更新记录'
                }[type];

                return `<div class="custom-block ${type}">
                    <p class="custom-block-title">${displayTitle}</p>
                    <div class="custom-block-content">${parsedInner}</div>
                </div>`;
            });
        };

        const processedText = processCustomBlocks(resolveRelativeMarkdownLinks(body));

        const htmlContent = parseMarkdownFragment(processedText);

        if (tocItems.length === 0) {
            const tokens = marked.lexer(processedText);
            const { t1Level: minLevel, t2Level: maxLevel, showSubLevel } = AppUtils.TOC_CONFIG;

            for (const token of tokens) {
                if (token.type !== 'heading') {
                    continue;
                }

                const level = token.depth;
                const isWithinRange = level >= minLevel && level <= maxLevel;
                const isLevelAllowed = level === minLevel || showSubLevel;

                if (!isWithinRange || !isLevelAllowed) {
                    continue;
                }

                const cleanText = token.text.replace(/\*\*|\*|__|~~/g, '');
                const id = AppUtils.slugify(cleanText);
                const relativeLevel = level - minLevel + 1;
                tocItems.push({ id, text: cleanText, level: relativeLevel });
            }
        }

        return { htmlContent, tocItems, metadata, body };
    },

    /**
     * 代码高亮
     */
    highlightCode() {
        Vue.nextTick(() => {
            document.querySelectorAll('pre code').forEach(element => {
                if (!element.className) {
                    element.classList.add('language-text');
                }

                hljs.highlightElement(element);
            });
        });
    },

    /**
     * 渲染页面中的 Mermaid 图表。
     * 当 Mermaid 运行失败时，回退为可读的源码展示，避免文章内容完全丢失。
     */
    renderMermaid() {
        Vue.nextTick(async () => {
            const mermaidWrappers = [...document.querySelectorAll('.mermaid-wrapper')];

            if (mermaidWrappers.length === 0) {
                return;
            }

            if (!window.mermaid) {
                mermaidWrappers.forEach(wrapper => {
                    const source = wrapper.getAttribute('data-mermaid-source') || '';
                    wrapper.classList.add('is-error');
                    wrapper.innerHTML = `<p class="mermaid-error-title">Mermaid 运行时未加载，无法渲染图表。</p>
                        <pre class="mermaid-source-code"><code>${source}</code></pre>`;
                });
                return;
            }

            const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';

            window.mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'loose',
                theme: isDarkTheme ? 'dark' : 'default'
            });

            for (let index = 0; index < mermaidWrappers.length; index += 1) {
                const wrapper = mermaidWrappers[index];
                const diagramHost = wrapper.querySelector('.mermaid-diagram');
                const source = wrapper.getAttribute('data-mermaid-source') || '';

                if (!diagramHost || !source) {
                    continue;
                }

                try {
                    const renderId = `mermaid-diagram-${Date.now()}-${index}`;
                    const { svg, bindFunctions } = await window.mermaid.render(renderId, source);

                    wrapper.classList.remove('is-error');
                    diagramHost.innerHTML = svg;

                    if (typeof bindFunctions === 'function') {
                        bindFunctions(diagramHost);
                    }
                } catch (error) {
                    console.error('Mermaid 图表渲染失败：', error);
                    wrapper.classList.add('is-error');
                    wrapper.innerHTML = `<p class="mermaid-error-title">Mermaid 图表渲染失败，请检查语法。</p>
                        <pre class="mermaid-source-code"><code>${source}</code></pre>`;
                }
            }
        });
    }
};

export const SeoService = {
    /**
     * 更新页面元信息
     * @param {{ title?: string, description?: string, keywords?: string[], image?: string, url?: string, type?: string }} payload - 元信息
     */
    updateMeta(payload) {
        const title = payload.title || '开发日志';
        const description = payload.description || '个人技术博客';
        const keywords = (payload.keywords || []).join(', ');
        const image = payload.image || '';
        const url = payload.url || window.location.href;
        const type = payload.type || 'website';

        document.title = title;

        const updateTag = (selector, attributeName, value) => {
            let element = document.head.querySelector(selector);

            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attributeName, selector.includes('property=') ? selector.match(/property="([^"]+)"/)?.[1] || '' : selector.match(/name="([^"]+)"/)?.[1] || '');
                document.head.appendChild(element);
            }

            element.setAttribute('content', value);
        };

        updateTag('meta[name="description"]', 'name', description);
        updateTag('meta[name="keywords"]', 'name', keywords);
        updateTag('meta[property="og:title"]', 'property', title);
        updateTag('meta[property="og:description"]', 'property', description);
        updateTag('meta[property="og:url"]', 'property', url);
        updateTag('meta[property="og:type"]', 'property', type);

        if (image) {
            updateTag('meta[property="og:image"]', 'property', image);
        }
    }
};

/**
 * #endregion
 */
