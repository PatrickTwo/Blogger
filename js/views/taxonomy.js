/**
 * #region 列表与分类视图
 */

import { BLOG_ARTICLES, BLOG_ARCHIVES, BLOG_SERIES, BLOG_TAGS } from '../modules_data.js';
import { AppUtils } from '../utils.js';
import { buildArticleCardMeta, findArticlesByKeyword, findArticlesByPaths, findSeriesBySlug, findTagBySlug, navigateToArticle, navigateToSeries, navigateToTag, sortArticles } from '../view-helpers.js';

const { ref, computed, watch } = Vue;

export const ListView = {
    template: `
        <section class="list-page">
            <header class="list-header">
                <h1 id="module-title">{{ categoryName }}</h1>
                <p class="list-summary" v-if="categoryArticles.length > 0">
                    共 {{ categoryArticles.length }} 篇文章，可按子分类、标签、系列和排序方式筛选。
                </p>
            </header>

            <div v-if="categoryArticles.length > 0" class="filter-toolbar">
                <select v-model="selectedSubcategory" class="toolbar-select">
                    <option value="">全部子分类</option>
                    <option v-for="subcategory in availableSubcategories" :key="subcategory.slug" :value="subcategory.slug">{{ subcategory.name }} ({{ subcategory.count }})</option>
                </select>

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
                            <span class="meta-pill">{{ article.category }}</span>
                            <span v-if="article.subcategory" class="feed-chapter">{{ article.subcategory }}</span>
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
        const categoryName = computed(() => String(route.query.category || '未分类'));
        const selectedSubcategory = ref(String(route.query.subcategory || ''));
        const selectedTag = ref(String(route.query.tag || ''));
        const selectedSeries = ref(String(route.query.series || ''));
        const sortType = ref(String(route.query.sort || 'updated-desc'));

        const categoryArticles = computed(() => (BLOG_ARTICLES || []).filter(article => article.category === categoryName.value));

        const availableSubcategories = computed(() => {
            const subcategoryCountMap = new Map();

            for (const article of categoryArticles.value) {
                if (!article.subcategory) {
                    continue;
                }

                const slug = AppUtils.slugify(article.subcategory);
                const currentRecord = subcategoryCountMap.get(slug) || { name: article.subcategory, slug, count: 0 };
                currentRecord.count += 1;
                subcategoryCountMap.set(slug, currentRecord);
            }

            return [...subcategoryCountMap.values()].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'zh-CN'));
        });

        const availableTags = computed(() => {
            const tagCountMap = new Map();

            for (const article of categoryArticles.value) {
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

            for (const article of categoryArticles.value) {
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
            const scopedArticles = categoryArticles.value.filter(article => {
                const matchedSubcategory = !selectedSubcategory.value || AppUtils.slugify(article.subcategory || '') === selectedSubcategory.value;
                const matchedTag = !selectedTag.value || (article.tags || []).some(tag => AppUtils.slugify(tag) === selectedTag.value);
                const matchedSeries = !selectedSeries.value || article.seriesSlug === selectedSeries.value;
                return matchedSubcategory && matchedTag && matchedSeries;
            });

            return sortArticles(scopedArticles, sortType.value);
        });

        watch([selectedSubcategory, selectedTag, selectedSeries, sortType], () => {
            router.replace({
                name: 'list',
                query: {
                    category: categoryName.value,
                    subcategory: selectedSubcategory.value || undefined,
                    tag: selectedTag.value || undefined,
                    series: selectedSeries.value || undefined,
                    sort: sortType.value !== 'updated-desc' ? sortType.value : undefined
                }
            });
        });

        watch(() => route.query, query => {
            selectedSubcategory.value = String(query.subcategory || '');
            selectedTag.value = String(query.tag || '');
            selectedSeries.value = String(query.series || '');
            sortType.value = String(query.sort || 'updated-desc');
        });

        const goToArticle = article => navigateToArticle(router, article);
        const pickTag = tagName => {
            selectedTag.value = AppUtils.slugify(tagName);
        };

        return {
            categoryName,
            categoryArticles,
            availableSubcategories,
            selectedSubcategory,
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
                    支持搜索标题、摘要、标签、分类和系列信息。
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
        const currentTag = computed(() => findTagBySlug(String(route.query.tag || '')));
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
                    <p class="taxonomy-meta">{{ item.categoryLabel }} / {{ item.count }} 篇文章</p>
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
        const currentSeries = computed(() => findSeriesBySlug(String(route.query.slug || '')));
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

/**
 * #endregion
 */
