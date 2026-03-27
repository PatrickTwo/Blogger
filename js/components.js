/**
 * #region Components Definitions
 */

import { SITE_META, BLOG_MODULES, BLOG_ARTICLES, BLOG_TAGS, BLOG_SERIES, BLOG_ARCHIVES, BLOG_PAGES } from './modules_data.js';
import { AppUtils } from './utils.js';
import { MarkdownService, AnalyticsService } from './services.js';

const { ref, onMounted, onBeforeUnmount, computed, watch } = Vue;

const ARTICLE_MAP = new Map((BLOG_ARTICLES || []).map(article => [article.path, article]));
const TAG_MAP = new Map((BLOG_TAGS || []).map(tag => [tag.slug, tag]));
const SERIES_MAP = new Map((BLOG_SERIES || []).map(series => [series.slug, series]));
const PAGE_MAP = new Map((BLOG_PAGES || []).map(page => [page.slug, page]));

function normalizeSearchKeyword(keyword) {
    return String(keyword || '').trim().toLowerCase();
}

function findArticleByPath(articlePath) {
    return ARTICLE_MAP.get(articlePath) || null;
}

function findArticlesByPaths(paths) {
    return (paths || []).map(path => findArticleByPath(path)).filter(Boolean);
}

function findArticlesByKeyword(keyword) {
    const normalizedKeyword = normalizeSearchKeyword(keyword);

    if (!normalizedKeyword) {
        return [];
    }

    return (BLOG_ARTICLES || []).filter(article => {
        const searchableText = [
            article.title,
            article.summary,
            article.moduleName,
            article.chapterName,
            article.series,
            ...(article.tags || [])
        ].join(' ').toLowerCase();

        return searchableText.includes(normalizedKeyword);
    });
}

function navigateToArticle(router, article, anchor = '') {
    const query = { path: article.path };

    if (anchor) {
        query.anchor = anchor;
    }

    router.push({
        name: 'article',
        query
    });
}

function navigateToTag(router, tagSlug) {
    router.push({
        name: 'tags',
        query: { tag: tagSlug }
    });
}

function navigateToSeries(router, seriesSlug) {
    router.push({
        name: 'series',
        query: { slug: seriesSlug }
    });
}

function buildArticleCardMeta(article) {
    const parts = [article.moduleName];

    if (article.chapterName) {
        parts.push(article.chapterName);
    }

    parts.push(article.displayUpdatedAt || article.displayDate);
    parts.push(`${article.readMinutes} 分钟阅读`);

    return parts.filter(Boolean).join(' / ');
}

