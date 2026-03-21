/**
 * #region Components Definitions
 */

import { BLOG_MODULES } from './modules_data.js';
import { AppUtils } from './utils.js';
import { MarkdownService } from './services.js';

const { ref, onMounted, onBeforeUnmount, computed, watch } = Vue;

// #region Search helpers
const SEARCHABLE_ARTICLES = (BLOG_MODULES || []).flatMap(module => {
    const standaloneArticles = (module.articles || []).map(article => ({
        title: AppUtils.formatTitle(article.title),
        path: article.path,
        moduleName: module.name,
        chapterName: ''
    }));

    const chapterArticles = (module.chapters || []).flatMap(chapter =>
        (chapter.articles || []).map(article => ({
            title: AppUtils.formatTitle(article.title),
            path: article.path,
            moduleName: module.name,
            chapterName: chapter.name
        }))
    );

    return [...standaloneArticles, ...chapterArticles];
});

function normalizeSearchKeyword(keyword) {
    return keyword ? keyword.trim().toLowerCase() : '';
}

function findArticlesByKeyword(keyword) {
    const normalizedKeyword = normalizeSearchKeyword(keyword);

    if (!normalizedKeyword) {
        return [];
    }

    return SEARCHABLE_ARTICLES.filter(article =>
        article.title.toLowerCase().includes(normalizedKeyword)
    );
}

function navigateToArticle(router, article) {
    router.push({
        name: 'article',
        query: {
            path: article.path,
            title: article.title,
            module: article.moduleName
        }
    });
}
// #endregion

// #region Breadcrumb
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

// #region LoadingSpinner
export const LoadingSpinner = {
    template: `<div class="loading-spinner"></div>`
};
// #endregion

// #region SearchBox
export const SearchBox = {
    template: `
        <div class="header-search" ref="searchRoot">
            <form class="search-form" @submit.prevent="submitSearch">
                <div class="search-input-shell" :class="{ focused: showSuggestions }">
                    <input
                        v-model="keyword"
                        class="search-input"
                        type="search"
                        placeholder="搜索文章标题"
                        autocomplete="off"
                        @focus="openSuggestions"
                        @keydown.esc="closeSuggestions"
                    />
                    <button class="search-submit" type="submit">搜索</button>
                </div>
            </form>

            <div v-if="showSuggestions && normalizedKeyword" class="search-suggestions">
                <button
                    v-for="article in suggestions"
                    :key="article.path"
                    type="button"
                    class="search-suggestion-item"
                    @click="selectSuggestion(article)"
                >
                    <span class="suggestion-title">{{ article.title }}</span>
                    <span class="suggestion-meta">
                        {{ article.moduleName }}<template v-if="article.chapterName"> / {{ article.chapterName }}</template>
                    </span>
                </button>
                <div v-if="suggestions.length === 0" class="search-suggestion-empty">
                    未找到匹配的文章
                </div>
            </div>
        </div>
    `,
    setup() {
        const route = VueRouter.useRoute();
        const router = VueRouter.useRouter();
        const keyword = ref(route.name === 'search' ? String(route.query.keyword || '') : '');
        const showSuggestions = ref(false);
        const searchRoot = ref(null);

        // #region Search state
        const normalizedKeyword = computed(() => normalizeSearchKeyword(keyword.value));
        const suggestions = computed(() => findArticlesByKeyword(keyword.value).slice(0, 8));
        // #endregion

        const closeSuggestions = () => {
            showSuggestions.value = false;
        };

        const openSuggestions = () => {
            showSuggestions.value = true;
        };

        const submitSearch = () => {
            const trimmedKeyword = keyword.value.trim();

            if (!trimmedKeyword) {
                closeSuggestions();
                return;
            }

            closeSuggestions();
            router.push({
                name: 'search',
                query: { keyword: trimmedKeyword }
            });
        };

        const selectSuggestion = article => {
            closeSuggestions();
            navigateToArticle(router, article);
        };

        const handleDocumentClick = event => {
            if (!searchRoot.value || searchRoot.value.contains(event.target)) {
                return;
            }

            closeSuggestions();
        };

        watch(
            () => route.query.keyword,
            newKeyword => {
                if (route.name === 'search') {
                    keyword.value = String(newKeyword || '');
                }
            }
        );

        onMounted(() => {
            document.addEventListener('click', handleDocumentClick);
        });

        onBeforeUnmount(() => {
            document.removeEventListener('click', handleDocumentClick);
        });

        return {
            keyword,
            normalizedKeyword,
            suggestions,
            showSuggestions,
            searchRoot,
            openSuggestions,
            closeSuggestions,
            submitSearch,
            selectSuggestion
        };
    }
};
// #endregion

