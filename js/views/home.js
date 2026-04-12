/**
 * #region 首页视图
 */

import { SITE_META, BLOG_ARTICLES, BLOG_CATEGORIES, BLOG_SERIES, BLOG_TAGS } from '../modules_data.js';
import { createParticlesBackground } from '../effects/particles.js';
import { buildArticleCardMeta, navigateToArticle, navigateToSeries } from '../view-helpers.js';

const { computed, nextTick, onBeforeUnmount, onMounted, ref } = Vue;

/**
 * #region 首页 Particles 背景组件
 */

const ParticlesBackground = {
    template: `
        <div ref="backgroundRef" class="home-background-layer" aria-hidden="true"></div>
    `,
    setup() {
        const backgroundRef = ref(null);
        const hostRef = ref(null);
        let isDisposed = false;
        let particlesScene = null;

        /**
         * 初始化首页粒子背景。
         */
        const initializeBackground = async () => {
            hostRef.value = document.querySelector('.main');

            if (!backgroundRef.value || !hostRef.value) {
                return;
            }

            // 等待容器尺寸稳定后再创建背景，避免首帧尺寸错误。
            await nextTick();
            const createdScene = createParticlesBackground(backgroundRef.value, hostRef.value, {
                particleCount: 150,
                particleSpread: 1.2,
                speed: 0.16,
                particleColors: ['#ffffff', '#93c5fd', '#fcd34d'],
                moveParticlesOnHover: true,
                particleHoverFactor: 14,
                alphaParticles: true,
                particleBaseSize: 2.1,
                sizeRandomness: 1.9,
                cameraDistance: 280
            });

            if (isDisposed && createdScene) {
                createdScene.dispose();
                return;
            }

            particlesScene = createdScene;
        };

        onMounted(() => {
            initializeBackground();
        });

        onBeforeUnmount(() => {
            isDisposed = true;

            if (particlesScene) {
                particlesScene.dispose();
                particlesScene = null;
            }
        });

        return {
            backgroundRef
        };
    }
};

/**
 * #endregion
 */

