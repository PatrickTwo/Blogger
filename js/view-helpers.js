/**
 * #region 视图共享辅助
 * 这里集中放页面共用的查询、跳转和 Markdown 加载逻辑，避免散落在各个视图里重复实现。
 */

import { BLOG_ARTICLES, BLOG_TAGS, BLOG_SERIES } from './modules_data.js';
import { MarkdownService } from './services.js';
import { AppUtils } from './utils.js';

const { ref, watch } = Vue;

const ARTICLE_MAP = new Map((BLOG_ARTICLES || []).map(article => [article.path, article]));
const TAG_MAP = new Map((BLOG_TAGS || []).map(tag => [tag.slug, tag]));
const SERIES_MAP = new Map((BLOG_SERIES || []).map(series => [series.slug, series]));

/**
 * 规范化搜索关键词，确保搜索逻辑一致。
 * @param {string} keyword - 搜索词
 * @returns {string}
 */
export function normalizeSearchKeyword(keyword) {
    return String(keyword || '').trim().toLowerCase();
}

/**
 * 根据文章路径查找文章。
 * @param {string} articlePath - 文章路径
 * @returns {Record<string, any> | null}
 */
export function findArticleByPath(articlePath) {
    return ARTICLE_MAP.get(articlePath) || null;
}

/**
 * 根据路径列表查找文章列表。
 * @param {string[]} paths - 路径列表
 * @returns {Record<string, any>[]}
 */
export function findArticlesByPaths(paths) {
    return (paths || []).map(path => findArticleByPath(path)).filter(Boolean);
}

/**
 * 根据关键词在文章数据中做前端搜索。
 * @param {string} keyword - 搜索词
 * @returns {Record<string, any>[]}
 */
export function findArticlesByKeyword(keyword) {
    const normalizedKeyword = normalizeSearchKeyword(keyword);

    if (!normalizedKeyword) {
        return [];
    }

    return (BLOG_ARTICLES || []).filter(article => {
        const searchableText = [
            article.title,
            article.summary,
            article.category,
            article.subcategory,
            article.series,
            ...(article.tags || [])
        ].join(' ').toLowerCase();

        return searchableText.includes(normalizedKeyword);
    });
}

/**
 * 根据标签 slug 查找标签。
 * @param {string} tagSlug - 标签 slug
 * @returns {Record<string, any> | null}
 */
export function findTagBySlug(tagSlug) {
    return TAG_MAP.get(tagSlug) || null;
}

/**
 * 根据系列 slug 查找系列。
 * @param {string} seriesSlug - 系列 slug
 * @returns {Record<string, any> | null}
 */
export function findSeriesBySlug(seriesSlug) {
    return SERIES_MAP.get(seriesSlug) || null;
}

/**
 * 根据标签名查找标签实体。
 * @param {string} tagName - 标签名
 * @returns {Record<string, any> | null}
 */
export function findTagByName(tagName) {
    return (BLOG_TAGS || []).find(tag => tag.name === tagName) || null;
}

/**
 * 跳转到文章页。
 * @param {import('vue-router').Router} router - 路由实例
 * @param {Record<string, any>} article - 文章数据
 * @param {string} anchor - 标题锚点
 */
export function navigateToArticle(router, article, anchor = '') {
    const query = { path: article.path };

    if (anchor) {
        query.anchor = anchor;
    }

    router.push({
        name: 'article',
        query
    });
}

/**
 * 跳转到标签页。
 * @param {import('vue-router').Router} router - 路由实例
 * @param {string} tagSlug - 标签 slug
 */
export function navigateToTag(router, tagSlug) {
    router.push({
        name: 'tags',
        query: { tag: tagSlug }
    });
}

/**
 * 跳转到系列页。
 * @param {import('vue-router').Router} router - 路由实例
 * @param {string} seriesSlug - 系列 slug
 */
export function navigateToSeries(router, seriesSlug) {
    router.push({
        name: 'series',
        query: { slug: seriesSlug }
    });
}

/**
 * 组装文章卡片元信息。
 * @param {Record<string, any>} article - 文章数据
 * @returns {string}
 */
export function buildArticleCardMeta(article) {
    const parts = [article.category];

    if (article.subcategory) {
        parts.push(article.subcategory);
    }

    parts.push(article.displayUpdatedAt || article.displayDate);
    parts.push(`${article.readMinutes} 分钟阅读`);

    return parts.filter(Boolean).join(' / ');
}

/**
 * 按指定方式排序文章。
 * @param {Record<string, any>[]} articles - 文章列表
 * @param {string} sortType - 排序方式
 * @returns {Record<string, any>[]}
 */
export function sortArticles(articles, sortType) {
    const nextArticles = [...articles];

    switch (sortType) {
        case 'updated-asc':
            nextArticles.sort((left, right) => left.updatedAt.localeCompare(right.updatedAt));
            return nextArticles;
        case 'title-asc':
            nextArticles.sort((left, right) => left.title.localeCompare(right.title, 'zh-CN'));
            return nextArticles;
        case 'title-desc':
            nextArticles.sort((left, right) => right.title.localeCompare(left.title, 'zh-CN'));
            return nextArticles;
        default:
            nextArticles.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
            return nextArticles;
    }
}

/**
 * 滚动到指定标题位置，并考虑顶部吸顶栏的偏移。
 * @param {string} id - 标题 id
 * @param {number} headerOffset - 顶部偏移
 */
export function scrollToHeading(id, headerOffset = 140) {
    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    const top = element.getBoundingClientRect().top + window.pageYOffset - headerOffset;
    window.scrollTo({ top, behavior: 'smooth' });
}

/**
 * 加载 Markdown 内容，并返回渲染后的 HTML、目录与 Front Matter 元数据。
 * @param {import('vue').Ref<string> | import('vue').ComputedRef<string>} resourcePath - 资源路径
 * @returns {{ renderedContent: import('vue').Ref<string>, toc: import('vue').Ref<any[]>, metadata: import('vue').Ref<Record<string, any>>, loading: import('vue').Ref<boolean>, error: import('vue').Ref<string> }}
 */
export function useMarkdownContent(resourcePath) {
    const renderedContent = ref('');
    const toc = ref([]);
    const metadata = ref({});
    const loading = ref(false);
    const error = ref('');

    const loadContent = async (path) => {
        if (!path) {
            renderedContent.value = '';
            toc.value = [];
            metadata.value = {};
            error.value = '未找到可加载的内容路径。';
            return;
        }

        loading.value = true;
        error.value = '';
        toc.value = [];
        metadata.value = {};

        try {
            const encodedPath = AppUtils.encodePath(path);
            const response = await fetch(encodedPath);

            if (!response.ok) {
                throw new Error(`无法加载内容 (Status: ${response.status})`);
            }

            const text = await response.text();
            const parsedResult = MarkdownService.parse(text, path);

            renderedContent.value = parsedResult.htmlContent;
            toc.value = parsedResult.tocItems;
            metadata.value = parsedResult.metadata || {};
        } catch (currentError) {
            const errorMessage = currentError instanceof Error ? currentError.message : String(currentError);
            console.error('加载 Markdown 内容失败：', currentError);
            error.value = `加载内容失败：${errorMessage}`;
        } finally {
            loading.value = false;
            MarkdownService.highlightCode();
            MarkdownService.renderMermaid();
        }
    };

    watch(resourcePath, nextPath => {
        loadContent(nextPath);
    }, { immediate: true });

    return { renderedContent, toc, metadata, loading, error };
}

/**
 * #endregion
 */
