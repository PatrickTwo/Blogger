/**
 * #region Router & App Bootstrap
 */

import { Breadcrumb, HomeView, ListView, ArticleView, NotFoundView } from './components.js';

const { createApp, computed } = Vue;
const { createRouter, createWebHashHistory } = VueRouter;

// 1. 路由配置
const routes = [
    { path: '/', name: 'home', component: HomeView },
    { path: '/list', name: 'list', component: ListView },
    { path: '/article', name: 'article', component: ArticleView },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

// 2. 创建并挂载应用
const app = createApp({
    components: { Breadcrumb },
    setup() {
        const route = VueRouter.useRoute();

        // 计算当前路由是否需要显示面包屑
        const showBreadcrumb = computed(() => {
            return route.name === 'list' || route.name === 'article';
        });

        // 提取路由参数
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
