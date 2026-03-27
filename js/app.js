/**
 * #region Router & App Bootstrap
 */

import { SITE_META, BLOG_ARTICLES, BLOG_TAGS, BLOG_SERIES } from './modules_data.js';
import { Breadcrumb, SearchBox, HomeView, ListView, SearchResultsView, ArticleView, ArchiveView, TagsView, SeriesView, AboutView, NotFoundView } from './components.js';
import { AnalyticsService, SeoService } from './services.js';

const { createApp, computed } = Vue;
const { createRouter, createWebHashHistory } = VueRouter;

function findArticleByPath(articlePath) {
    return (BLOG_ARTICLES || []).find(article => article.path === articlePath) || null;
}

function findTagBySlug(tagSlug) {
    return (BLOG_TAGS || []).find(tag => tag.slug === tagSlug) || null;
}

function findSeriesBySlug(seriesSlug) {
    return (BLOG_SERIES || []).find(series => series.slug === seriesSlug) || null;
}

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
                type: 'article',
                analytics: {
                        key: window.location.hash,
                        title: '文章不存在',
                        route: window.location.hash,
                        type: 'article'
                    }
                };
            }

            return {
                title: `${article.title} - ${SITE_META.title}`,
                description: article.summary,
                keywords: [...new Set([...(article.tags || []), article.moduleName, article.series, ...SITE_META.defaultKeywords].filter(Boolean))],
                image: defaultImage,
                url: article.url || window.location.href,
                type: 'article',
                analytics: {
                    key: article.path,
                    title: article.title,
                    route: article.route || window.location.hash,
                    type: 'article'
                }
            };
        }
        case 'list': {
            const moduleName = String(route.query.module || '知识模块');
            return {
                title: `${moduleName} - ${SITE_META.title}`,
                description: `浏览 ${moduleName} 模块下的文章内容。`,
                keywords: [moduleName, ...SITE_META.defaultKeywords],
                image: defaultImage,
                url: window.location.href,
                type: 'website',
                analytics: {
                    key: window.location.hash,
                    title: `${moduleName} 列表`,
                    route: window.location.hash,
                    type: 'list'
                }
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
                type: 'website',
                analytics: {
                    key: window.location.hash,
                    title: keyword ? `搜索 ${keyword}` : '搜索页',
                    route: window.location.hash,
                    type: 'search'
                }
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
                type: 'website',
                analytics: {
                    key: window.location.hash,
                    title: currentTag ? `标签 ${currentTag.name}` : '标签页',
                    route: window.location.hash,
                    type: 'taxonomy'
                }
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
                type: 'website',
                analytics: {
                    key: window.location.hash,
                    title: currentSeries ? `系列 ${currentSeries.name}` : '系列页',
                    route: window.location.hash,
                    type: 'taxonomy'
                }
            };
        }
        case 'archive':
            return {
                title: `${SITE_META.title} - 归档`,
                description: '按时间归档查看博客文章。',
                keywords: ['归档', ...SITE_META.defaultKeywords],
                image: defaultImage,
                url: window.location.href,
                type: 'website',
                analytics: {
                    key: window.location.hash,
                    title: '归档页',
                    route: window.location.hash,
                    type: 'archive'
                }
            };
        case 'about':
            return {
                title: `${SITE_META.title} - 关于我`,
                description: '了解这个博客的定位、内容方向和维护方式。',
                keywords: ['关于我', ...SITE_META.defaultKeywords],
                image: defaultImage,
                url: window.location.href,
                type: 'profile',
                analytics: {
                    key: window.location.hash,
                    title: '关于我',
                    route: window.location.hash,
                    type: 'page'
                }
            };
        default:
            return {
                title: SITE_META.title,
                description: SITE_META.description,
                keywords: SITE_META.defaultKeywords,
                image: defaultImage,
                url: window.location.href,
                type: 'website',
                analytics: {
                    key: window.location.hash || '#/',
                    title: SITE_META.title,
                    route: window.location.hash || '#/',
                    type: 'home'
                }
            };
    }
}

AnalyticsService.init(SITE_META.analytics);

router.afterEach(to => {
    const payload = buildSeoPayload(to);
    SeoService.updateMeta(payload);
    AnalyticsService.trackPageView(payload.analytics);
});

const app = createApp({
    components: { Breadcrumb, SearchBox },
    setup() {
        const route = VueRouter.useRoute();

        const article = computed(() => findArticleByPath(String(route.query.path || '')));
        const showBreadcrumb = computed(() => route.name === 'list' || route.name === 'article');
        const currentModule = computed(() => {
            if (route.name === 'article') {
                return article.value?.moduleName || '';
            }

            return String(route.query.module || '');
        });
        const currentArticle = computed(() => article.value?.title || '');
        const currentYear = computed(() => new Date().getFullYear());

        return { showBreadcrumb, currentModule, currentArticle, siteMeta: SITE_META, currentYear };
    }
});

app.config.errorHandler = (error, vm, info) => {
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
