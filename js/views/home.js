/**
 * #region 首页视图
 */

import { SITE_META, BLOG_CATEGORIES, BLOG_ARTICLES, BLOG_SERIES } from '../modules_data.js';
import { buildArticleCardMeta, findTagByName, navigateToArticle, navigateToTag } from '../view-helpers.js';

const { computed } = Vue;

export const HomeView = {
    template: `
        <div class="home-shell">
            <section class="home-hero">
                <div class="hero-content">
                    <p class="hero-kicker">PERSONAL TECH BLOG</p>
                    <h1 class="hero-title">{{ siteMeta.title }}</h1>
                    <p class="hero-description">{{ siteMeta.description }}</p>
                    <div class="hero-actions">
                        <router-link class="hero-action primary" :to="{ name: 'archive' }">查看归档</router-link>
                        <router-link class="hero-action" :to="{ name: 'series' }">专题系列</router-link>
                        <a class="hero-action" href="rss.xml" target="_blank" rel="noopener noreferrer">RSS 订阅</a>
                    </div>
                </div>
                <div class="hero-panel">
                    <div class="hero-panel-copy">
                        <p class="hero-panel-kicker">数据概览</p>
                        <h2 class="hero-panel-title">技术积累与知识沉淀</h2>
                    </div>
                    <div class="hero-stat-grid">
                        <div class="hero-stat-card">
                            <span class="hero-stat-label">文章总数</span>
                            <strong class="hero-stat-value">{{ articles.length }}</strong>
                        </div>
                        <div class="hero-stat-card">
                            <span class="hero-stat-label">文章分类</span>
                            <strong class="hero-stat-value">{{ categoriesWithCounts.length }}</strong>
                        </div>
                        <div class="hero-stat-card">
                            <span class="hero-stat-label">专题系列</span>
                            <strong class="hero-stat-value">{{ series.length }}</strong>
                        </div>
                        <div class="hero-stat-card">
                            <span class="hero-stat-label">最近更新</span>
                            <strong class="hero-stat-value hero-stat-value-small">{{ latestUpdateLabel }}</strong>
                        </div>
                    </div>
                </div>
            </section>

            <section class="home-dashboard">
                <div class="home-dashboard-main">
                    <section class="home-section">
                        <div class="section-heading">
                            <h2 class="section-title">最近更新</h2>
                            <router-link class="section-link" :to="{ name: 'archive' }">查看全部</router-link>
                        </div>
                        <div class="recent-layout">
                            <article
                                v-if="featuredArticle"
                                class="featured-article-card"
                                @click="goToArticle(featuredArticle)"
                            >
                                <div class="featured-article-top">
                                    <span class="meta-pill">{{ featuredArticle.category }}</span>
                                    <span class="article-card-date">{{ featuredArticle.displayUpdatedAt }}</span>
                                </div>
                                <h3 class="featured-article-title">{{ featuredArticle.title }}</h3>
                                <p class="featured-article-summary">{{ featuredArticle.summary }}</p>
                                <p class="featured-article-meta">{{ buildMeta(featuredArticle) }}</p>
                                <div class="article-card-tags">
                                    <button
                                        v-for="tag in featuredArticle.tags.slice(0, 3)"
                                        :key="tag"
                                        class="tag-chip"
                                        type="button"
                                        @click.stop="goToTagByName(tag)"
                                    >
                                        {{ tag }}
                                    </button>
                                </div>
                            </article>
                            <div class="recent-article-list">
                                <article
                                    v-for="article in secondaryRecentArticles"
                                    :key="article.path"
                                    class="recent-article-item"
                                    @click="goToArticle(article)"
                                >
                                    <div class="recent-article-main">
                                        <div class="recent-article-top">
                                            <span class="meta-pill">{{ article.category }}</span>
                                            <span class="article-card-date">{{ article.displayUpdatedAt }}</span>
                                        </div>
                                        <h3 class="recent-article-title">{{ article.title }}</h3>
                                        <p class="recent-article-summary">{{ article.summary }}</p>
                                    </div>
                                    <span class="recent-article-arrow">→</span>
                                </article>
                            </div>
                        </div>
                    </section>

                    <section class="home-section">
                        <div class="section-heading">
                            <h2 class="section-title">文章分类</h2>
                            <span class="section-muted">按 Front Matter 分类浏览内容</span>
                        </div>
                        <div class="module-list">
                            <div v-for="category in categoriesWithCounts" :key="category.name" class="module-card" @click="goToCategory(category.name)">
                                <div class="module-icon">
                                    <span class="icon-char">{{ category.name.charAt(0) }}</span>
                                </div>
                                <div class="module-info">
                                    <h3 class="home-module-title">{{ category.name }}</h3>
                                    <p class="home-module-desc">
                                        <span>{{ category.subcategoryCount }} 个子分类</span>
                                        <span class="separator">/</span>
                                        <span>{{ category.articleCount }} 篇文章</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </section>
        </div>
    `,
    setup() {
        const router = VueRouter.useRouter();
        const siteMeta = SITE_META;
        const articles = BLOG_ARTICLES || [];
        const series = BLOG_SERIES || [];

        // 首页只保留当前页面真正需要的数据派生，避免继续堆叠杂项状态。
        const sortedArticlesByUpdated = computed(() => [...articles]
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
        const featuredArticle = computed(() => sortedArticlesByUpdated.value[0] || null);
        const secondaryRecentArticles = computed(() => sortedArticlesByUpdated.value.slice(1, 5));

        const categoriesWithCounts = computed(() => {
            return (BLOG_CATEGORIES || []).map(category => {
                const subcategoryCount = category.subcategories ? category.subcategories.length : 0;
                const subcategoryArticles = category.subcategories
                    ? category.subcategories.reduce((sum, subcategory) => sum + (subcategory.articles ? subcategory.articles.length : 0), 0)
                    : 0;
                const standaloneArticles = category.articles ? category.articles.length : 0;

                return {
                    ...category,
                    subcategoryCount,
                    articleCount: subcategoryArticles + standaloneArticles
                };
            });
        });

        const latestUpdateLabel = computed(() => featuredArticle.value?.displayUpdatedAt || '持续更新');

        const goToArticle = article => navigateToArticle(router, article);
        const goToCategory = categoryName => router.push({ name: 'list', query: { category: categoryName } });

        const goToTagByName = tagName => {
            const matchedTag = findTagByName(tagName);

            if (matchedTag) {
                navigateToTag(router, matchedTag.slug);
            }
        };

        return {
            siteMeta,
            articles,
            series,
            featuredArticle,
            secondaryRecentArticles,
            categoriesWithCounts,
            latestUpdateLabel,
            buildMeta: buildArticleCardMeta,
            goToArticle,
            goToCategory,
            goToTagByName
        };
    }
};

/**
 * #endregion
 */
