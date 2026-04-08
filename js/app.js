/**
 * #region Router & App Bootstrap
 */

import { SITE_META } from './modules_data.js';
import { MarkdownService, SeoService } from './services.js';
import { findArticleByPath, findSeriesBySlug, findTagBySlug } from './view-helpers.js';
import { AboutView, ArticleView } from './views/article.js';
import { Breadcrumb, NotFoundView, SearchBox } from './views/common.js';
import { HomeView } from './views/home.js';
import { ArchiveView, ListView, SearchResultsView, SeriesView, TagsView } from './views/taxonomy.js';

const { createApp, computed, ref } = Vue;
const { createRouter, createWebHashHistory } = VueRouter;

const routes = [
    { path: '/', name: 'home', component: HomeView },
    { path: '/list', name: 'list', component: ListView },
    { path: '/search', name: 'search', component: SearchResultsView },
    { path: '/article', name: 'article', component: ArticleView },
    { path: '/archive', name: 'archive', component: ArchiveView },
    { path: '/tags', name: 'tags', component: TagsView },
    { path: '/series', name: 'series', component: SeriesView },
    { path: '/about', name: 'about', component: AboutView },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

/**
 * #region 主题模式
 */

const THEME_STORAGE_KEY = 'blog-theme';

/**
 * 解析页面初始化时的主题状态。
 * @returns {'light' | 'dark'} 当前页面应使用的主题。
 */
function resolveInitialTheme() {
    return window.__initialTheme === 'dark' ? 'dark' : 'light';
}

/**
 * 将主题应用到根节点，供全站样式变量读取。
 * @param {'light' | 'dark'} theme 要应用的主题名称。
 */
function applyTheme(theme) {
    const rootElement = document.documentElement;

    // 切换前暂时关闭过渡，避免整页闪烁。
    rootElement.classList.add('theme-transition');
    rootElement.setAttribute('data-theme', theme);
    rootElement.style.colorScheme = theme;

    window.setTimeout(() => {
        rootElement.classList.remove('theme-transition');
    }, 0);
}

/**
 * 将用户选择持久化到本地存储。
 * @param {'light' | 'dark'} theme 用户当前选择的主题。
 */
function persistTheme(theme) {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/**
 * #endregion
 */

function buildSeoPayload(route) {
    const defaultImage = SITE_META.socialPreviewImage
        ? `${SITE_META.siteUrl.replace(/\/+$/, '')}/${SITE_META.socialPreviewImage}`
        : '';

    switch (route.name) {
        case 'article': {
            const article = findArticleByPath(String(route.query.path || ''));

            if (!article) {
                return {
                    title: `${SITE_META.title} - 文章不存在`,
                    description: SITE_META.description,
                    keywords: SITE_META.defaultKeywords,
                    image: defaultImage,
                    url: window.location.href,
                    type: 'article'
                };
            }

            return {
                title: `${article.title} - ${SITE_META.title}`,
                description: article.summary,
                keywords: [...new Set([...(article.tags || []), article.category, article.subcategory, article.series, ...SITE_META.defaultKeywords].filter(Boolean))],
                image: defaultImage,
                url: article.url || window.location.href,
                type: 'article'
            };
        }
        case 'list': {
            const categoryName = String(route.query.category || '文章分类');
            return {
                title: `${categoryName} - ${SITE_META.title}`,
                description: `浏览分类“${categoryName}”下的文章内容。`,
                keywords: [categoryName, String(route.query.subcategory || ''), ...SITE_META.defaultKeywords].filter(Boolean),
                image: defaultImage,
                url: window.location.href,
                type: 'website'
            };
        }
        case 'search': {
            const keyword = String(route.query.keyword || '');
            return {
                title: keyword ? `搜索：${keyword} - ${SITE_META.title}` : `${SITE_META.title} - 搜索`,
                description: keyword ? `查看与“${keyword}”相关的搜索结果。` : '搜索博客中的标题、摘要、标签和系列。',
                keywords: keyword ? [keyword, ...SITE_META.defaultKeywords] : SITE_META.defaultKeywords,
                image: defaultImage,
                url: window.location.href,
                type: 'website'
            };
        }
        case 'tags': {
            const currentTag = findTagBySlug(String(route.query.tag || ''));
            return {
                title: currentTag ? `${currentTag.name} - 标签 - ${SITE_META.title}` : `${SITE_META.title} - 标签`,
                description: currentTag ? `浏览标签“${currentTag.name}”下的全部文章。` : '按标签浏览博客内容。',
                keywords: currentTag ? [currentTag.name, ...SITE_META.defaultKeywords] : SITE_META.defaultKeywords,
                image: defaultImage,
                url: window.location.href,
                type: 'website'
            };
        }
        case 'series': {
            const currentSeries = findSeriesBySlug(String(route.query.slug || ''));
            return {
                title: currentSeries ? `${currentSeries.name} - 系列 - ${SITE_META.title}` : `${SITE_META.title} - 系列`,
                description: currentSeries ? `浏览系列“${currentSeries.name}”下的全部文章。` : '按系列专题浏览博客内容。',
                keywords: currentSeries ? [currentSeries.name, ...SITE_META.defaultKeywords] : SITE_META.defaultKeywords,
                image: defaultImage,
                url: window.location.href,
                type: 'website'
            };
        }
        case 'archive':
            return {
                title: `${SITE_META.title} - 归档`,
                description: '按时间归档查看博客文章。',
                keywords: ['归档', ...SITE_META.defaultKeywords],
                image: defaultImage,
                url: window.location.href,
                type: 'website'
            };
        case 'about':
            return {
                title: `${SITE_META.title} - 关于我`,
                description: '了解这个博客的定位、内容方向和维护方式。',
                keywords: ['关于我', ...SITE_META.defaultKeywords],
                image: defaultImage,
                url: window.location.href,
                type: 'profile'
            };
        default:
            return {
                title: SITE_META.title,
                description: SITE_META.description,
                keywords: SITE_META.defaultKeywords,
                image: defaultImage,
                url: window.location.href,
                type: 'website'
            };
    }
}

router.afterEach(to => {
    const payload = buildSeoPayload(to);
    SeoService.updateMeta(payload);
});

const app = createApp({
    components: { Breadcrumb, SearchBox },
    setup() {
        const route = VueRouter.useRoute();
        const currentTheme = ref(resolveInitialTheme());

        const article = computed(() => findArticleByPath(String(route.query.path || '')));
        const showBreadcrumb = computed(() => route.name === 'list' || route.name === 'article');
        const currentCategory = computed(() => {
            if (route.name === 'article') {
                return article.value?.category || '';
            }

            return String(route.query.category || '');
        });
        const currentArticle = computed(() => article.value?.title || '');
        const currentYear = computed(() => new Date().getFullYear());
        const isDarkTheme = computed(() => currentTheme.value === 'dark');
        const themeToggleText = computed(() => isDarkTheme.value ? '浅色模式' : '深色模式');
        const themeToggleTitle = computed(() => isDarkTheme.value ? '切换到浅色模式' : '切换到深色模式');

        /**
         * 切换站点主题并保存用户选择。
         */
        const toggleTheme = () => {
            const nextTheme = isDarkTheme.value ? 'light' : 'dark';

            currentTheme.value = nextTheme;
            applyTheme(nextTheme);
            persistTheme(nextTheme);
            MarkdownService.renderMermaid();
        };

        applyTheme(currentTheme.value);

        return {
            showBreadcrumb,
            currentCategory,
            currentArticle,
            siteMeta: SITE_META,
            currentYear,
            isDarkTheme,
            themeToggleText,
            themeToggleTitle,
            toggleTheme
        };
    }
});

app.config.errorHandler = (error, _vm, info) => {
    console.error('全局捕获到错误：', error, info);
};

app.use(router);
app.mount('#app');

if (router.currentRoute.value) {
    const payload = buildSeoPayload(router.currentRoute.value);
    SeoService.updateMeta(payload);
}

/**
 * #endregion
 */
