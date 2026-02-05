/**
 * #region Components Definitions
 */

import { BLOG_MODULES } from './modules_data.js';
import { AppUtils } from './utils.js';
import { MarkdownService } from './services.js';

const { ref, onMounted, computed } = Vue;

// #region 通用面包屑组件
export const Breadcrumb = {
    props: {
        moduleName: String,
        articleTitle: String
    },
    template: `
        <nav class="breadcrumb">
            <router-link to="/">首页</router-link>
            <template v-if="moduleName">
                <span class="separator">/</span>
                <router-link v-if="articleTitle" :to="{ name: 'list', query: { module: moduleName } }">
                    {{ moduleName }}
                </router-link>
                <span v-else class="current">{{ moduleName }}</span>
            </template>
            <template v-if="articleTitle">
                <span class="separator">/</span>
                <span class="current">{{ articleTitle }}</span>
            </template>
        </nav>
    `
};
// #endregion

// #region 通用加载动画组件
export const LoadingSpinner = {
    template: `<div class="loading-spinner"></div>`
};
// #endregion

// #region 首页组件
export const HomeView = {
    template: `
        <section class="module-section">
            <h2 class="section-title">知识模块</h2>
            <div class="module-list">
                <div v-for="module in modules" :key="module.name" 
                     class="module-card" @click="goToModule(module.name)">
                    <div class="module-icon">
                        <span class="icon-char">{{ module.name.charAt(0) }}</span>
                    </div>
                    <div class="module-info">
                        <h3 class="module-title">{{ module.name }}</h3>
                        <p class="module-desc">{{ module.chapters.length }} 个章节</p>
                    </div>
                </div>
            </div>
        </section>
    `,
    setup() {
        const modules = ref(BLOG_MODULES || []);
        const router = VueRouter.useRouter();

        const goToModule = (name) => {
            router.push({ name: 'list', query: { module: name } });
        };

        return { modules, goToModule };
    }
};

// #region 列表页组件
export const ListView = {
    template: `
        <div class="list-container">
            <header class="list-header">
                <h1 id="module-title">{{ moduleName }}</h1>
            </header>
            
            <div class="chapter-list">
                <div v-for="(chapter, index) in chapters" :key="chapter.name" 
                     class="chapter-item" :class="{ expanded: activeChapter === index }">
                    <div class="chapter-header" @click="toggleChapter(index)">
                        <span class="chapter-title">{{ chapter.name }}</span>
                        <span class="chapter-arrow">▶</span>
                    </div>
                    <div class="article-list">
                        <div v-for="article in chapter.articles" :key="article.title" 
                             class="article-item" @click="goToArticle(article)">
                            <span class="article-icon">📄</span>
                            <span class="article-title">{{ formatTitle(article.title) }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const route = VueRouter.useRoute();
        const router = VueRouter.useRouter();
        const moduleName = ref(route.query.module || '');
        const activeChapter = ref(null);

        const currentModule = computed(() => {
            return (BLOG_MODULES || []).find(m => m.name === moduleName.value);
        });

        const chapters = computed(() => currentModule.value?.chapters || []);

        const toggleChapter = (index) => {
            activeChapter.value = activeChapter.value === index ? null : index;
        };

        const formatTitle = AppUtils.formatTitle;

        const goToArticle = (article) => {
            router.push({
                name: 'article',
                query: {
                    path: article.path,
                    title: formatTitle(article.title),
                    module: moduleName.value
                }
            });
        };

        return { moduleName, chapters, activeChapter, toggleChapter, formatTitle, goToArticle };
    }
};
// #endregion

// #region 文章页组件
export const ArticleView = {
    components: { LoadingSpinner },
    template: `
        <div class="article-wrapper">
            <div class="article-layout">
                <article class="article-container">
                    <header class="article-header">
                        <h1 id="article-title">{{ title }}</h1>
                        <div class="article-meta">
                            <span class="category-tag">{{ moduleName }}</span>
                        </div>
                    </header>
                    
                    <LoadingSpinner v-if="loading" />
                    <div v-else-if="error" class="error-message" v-html="error"></div>
                    <div v-else id="article-content" class="markdown-body" v-html="renderedContent"></div>
                </article>

                <aside v-if="!loading && toc.length > 0" class="article-toc">
                    <div class="toc-title">目录</div>
                    <ul class="toc-list">
                        <li v-for="item in toc" :key="item.id" 
                            :class="['toc-item', 'toc-level-' + item.level]">
                            <a :href="'#' + item.id" @click.prevent="scrollTo(item.id)">{{ item.text }}</a>
                        </li>
                    </ul>
                </aside>
            </div>
        </div>
    `,
    setup() {
        const route = VueRouter.useRoute();
        const path = ref(route.query.path || '');
        const title = ref(route.query.title || '');
        const moduleName = ref(route.query.module || '');
        const renderedContent = ref('');
        const loading = ref(true);
        const error = ref(null);
        const toc = ref([]);

        const scrollTo = (id) => {
            const el = document.getElementById(id);
            if (el) {
                // 调整偏移量，确保标题完全可见，不会被头部区域遮挡
                const headerOffset = 150;
                const elementPosition = el.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        };

        const loadArticle = async () => {
            if (!path.value) return;

            loading.value = true;
            error.value = null;
            toc.value = [];

            try {
                const encodedPath = AppUtils.encodePath(path.value);
                const response = await fetch(encodedPath);

                if (!response.ok) throw new Error(`无法加载文章 (Status: ${response.status})`);

                const text = await response.text();
                const { htmlContent, tocItems } = MarkdownService.parse(text);

                renderedContent.value = htmlContent;
                toc.value = tocItems;

            } catch (err) {
                console.error('加载文章失败:', err);
                let msg = `加载文章内容失败。<br><br>详细错误: ${err.message}`;
                if (window.location.protocol === 'file:') {
                    msg += '<br><br><strong>注意：</strong> 浏览器通常禁止直接通过 file:// 协议通过 fetch 加载本地文件 (CORS 错误)。<br>请使用本地服务器预览。';
                }
                error.value = msg;
            } finally {
                loading.value = false;
                MarkdownService.highlightCode();
            }
        };

        onMounted(loadArticle);

        return { title, moduleName, renderedContent, loading, error, toc, scrollTo };
    }
};
// #endregion

// #region 404 页面组件
export const NotFoundView = {
    template: `
        <div class="not-found" style="text-align: center; padding: 100px 20px;">
            <h1 style="font-size: 4rem; color: #2c3e50;">404</h1>
            <p style="font-size: 1.2rem; color: #7f8c8d; margin-bottom: 30px;">抱歉，您访问的页面不存在。</p>
            <router-link to="/" class="btn" style="
                background-color: #3498db;
                color: white;
                padding: 10px 25px;
                border-radius: 5px;
                text-decoration: none;
                transition: background 0.3s;
            ">返回首页</router-link>
        </div>
    `
};
// #endregion