function sortArticles(articles, sortType) {
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

function useMarkdownContent(resourcePath) {
    const renderedContent = ref('');
    const toc = ref([]);
    const loading = ref(false);
    const error = ref('');

    const loadContent = async (path) => {
        if (!path) {
            renderedContent.value = '';
            toc.value = [];
            error.value = '未找到可加载的内容路径。';
            return;
        }

        loading.value = true;
        error.value = '';
        toc.value = [];

        try {
            const encodedPath = AppUtils.encodePath(path);
            const response = await fetch(encodedPath);

            if (!response.ok) {
                throw new Error(`无法加载内容 (Status: ${response.status})`);
            }

            const text = await response.text();
            const { htmlContent, tocItems } = MarkdownService.parse(text, path);

            renderedContent.value = htmlContent;
            toc.value = tocItems;
        } catch (currentError) {
            console.error('加载 Markdown 内容失败：', currentError);
            error.value = `加载内容失败：${currentError.message}`;
        } finally {
            loading.value = false;
            MarkdownService.highlightCode();
        }
    };

    watch(resourcePath, nextPath => {
        loadContent(nextPath);
    }, { immediate: true });

    return { renderedContent, toc, loading, error };
}

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

export const LoadingSpinner = {
    template: `<div class="loading-spinner"></div>`
};

export const SearchBox = {
    template: `
        <div class="header-search" ref="searchRoot">
            <form class="search-form" @submit.prevent="submitSearch">
                <div class="search-input-shell" :class="{ focused: showSuggestions }">
                    <input
                        v-model="keyword"
                        class="search-input"
                        type="search"
                        placeholder="搜索标题、摘要、标签"
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
                    <span class="suggestion-meta">{{ buildMeta(article) }}</span>
                    <span class="suggestion-summary">{{ article.summary }}</span>
                </button>
                <div v-if="suggestions.length === 0" class="search-suggestion-empty">
                    没有找到匹配的文章
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
        const normalizedKeyword = computed(() => normalizeSearchKeyword(keyword.value));
        const suggestions = computed(() => findArticlesByKeyword(keyword.value).slice(0, 8));

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

        watch(() => route.query.keyword, newKeyword => {
            if (route.name === 'search') {
                keyword.value = String(newKeyword || '');
            }
        });

        onMounted(() => {
            document.addEventListener('click', handleDocumentClick);
        });

        onBeforeUnmount(() => {
            document.removeEventListener('click', handleDocumentClick);
        });

        return {
            keyword,
            searchRoot,
            showSuggestions,
            normalizedKeyword,
            suggestions,
            closeSuggestions,
            openSuggestions,
            submitSearch,
            selectSuggestion,
            buildMeta: buildArticleCardMeta
        };
    }
};

export const HomeView = {
    template: `
        <section class="home-hero">
            <div class="hero-content">
                <p class="hero-kicker">PERSONAL TECH BLOG</p>
                <h1 class="hero-title">{{ siteMeta.title }}</h1>
                <p class="hero-description">{{ siteMeta.description }}</p>
                <div class="hero-actions">
                    <router-link class="hero-action primary" :to="{ name: 'archive' }">查看归档</router-link>
                    <router-link class="hero-action" :to="{ name: 'about' }">关于我</router-link>
                    <a class="hero-action" href="rss.xml" target="_blank" rel="noopener noreferrer">RSS 订阅</a>
                </div>
            </div>
            <div class="hero-panel">
                <div class="hero-stat-card">
                    <span class="hero-stat-label">文章总数</span>
                    <strong class="hero-stat-value">{{ articles.length }}</strong>
                </div>
                <div class="hero-stat-card">
                    <span class="hero-stat-label">专题系列</span>
                    <strong class="hero-stat-value">{{ series.length }}</strong>
                </div>
                <div class="hero-stat-card">
                    <span class="hero-stat-label">标签总数</span>
                    <strong class="hero-stat-value">{{ tags.length }}</strong>
                </div>
            </div>
        </section>

        <section class="home-section">
            <div class="section-heading">
                <h2 class="section-title">最近更新</h2>
                <router-link class="section-link" :to="{ name: 'archive' }">查看全部</router-link>
            </div>
            <div class="article-card-grid">
                <article v-for="article in recentArticles" :key="article.path" class="article-card" @click="goToArticle(article)">
                    <div class="article-card-top">
                        <span class="meta-pill">{{ article.moduleName }}</span>
                        <span class="article-card-date">{{ article.displayUpdatedAt }}</span>
                    </div>
                    <h3 class="article-card-title">{{ article.title }}</h3>
                    <p class="article-card-summary">{{ article.summary }}</p>
                    <p class="article-card-meta">{{ buildMeta(article) }}</p>
                    <div class="article-card-tags">
                        <button
                            v-for="tag in article.tags.slice(0, 3)"
                            :key="tag"
                            class="tag-chip"
                            type="button"
                            @click.stop="goToTagByName(tag)"
                        >
                            {{ tag }}
                        </button>
                    </div>
                </article>
            </div>
        </section>

        <section class="home-section">
            <div class="section-heading">
                <h2 class="section-title">推荐专题</h2>
                <router-link class="section-link" :to="{ name: 'series' }">查看系列</router-link>
            </div>
            <div class="series-card-grid">
                <article v-for="item in featuredSeries" :key="item.slug" class="series-card" @click="goToSeries(item.slug)">
                    <p class="series-card-meta">{{ item.moduleName }} / {{ item.count }} 篇</p>
                    <h3 class="series-card-title">{{ item.name }}</h3>
                    <p class="series-card-summary">{{ getSeriesLead(item) }}</p>
                </article>
            </div>
        </section>

        <section class="home-section">
            <div class="section-heading">
                <h2 class="section-title">常用标签</h2>
                <router-link class="section-link" :to="{ name: 'tags' }">查看全部标签</router-link>
            </div>
            <div class="tag-cloud">
                <button v-for="tag in featuredTags" :key="tag.slug" type="button" class="tag-cloud-item" @click="goToTag(tag.slug)">
                    <span>{{ tag.name }}</span>
                    <span class="count">{{ tag.count }}</span>
                </button>
            </div>
        </section>

        <section class="home-section">
            <div class="section-heading">
                <h2 class="section-title">知识模块</h2>
            </div>
            <div class="module-list">
                <div v-for="module in modulesWithCounts" :key="module.name" class="module-card" @click="goToModule(module.name)">
                    <div class="module-icon">
                        <span class="icon-char">{{ module.name.charAt(0) }}</span>
                    </div>
                    <div class="module-info">
                        <h3 class="module-title">{{ module.name }}</h3>
                        <p class="module-desc">
                            <span>{{ module.chapterCount }} 个章节</span>
                            <span class="separator">/</span>
                            <span>{{ module.articleCount }} 篇文章</span>
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <section v-if="popularPages.length > 0" class="home-section">
            <div class="section-heading">
                <h2 class="section-title">本地热门</h2>
                <span class="section-muted">基于当前浏览器统计</span>
            </div>
            <div class="popular-list">
                <article v-for="item in popularPages" :key="item.route" class="popular-item" @click="openPopular(item)">
                    <div>
                        <h3 class="popular-title">{{ item.title }}</h3>
                        <p class="popular-meta">{{ item.count }} 次浏览</p>
                    </div>
                    <span class="popular-arrow">→</span>
                </article>
            </div>
        </section>
    `,
    setup() {
        const router = VueRouter.useRouter();
        const siteMeta = SITE_META;
        const articles = BLOG_ARTICLES || [];
        const tags = BLOG_TAGS || [];
        const series = BLOG_SERIES || [];
        const popularPages = ref([]);

        const recentArticles = computed(() => [...articles]
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
            .slice(0, 6));

        const featuredTags = computed(() => tags.slice(0, 12));
        const featuredSeries = computed(() => series.slice(0, 4));

        const modulesWithCounts = computed(() => {
            return (BLOG_MODULES || []).map(module => {
                const chapterCount = module.chapters ? module.chapters.length : 0;
                const chapterArticles = module.chapters
                    ? module.chapters.reduce((sum, chapter) => sum + (chapter.articles ? chapter.articles.length : 0), 0)
                    : 0;
                const standaloneArticles = module.articles ? module.articles.length : 0;

                return {
                    ...module,
                    chapterCount,
                    articleCount: chapterArticles + standaloneArticles
                };
            });
        });

        const goToArticle = article => navigateToArticle(router, article);
        const goToModule = moduleName => router.push({ name: 'list', query: { module: moduleName } });
        const goToTag = tagSlug => navigateToTag(router, tagSlug);
        const goToSeries = seriesSlug => navigateToSeries(router, seriesSlug);

        const goToTagByName = tagName => {
            const matchedTag = (BLOG_TAGS || []).find(tag => tag.name === tagName);

            if (matchedTag) {
                goToTag(matchedTag.slug);
            }
        };

        const getSeriesLead = seriesItem => {
            const firstArticle = findArticleByPath(seriesItem.articlePaths[0]);
            return firstArticle?.summary || '查看这一组连续整理的专题文章。';
        };

        const openPopular = item => {
            if (item.type !== 'article') {
                return;
            }

            const matchedArticle = (BLOG_ARTICLES || []).find(article => article.route === item.route);

            if (matchedArticle) {
                navigateToArticle(router, matchedArticle);
            }
        };

        onMounted(() => {
            popularPages.value = AnalyticsService.getPopularPages(5).filter(item => item.type === 'article');
        });

        return {
            siteMeta,
            articles,
            tags,
            series,
            recentArticles,
            featuredTags,
            featuredSeries,
            modulesWithCounts,
            popularPages,
            buildMeta: buildArticleCardMeta,
            goToArticle,
            goToModule,
            goToTag,
            goToTagByName,
            goToSeries,
            getSeriesLead,
            openPopular
        };
    }
};

export const ListView = {
    template: `
        <section class="list-page">
            <header class="list-header">
                <h1 id="module-title">{{ moduleName }}</h1>
                <p class="list-summary" v-if="moduleArticles.length > 0">
                    共 {{ moduleArticles.length }} 篇文章，可按标签、系列和排序方式筛选。
                </p>
            </header>

            <div v-if="moduleArticles.length > 0" class="filter-toolbar">
                <select v-model="selectedTag" class="toolbar-select">
                    <option value="">全部标签</option>
                    <option v-for="tag in availableTags" :key="tag.slug" :value="tag.slug">{{ tag.name }} ({{ tag.count }})</option>
                </select>

                <select v-model="selectedSeries" class="toolbar-select">
                    <option value="">全部系列</option>
                    <option v-for="series in availableSeries" :key="series.slug" :value="series.slug">{{ series.name }} ({{ series.count }})</option>
                </select>

                <select v-model="sortType" class="toolbar-select">
                    <option value="updated-desc">最近更新优先</option>
                    <option value="updated-asc">最早更新优先</option>
                    <option value="title-asc">标题升序</option>
                    <option value="title-desc">标题降序</option>
                </select>
            </div>

            <div v-if="filteredArticles.length > 0" class="article-feed">
                <article v-for="article in filteredArticles" :key="article.path" class="feed-item" @click="goToArticle(article)">
                    <div class="feed-item-main">
                        <div class="feed-item-top">
                            <span class="meta-pill">{{ article.moduleName }}</span>
                            <span v-if="article.chapterName" class="feed-chapter">{{ article.chapterName }}</span>
                            <span class="feed-date">{{ article.displayUpdatedAt }}</span>
                        </div>
                        <h2 class="feed-title">{{ article.title }}</h2>
                        <p class="feed-summary">{{ article.summary }}</p>
                        <div class="feed-tags">
                            <button
                                v-for="tag in article.tags.slice(0, 4)"
                                :key="tag"
                                type="button"
                                class="tag-chip"
                                @click.stop="pickTag(tag)"
                            >
                                {{ tag }}
                            </button>
                        </div>
                    </div>
                    <span class="feed-arrow">→</span>
                </article>
            </div>

            <div v-else class="empty-message">
                当前筛选条件下没有匹配的文章。
            </div>
        </section>
    `,
    setup() {
        const route = VueRouter.useRoute();
        const router = VueRouter.useRouter();
        const moduleName = computed(() => String(route.query.module || ''));
        const selectedTag = ref(String(route.query.tag || ''));
        const selectedSeries = ref(String(route.query.series || ''));
        const sortType = ref(String(route.query.sort || 'updated-desc'));

        const moduleArticles = computed(() => (BLOG_ARTICLES || []).filter(article => article.moduleName === moduleName.value));

        const availableTags = computed(() => {
            const tagCountMap = new Map();

            for (const article of moduleArticles.value) {
                for (const tag of article.tags || []) {
                    const slug = AppUtils.slugify(tag);
                    const currentRecord = tagCountMap.get(slug) || { name: tag, slug, count: 0 };
                    currentRecord.count += 1;
                    tagCountMap.set(slug, currentRecord);
                }
            }

            return [...tagCountMap.values()].sort((left, right) => right.count - left.count);
        });

        const availableSeries = computed(() => {
            const seriesCountMap = new Map();

            for (const article of moduleArticles.value) {
                if (!article.seriesSlug) {
                    continue;
                }

                const currentRecord = seriesCountMap.get(article.seriesSlug) || {
                    name: article.series,
                    slug: article.seriesSlug,
                    count: 0
                };
                currentRecord.count += 1;
                seriesCountMap.set(article.seriesSlug, currentRecord);
            }

            return [...seriesCountMap.values()].sort((left, right) => right.count - left.count);
        });

        const filteredArticles = computed(() => {
            const scopedArticles = moduleArticles.value.filter(article => {
                const matchedTag = !selectedTag.value || (article.tags || []).some(tag => AppUtils.slugify(tag) === selectedTag.value);
                const matchedSeries = !selectedSeries.value || article.seriesSlug === selectedSeries.value;
                return matchedTag && matchedSeries;
            });

            return sortArticles(scopedArticles, sortType.value);
        });

        watch([selectedTag, selectedSeries, sortType], () => {
            router.replace({
                name: 'list',
                query: {
                    module: moduleName.value,
                    tag: selectedTag.value || undefined,
                    series: selectedSeries.value || undefined,
                    sort: sortType.value !== 'updated-desc' ? sortType.value : undefined
                }
            });
        });

        watch(() => route.query, query => {
            selectedTag.value = String(query.tag || '');
            selectedSeries.value = String(query.series || '');
            sortType.value = String(query.sort || 'updated-desc');
        });

        const goToArticle = article => navigateToArticle(router, article);
        const pickTag = tagName => {
            selectedTag.value = AppUtils.slugify(tagName);
        };

        return {
            moduleName,
            moduleArticles,
            availableTags,
            availableSeries,
            selectedTag,
            selectedSeries,
            sortType,
            filteredArticles,
            goToArticle,
            pickTag
        };
    }
};

export const SearchResultsView = {
    template: `
        <section class="search-results-page">
            <header class="list-header search-results-header">
                <p class="search-results-label">搜索结果</p>
                <h1 id="module-title">“{{ keyword || '请输入关键词' }}”</h1>
                <p class="search-results-summary" v-if="keyword">
                    找到 {{ results.length }} 篇相关文章
                </p>
                <p class="search-results-summary" v-else>
                    支持搜索标题、摘要、标签、模块和系列信息。
                </p>
            </header>

            <div v-if="results.length > 0" class="search-results-list">
                <article v-for="article in results" :key="article.path" class="search-result-card" @click="goToArticle(article)">
                    <div class="search-result-content">
                        <h2 class="search-result-title">{{ article.title }}</h2>
                        <p class="search-result-meta">{{ buildMeta(article) }}</p>
                        <p class="search-result-summary">{{ article.summary }}</p>
                        <div class="feed-tags">
                            <span v-for="tag in article.tags.slice(0, 3)" :key="tag" class="tag-chip static">{{ tag }}</span>
                        </div>
                    </div>
                    <span class="search-result-arrow">→</span>
                </article>
            </div>

            <div v-else class="empty-message">
                没有找到匹配的文章。
            </div>
        </section>
    `,
    setup() {
        const route = VueRouter.useRoute();
        const router = VueRouter.useRouter();
        const keyword = ref('');
        const results = computed(() => findArticlesByKeyword(keyword.value));

        watch(() => route.query.keyword, newKeyword => {
            keyword.value = String(newKeyword || '').trim();
        }, { immediate: true });

        const goToArticle = article => navigateToArticle(router, article);

        return {
            keyword,
            results,
            goToArticle,
            buildMeta: buildArticleCardMeta
        };
    }
};

export const ArchiveView = {
    template: `
        <section class="archive-page">
            <header class="list-header">
                <h1 id="module-title">归档</h1>
                <p class="list-summary">按更新时间查看所有文章。</p>
            </header>

            <div class="archive-groups">
                <section v-for="group in archiveGroups" :key="group.key" class="archive-group">
                    <div class="archive-group-header">
                        <h2>{{ group.year }} 年 {{ group.month }} 月</h2>
                        <span>{{ group.count }} 篇</span>
                    </div>
                    <div class="archive-group-list">
                        <article v-for="article in group.articles" :key="article.path" class="archive-item" @click="goToArticle(article)">
                            <div>
                                <h3 class="archive-item-title">{{ article.title }}</h3>
                                <p class="archive-item-meta">{{ buildMeta(article) }}</p>
                            </div>
                            <span class="archive-date">{{ article.displayUpdatedAt }}</span>
                        </article>
                    </div>
                </section>
            </div>
        </section>
    `,
    setup() {
        const router = VueRouter.useRouter();
        const archiveGroups = computed(() => (BLOG_ARCHIVES || []).map(group => ({
            ...group,
            articles: sortArticles(findArticlesByPaths(group.articlePaths), 'updated-desc')
        })));

        const goToArticle = article => navigateToArticle(router, article);

        return {
            archiveGroups,
            goToArticle,
            buildMeta: buildArticleCardMeta
        };
    }
};

export const TagsView = {
    template: `
        <section class="taxonomy-page">
            <header class="list-header">
                <h1 id="module-title">{{ currentTag ? currentTag.name : '标签' }}</h1>
                <p class="list-summary" v-if="currentTag">
                    当前标签下共有 {{ tagArticles.length }} 篇文章。
                </p>
                <p class="list-summary" v-else>
                    浏览标签并快速定位相关内容。
                </p>
            </header>

            <div v-if="!currentTag" class="taxonomy-grid">
                <article v-for="tag in tags" :key="tag.slug" class="taxonomy-card" @click="goToTag(tag.slug)">
                    <h2 class="taxonomy-title">{{ tag.name }}</h2>
                    <p class="taxonomy-meta">{{ tag.count }} 篇文章</p>
                </article>
            </div>

            <div v-else class="article-feed">
                <article v-for="article in tagArticles" :key="article.path" class="feed-item" @click="goToArticle(article)">
                    <div class="feed-item-main">
                        <p class="feed-item-top">{{ buildMeta(article) }}</p>
                        <h2 class="feed-title">{{ article.title }}</h2>
                        <p class="feed-summary">{{ article.summary }}</p>
                    </div>
                    <span class="feed-arrow">→</span>
                </article>
            </div>
        </section>
    `,
    setup() {
        const route = VueRouter.useRoute();
        const router = VueRouter.useRouter();
        const currentTag = computed(() => TAG_MAP.get(String(route.query.tag || '')) || null);
        const tags = BLOG_TAGS || [];
        const tagArticles = computed(() => {
            if (!currentTag.value) {
                return [];
            }

            return sortArticles(findArticlesByPaths(currentTag.value.articlePaths), 'updated-desc');
        });

        const goToTag = tagSlug => navigateToTag(router, tagSlug);
        const goToArticle = article => navigateToArticle(router, article);

        return { currentTag, tags, tagArticles, goToTag, goToArticle, buildMeta: buildArticleCardMeta };
    }
};

export const SeriesView = {
    template: `
        <section class="taxonomy-page">
            <header class="list-header">
                <h1 id="module-title">{{ currentSeries ? currentSeries.name : '系列' }}</h1>
                <p class="list-summary" v-if="currentSeries">
                    当前系列下共有 {{ seriesArticles.length }} 篇文章。
                </p>
                <p class="list-summary" v-else>
                    以连续专题的形式浏览文章。
                </p>
            </header>

            <div v-if="!currentSeries" class="taxonomy-grid">
                <article v-for="item in series" :key="item.slug" class="taxonomy-card" @click="goToSeries(item.slug)">
                    <h2 class="taxonomy-title">{{ item.name }}</h2>
                    <p class="taxonomy-meta">{{ item.moduleName }} / {{ item.count }} 篇文章</p>
                </article>
            </div>

            <div v-else class="article-feed">
                <article v-for="article in seriesArticles" :key="article.path" class="feed-item" @click="goToArticle(article)">
                    <div class="feed-item-main">
                        <p class="feed-item-top">{{ buildMeta(article) }}</p>
                        <h2 class="feed-title">{{ article.title }}</h2>
                        <p class="feed-summary">{{ article.summary }}</p>
                    </div>
                    <span class="feed-arrow">→</span>
                </article>
            </div>
        </section>
    `,
    setup() {
        const route = VueRouter.useRoute();
        const router = VueRouter.useRouter();
        const currentSeries = computed(() => SERIES_MAP.get(String(route.query.slug || '')) || null);
        const series = BLOG_SERIES || [];
        const seriesArticles = computed(() => {
            if (!currentSeries.value) {
                return [];
            }

            return sortArticles(findArticlesByPaths(currentSeries.value.articlePaths), 'updated-desc');
        });

        const goToSeries = seriesSlug => navigateToSeries(router, seriesSlug);
        const goToArticle = article => navigateToArticle(router, article);

        return { currentSeries, series, seriesArticles, goToSeries, goToArticle, buildMeta: buildArticleCardMeta };
    }
};

export const AboutView = {
    components: { LoadingSpinner },
    template: `
        <section class="article-wrapper">
            <div class="article-layout">
                <article class="article-container">
                    <header class="article-header">
                        <h1 id="article-title">{{ page?.title || '关于我' }}</h1>
                        <p class="article-summary" v-if="page?.summary">{{ page.summary }}</p>
                    </header>

                    <LoadingSpinner v-if="loading" />
                    <div v-else-if="error" class="error-message">{{ error }}</div>
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
        </section>
    `,
    setup() {
        const page = PAGE_MAP.get('about') || null;
        const { renderedContent, toc, loading, error } = useMarkdownContent(computed(() => page?.path || ''));

        const scrollTo = (id) => {
            const element = document.getElementById(id);

            if (!element) {
                return;
            }

            const headerOffset = 140;
            const top = element.getBoundingClientRect().top + window.pageYOffset - headerOffset;
            window.scrollTo({ top, behavior: 'smooth' });
        };

        return {
            page,
            renderedContent,
            toc,
            loading,
            error,
            scrollTo
        };
    }
};

export const ArticleView = {
    components: { LoadingSpinner },
    template: `
        <section class="article-wrapper">
            <div class="reading-progress" v-if="article">
                <div class="reading-progress-bar" :style="{ width: progress + '%' }"></div>
            </div>

            <div class="article-layout">
                <article class="article-container">
                    <header class="article-header" v-if="article">
                        <div class="article-hero-meta">
                            <span class="meta-pill">{{ article.moduleName }}</span>
                            <button v-if="article.seriesSlug" type="button" class="inline-link-button" @click="goToSeries(article.seriesSlug)">
                                {{ article.series }}
                            </button>
                        </div>
                        <h1 id="article-title">{{ article.title }}</h1>
                        <p class="article-summary">{{ article.summary }}</p>
                        <div class="article-meta">
                            <span>发布于 {{ article.displayDate }}</span>
                            <span>更新于 {{ article.displayUpdatedAt }}</span>
                            <span>{{ article.readMinutes }} 分钟阅读</span>
                        </div>
                        <div class="article-tag-list">
                            <button
                                v-for="tag in article.tags"
                                :key="tag"
                                type="button"
                                class="tag-chip"
                                @click="goToTagByName(tag)"
                            >
                                {{ tag }}
                            </button>
                        </div>
                    </header>

                    <LoadingSpinner v-if="loading" />
                    <div v-else-if="error" class="error-message">{{ error }}</div>
                    <div v-else id="article-content" class="markdown-body" v-html="renderedContent"></div>

                    <section v-if="article && (previousArticle || nextArticle)" class="article-neighbors">
                        <div v-if="previousArticle" class="neighbor-card" @click="goToArticle(previousArticle)">
                            <span class="neighbor-label">上一篇</span>
                            <strong>{{ previousArticle.title }}</strong>
                        </div>
                        <div v-if="nextArticle" class="neighbor-card" @click="goToArticle(nextArticle)">
                            <span class="neighbor-label">下一篇</span>
                            <strong>{{ nextArticle.title }}</strong>
                        </div>
                    </section>

                    <section v-if="seriesArticles.length > 0" class="related-section">
                        <div class="section-heading">
                            <h2 class="section-title">同系列文章</h2>
                        </div>
                        <div class="related-list">
                            <article v-for="item in seriesArticles" :key="item.path" class="related-item" @click="goToArticle(item)">
                                <h3>{{ item.title }}</h3>
                                <p>{{ item.summary }}</p>
                            </article>
                        </div>
                    </section>

                    <section v-if="relatedArticles.length > 0" class="related-section">
                        <div class="section-heading">
                            <h2 class="section-title">相关推荐</h2>
                        </div>
                        <div class="related-list">
                            <article v-for="item in relatedArticles" :key="item.path" class="related-item" @click="goToArticle(item)">
                                <h3>{{ item.title }}</h3>
                                <p>{{ item.summary }}</p>
                            </article>
                        </div>
                    </section>
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

            <button v-if="showBackToTop" type="button" class="back-to-top" @click="scrollToTop">↑</button>
        </section>
    `,
    setup() {
        const route = VueRouter.useRoute();
        const router = VueRouter.useRouter();
        const article = computed(() => findArticleByPath(String(route.query.path || '')));
        const progress = ref(0);
        const showBackToTop = ref(false);
        const resourcePath = computed(() => article.value?.path || '');
        const { renderedContent, toc, loading, error } = useMarkdownContent(resourcePath);

        const previousArticle = computed(() => findArticleByPath(article.value?.previousPath || ''));
        const nextArticle = computed(() => findArticleByPath(article.value?.nextPath || ''));
        const seriesArticles = computed(() => findArticlesByPaths(article.value?.seriesPaths || []));
        const relatedArticles = computed(() => findArticlesByPaths(article.value?.relatedPaths || []));

        const scrollTo = (id) => {
            const element = document.getElementById(id);

            if (!element) {
                return;
            }

            const headerOffset = 140;
            const top = element.getBoundingClientRect().top + window.pageYOffset - headerOffset;
            window.scrollTo({ top, behavior: 'smooth' });
        };

        const updateReadingProgress = () => {
            const contentElement = document.getElementById('article-content');

            if (!contentElement) {
                progress.value = 0;
                showBackToTop.value = false;
                return;
            }

            const articleTop = contentElement.offsetTop - 140;
            const articleHeight = contentElement.offsetHeight;
            const viewportHeight = window.innerHeight;
            const scrollTop = window.pageYOffset;
            const denominator = Math.max(articleHeight - viewportHeight, 1);
            const currentProgress = ((scrollTop - articleTop) / denominator) * 100;

            progress.value = Math.max(0, Math.min(100, currentProgress));
            showBackToTop.value = scrollTop > 480;
        };

        const applyAnchorScroll = () => {
            const anchor = String(route.query.anchor || '');

            if (!anchor) {
                updateReadingProgress();
                return;
            }

            Vue.nextTick(() => {
                setTimeout(() => {
                    scrollTo(anchor);
                    updateReadingProgress();
                }, 80);
            });
        };

        const handleScroll = () => {
            updateReadingProgress();
        };

        watch(() => route.query.anchor, () => {
            applyAnchorScroll();
        });

        watch(renderedContent, () => {
            applyAnchorScroll();
        });

        onMounted(() => {
            window.addEventListener('scroll', handleScroll);
            window.addEventListener('resize', handleScroll);
        });

        onBeforeUnmount(() => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        });

        const goToArticle = item => navigateToArticle(router, item);
        const goToSeries = seriesSlug => navigateToSeries(router, seriesSlug);
        const goToTagByName = tagName => {
            const matchedTag = (BLOG_TAGS || []).find(tag => tag.name === tagName);

            if (matchedTag) {
                navigateToTag(router, matchedTag.slug);
            }
        };

        const scrollToTop = () => {
            AppUtils.scrollToTop();
        };

        return {
            article,
            renderedContent,
            toc,
            loading,
            error,
            previousArticle,
            nextArticle,
            seriesArticles,
            relatedArticles,
            progress,
            showBackToTop,
            scrollTo,
            goToArticle,
            goToSeries,
            goToTagByName,
            scrollToTop
        };
    }
};

export const NotFoundView = {
    template: `
        <div class="not-found" style="text-align: center; padding: 100px 20px;">
            <h1 style="font-size: 4rem; color: var(--text-primary);">404</h1>
            <p style="font-size: 1.2rem; color: var(--text-secondary); margin-bottom: 30px;">抱歉，你访问的页面不存在。</p>
            <router-link to="/" class="hero-action primary">返回首页</router-link>
        </div>
    `
};

/**
 * #endregion
 */
