/**
 * #region Router & App Bootstrap
 */

import { Breadcrumb, SearchBox, HomeView, ListView, SearchResultsView, ArticleView, NotFoundView } from './components.js';

const { createApp, computed } = Vue;
const { createRouter, createWebHashHistory } = VueRouter;

// 1. 路由配置
const routes = [
    { path: '/', name: 'home', component: HomeView },
    { path: '/list', name: 'list', component: ListView },
    { path: '/search', name: 'search', component: SearchResultsView },
    { path: '/article', name: 'article', component: ArticleView },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

// 2. 创建并挂载应用
const app = createApp({
    components: { Breadcrumb, SearchBox },
    setup() {
        const route = VueRouter.useRoute();

        const showBreadcrumb = computed(() => route.name === 'list' || route.name === 'article');
        const currentModule = computed(() => route.query.module || '');
        const currentArticle = computed(() => route.query.title || '');

        return { showBreadcrumb, currentModule, currentArticle };
    }
});

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
    console.error('全局捕获到错误:', err, info);
};

app.use(router);
app.mount('#app');

/**
 * #endregion
 */