// #region HomeView
export const HomeView = {
    template: `
        <section class="module-section">
            <h2 class="section-title">知识模块</h2>
            <div class="module-list">
                <div v-for="module in modulesWithCounts" :key="module.name" class="module-card" @click="goToModule(module.name)">
                    <div class="module-icon">
                        <span class="icon-char">{{ module.name.charAt(0) }}</span>
                    </div>
                    <div class="module-info">
                        <h3 class="module-title">{{ module.name }}</h3>
                        <p class="module-desc">
                            <span>{{ module.chapterCount }} 个章节</span>
                            <span class="separator">·</span>
                            <span>{{ module.articleCount }} 篇文章</span>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    `,
    setup() {
        const modules = ref(BLOG_MODULES || []);
        const router = VueRouter.useRouter();

        const modulesWithCounts = computed(() => {
            return modules.value.map(module => {
                const chapterCount = module.chapters ? module.chapters.length : 0;
                const articlesInChapters = module.chapters
                    ? module.chapters.reduce((sum, chapter) => sum + (chapter.articles ? chapter.articles.length : 0), 0)
                    : 0;
                const standaloneArticles = module.articles ? module.articles.length : 0;

                return {
                    ...module,
                    chapterCount,
                    articleCount: articlesInChapters + standaloneArticles
                };
            });
        });

        const goToModule = name => {
            router.push({ name: 'list', query: { module: name } });
        };

        return { modulesWithCounts, goToModule };
    }
};
// #endregion

// #region ListView
export const ListView = {
    template: `
        <div class="list-container">
            <header class="list-header">
                <h1 id="module-title">{{ moduleName }}</h1>
            </header>

            <div v-if="chapters && chapters.length > 0" class="chapter-list">
                <div v-for="(chapter, index) in chapters" :key="chapter.name" class="chapter-item" :class="{ expanded: activeChapter === index }">
                    <div class="chapter-header" @click="toggleChapter(index)">
                        <span class="chapter-title">{{ chapter.name }}</span>
                        <span class="chapter-arrow">▶</span>
                    </div>
                    <div class="article-list">
                        <div v-for="article in chapter.articles" :key="article.title" class="article-item" @click="goToArticle(article)">
                            <span class="article-icon">📄</span>
                            <span class="article-title">{{ formatTitle(article.title) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div
                v-if="standaloneArticles && standaloneArticles.length > 0"
                class="article-list standalone"
                :class="{ 'standalone-only': !hasChapters }"
            >
                <div v-for="article in standaloneArticles" :key="article.title" class="article-item" @click="goToArticle(article)">
                    <span class="article-icon">📄</span>
                    <span class="article-title">{{ formatTitle(article.title) }}</span>
                </div>
            </div>

            <div v-if="(!chapters || chapters.length === 0) && (!standaloneArticles || standaloneArticles.length === 0)" class="empty-message">
                该模块下暂无文章
            </div>
        </div>
    `,
    setup() {
        const route = VueRouter.useRoute();
        const router = VueRouter.useRouter();
        const moduleName = ref(route.query.module || '');
        const activeChapter = ref(null);

        const currentModule = computed(() => (BLOG_MODULES || []).find(module => module.name === moduleName.value));
        const chapters = computed(() => currentModule.value?.chapters || []);
        const standaloneArticles = computed(() => currentModule.value?.articles || []);

        // #region View state helpers
        const hasChapters = computed(() => chapters.value.length > 0);
        // #endregion

        const toggleChapter = index => {
            activeChapter.value = activeChapter.value === index ? null : index;
        };

        const formatTitle = AppUtils.formatTitle;

        const goToArticle = article => {
            navigateToArticle(router, {
                title: formatTitle(article.title),
                path: article.path,
                moduleName: moduleName.value
            });
        };

        return { moduleName, chapters, standaloneArticles, hasChapters, activeChapter, toggleChapter, formatTitle, goToArticle };
    }
};
// #endregion