export const HomeView = {
    components: {
        ParticlesBackground
    },
    template: `
        <div class="home-shell">
            <ParticlesBackground />

            <section class="home-hero home-hero-layout">
                <div class="hero-content hero-content-portal">
                    <div class="hero-content-inner">
                        <div class="hero-copy">
                            <p class="hero-kicker">CONTENT GATEWAY</p>
                            <h1 class="hero-title">{{ siteMeta.title }}</h1>
                            <p class="hero-description">
                                {{ siteMeta.description }} 首页按“精选内容、分类入口、专题系列、常用标签”四段组织，保留参考布局的节奏感，同时继续使用项目原本的视觉体系。
                            </p>
                            <div class="hero-actions">
                                <router-link class="hero-action primary" :to="{ name: 'archive' }">阅读文章</router-link>
                                <router-link class="hero-action" :to="{ name: 'about' }">了解更多</router-link>
                            </div>
                        </div>
                        <div class="hero-floating-meta">
                            <span class="hero-floating-chip">内容入口</span>
                            <span class="hero-floating-chip">分类浏览</span>
                            <span class="hero-floating-chip">系列阅读</span>
                        </div>
                    </div>
                </div>

                <aside class="hero-panel hero-panel-portal">
                    <div class="hero-panel-copy">
                        <p class="hero-panel-kicker">站点概览</p>
                        <h2 class="hero-panel-title">让首页先完成分流</h2>
                        <p class="hero-panel-description">
                            不再把首页做成纯文章流，而是先给出重点内容和导航入口。
                        </p>
                    </div>
                    <div class="hero-stat-grid">
                        <div class="hero-stat-card">
                            <span class="hero-stat-label">文章总数</span>
                            <strong class="hero-stat-value">{{ articles.length }}</strong>
                        </div>
                        <div class="hero-stat-card">
                            <span class="hero-stat-label">核心分类</span>
                            <strong class="hero-stat-value">{{ featuredCategories.length }}</strong>
                        </div>
                        <div class="hero-stat-card">
                            <span class="hero-stat-label">专题系列</span>
                            <strong class="hero-stat-value">{{ featuredSeries.length }}</strong>
                        </div>
                        <div class="hero-stat-card">
                            <span class="hero-stat-label">高频标签</span>
                            <strong class="hero-stat-value">{{ featuredTags.length }}</strong>
                        </div>
                    </div>
                </aside>
            </section>

            <section class="home-section">
                <div class="section-heading section-heading-spread">
                    <h2 class="section-title">精选文章</h2>
                    <div class="section-accent-bar" aria-hidden="true"></div>
                </div>
                <div class="home-featured-grid">
                    <article
                        v-for="article in featuredArticles"
                        :key="article.path"
                        class="featured-article-card featured-article-card-tall"
                        @click="goToArticle(article)"
                    >
                        <div class="featured-article-top">
                            <span class="meta-pill">{{ article.category }}</span>
                            <span class="article-card-date">{{ article.displayUpdatedAt }}</span>
                        </div>
                        <h3 class="featured-article-title">{{ article.title }}</h3>
                        <p class="featured-article-summary">{{ article.summary }}</p>
                        <p class="featured-article-meta">{{ buildMeta(article) }}</p>
                    </article>
                </div>
            </section>

            <section class="home-structure-section">
                <div class="structure-visual-card">
                    <div class="structure-stage">
                        <div class="structure-shape structure-diamond"></div>
                        <div class="structure-shape structure-block"></div>
                        <div class="structure-shape structure-ring"></div>
                    </div>
                    <div class="structure-caption">CATEGORY<br>MAP</div>
                </div>

                <div class="home-section structure-content-card">
                    <div class="section-heading">
                        <h2 class="section-title">核心分类</h2>
                        <router-link class="section-link" :to="{ name: 'archive' }">查看归档</router-link>
                    </div>
                    <div class="module-list module-list-portal">
                        <article
                            v-for="category in featuredCategories"
                            :key="category.name"
                            class="module-card"
                            @click="goToCategory(category.name)"
                        >
                            <div class="module-icon">
                                <span class="icon-char">{{ category.name.charAt(0) }}</span>
                            </div>
                            <div class="module-info">
                                <h3 class="home-module-title">{{ category.name }}</h3>
                                <p class="home-module-desc">
                                    <span>{{ category.articleCount }} 篇文章</span>
                                    <span class="separator">/</span>
                                    <span>{{ category.subcategoryCount }} 个子分类</span>
                                </p>
                            </div>
                        </article>
                    </div>
                </div>
            </section>

            <section class="home-section">
                <div class="section-heading section-heading-center">
                    <h2 class="section-title">专题系列</h2>
                </div>
                <div class="series-portal-grid">
                    <article
                        v-for="(item, index) in featuredSeries"
                        :key="item.slug"
                        class="series-portal-card"
                        :class="{ accent: index % 2 === 1 }"
                        @click="goToSeries(item.slug)"
                    >
                        <div>
                            <div class="series-portal-index">{{ String(index + 1).padStart(2, '0') }}</div>
                            <h3 class="series-portal-title">{{ item.name }}</h3>
                            <p class="series-portal-summary">聚合同一主题的文章内容，适合顺序阅读与专题回顾。</p>
                        </div>
                        <div>
                            <div class="series-portal-tags">
                                <span
                                    v-for="categoryName in item.categoryNames.slice(0, 3)"
                                    :key="categoryName"
                                    class="series-portal-tag"
                                >
                                    {{ categoryName }}
                                </span>
                            </div>
                            <span class="series-portal-link">进入系列 →</span>
                        </div>
                    </article>
                </div>
            </section>

            <section class="home-section">
                <div class="section-heading">
                    <h2 class="section-title">高频标签</h2>
                    <router-link class="section-link" :to="{ name: 'tags' }">查看全部</router-link>
                </div>
                <div class="tag-cloud">
                    <router-link
                        v-for="tag in featuredTags"
                        :key="tag.slug"
                        class="tag-cloud-item"
                        :to="{ name: 'tags', query: { tag: tag.slug } }"
                    >
                        <span>{{ tag.name }}</span>
                        <span class="count">{{ tag.count }}</span>
                    </router-link>
                </div>
            </section>
        </div>
    `,
    setup() {
        const router = VueRouter.useRouter();
        const siteMeta = SITE_META;
        const articles = BLOG_ARTICLES || [];
        const series = BLOG_SERIES || [];
        const tags = BLOG_TAGS || [];

        const featuredArticles = computed(() => [...articles]
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
            .slice(0, 3));

        const featuredCategories = computed(() => {
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
            }).sort((left, right) => right.articleCount - left.articleCount)
                .slice(0, 4);
        });

        const featuredSeries = computed(() => [...series]
            .sort((left, right) => right.count - left.count)
            .slice(0, 2));

        const featuredTags = computed(() => [...tags]
            .sort((left, right) => right.count - left.count)
            .slice(0, 10));

        /**
         * 跳转到文章详情。
         * @param {Record<string, any>} article 文章数据。
         */
        const goToArticle = (article) => {
            navigateToArticle(router, article);
        };

        /**
         * 跳转到分类列表。
         * @param {string} categoryName 分类名称。
         */
        const goToCategory = (categoryName) => {
            router.push({
                name: 'list',
                query: { category: categoryName }
            });
        };

        /**
         * 跳转到系列页。
         * @param {string} seriesSlug 系列标识。
         */
        const goToSeries = (seriesSlug) => {
            navigateToSeries(router, seriesSlug);
        };

        return {
            siteMeta,
            articles,
            featuredArticles,
            featuredCategories,
            featuredSeries,
            featuredTags,
            buildMeta: buildArticleCardMeta,
            goToArticle,
            goToCategory,
            goToSeries
        };
    }
};

/**
 * #endregion
 */