// #region SearchResultsView
export const SearchResultsView = {
    template: `
        <section class="search-results-page">
            <header class="list-header search-results-header">
                <p class="search-results-label">搜索结果</p>
                <h1 id="module-title">“{{ keyword || '请输入关键字' }}”</h1>
                <p class="search-results-summary" v-if="keyword">
                    共找到 {{ results.length }} 篇相关文章
                </p>
                <p class="search-results-summary" v-else>
                    输入关键字后即可查看匹配的文章列表
                </p>
            </header>

            <div v-if="results.length > 0" class="search-results-list">
                <article v-for="article in results" :key="article.path" class="search-result-card" @click="goToArticle(article)">
                    <div class="search-result-content">
                        <h2 class="search-result-title">{{ article.title }}</h2>
                        <p class="search-result-meta">
                            <span>{{ article.moduleName }}</span>
                            <span v-if="article.chapterName" class="separator">/</span>
                            <span v-if="article.chapterName">{{ article.chapterName }}</span>
                        </p>
                    </div>
                    <span class="search-result-arrow">→</span>
                </article>
            </div>

            <div v-else class="empty-message">
                没有找到标题中包含该关键字的文章
            </div>
        </section>
    `,
    setup() {
        const route = VueRouter.useRoute();
        const router = VueRouter.useRouter();
        const keyword = ref('');

        // #region Search results
        const results = computed(() => findArticlesByKeyword(keyword.value));
        // #endregion

        watch(
            () => route.query.keyword,
            newKeyword => {
                keyword.value = String(newKeyword || '').trim();
            },
            { immediate: true }
        );

        const goToArticle = article => {
            navigateToArticle(router, article);
        };

        return { keyword, results, goToArticle };
    }
};
// #endregion

// #region ArticleView
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
                        <li v-for="item in toc" :key="item.id" :class="['toc-item', 'toc-level-' + item.level]">
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

        const scrollTo = id => {
            const element = document.getElementById(id);
            if (!element) {
                return;
            }

            const headerOffset = 150;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        };

        const loadArticle = async () => {
            if (!path.value) {
                return;
            }

            loading.value = true;
            error.value = null;
            toc.value = [];

            try {
                const encodedPath = AppUtils.encodePath(path.value);
                const response = await fetch(encodedPath);

                if (!response.ok) {
                    throw new Error(`无法加载文章 (Status: ${response.status})`);
                }

                const text = await response.text();
                const { htmlContent, tocItems } = MarkdownService.parse(text);

                renderedContent.value = htmlContent;
                toc.value = tocItems;
            } catch (err) {
                console.error('加载文章失败:', err);

                let message = `加载文章内容失败。<br><br>详细错误: ${err.message}`;
                if (window.location.protocol === 'file:') {
                    message += '<br><br><strong>注意：</strong> 浏览器通常禁止直接通过 file:// 协议使用 fetch 加载本地文件。<br>请使用本地服务器预览。';
                }

                error.value = message;
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

// #region NotFoundView
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

/**
 * #endregion
 */
