/**
 * #region 文章与单页视图
 */

import { AppUtils } from '../utils.js';
import { findArticleByPath, findArticlesByPaths, findTagByName, navigateToArticle, navigateToSeries, navigateToTag, scrollToHeading, useMarkdownContent } from '../view-helpers.js';
import { LoadingSpinner } from './common.js';

const { ref, computed, watch, onMounted, onBeforeUnmount } = Vue;

export const AboutView = {
    components: { LoadingSpinner },
    template: `
        <section class="article-wrapper">
            <div class="article-layout">
                <article class="article-container">
                    <header class="article-header">
                        <h1 id="article-title">{{ pageTitle }}</h1>
                        <p class="article-summary" v-if="pageSummary">{{ pageSummary }}</p>
                    </header>

                    <LoadingSpinner v-if="loading" />
                    <div v-else-if="error" class="error-message">{{ error }}</div>
                    <div v-else id="article-content" class="markdown-body" v-html="renderedContent"></div>
                </article>

                <aside v-if="!loading && toc.length > 0 && !isCompactTocMode" class="article-toc">
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
        const isCompactTocMode = ref(window.matchMedia('(max-width: 1024px)').matches);
        const resourcePath = computed(() => 'Resources/Pages/about.md');
        const { renderedContent, toc, metadata, loading, error } = useMarkdownContent(resourcePath);
        const pageTitle = computed(() => String(metadata.value.title || '关于我'));
        const pageSummary = computed(() => String(metadata.value.summary || ''));

        /**
         * 同步当前视口是否应隐藏目录。
         */
        const handleViewportChange = () => {
            isCompactTocMode.value = window.matchMedia('(max-width: 1024px)').matches;
        };

        onMounted(() => {
            window.addEventListener('resize', handleViewportChange);
        });

        onBeforeUnmount(() => {
            window.removeEventListener('resize', handleViewportChange);
        });

        const scrollTo = id => {
            scrollToHeading(id);
        };

        return {
            pageTitle,
            pageSummary,
            renderedContent,
            toc,
            loading,
            error,
            isCompactTocMode,
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
                            <span class="meta-pill">{{ article.category }}</span>
                            <span v-if="article.subcategory" class="meta-pill">{{ article.subcategory }}</span>
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

                <aside v-if="showDesktopToc" ref="tocRoot" class="article-toc">
                    <div class="toc-title">目录</div>
                    <ul class="toc-list">
                        <li v-for="item in toc" :key="item.id" :class="['toc-item', 'toc-level-' + item.level]">
                            <a
                                :href="'#' + item.id"
                                :class="{ active: activeTocId === item.id }"
                                :data-toc-id="item.id"
                                @click.prevent="scrollTo(item.id)"
                            >
                                {{ item.text }}
                            </a>
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
        const activeTocId = ref('');
        const tocRoot = ref(null);
        const isCompactTocMode = ref(window.matchMedia('(max-width: 1024px)').matches);
        const resourcePath = computed(() => article.value?.path || '');
        const { renderedContent, toc, loading, error } = useMarkdownContent(resourcePath);
        const showDesktopToc = computed(() => !loading.value && toc.value.length > 0 && !isCompactTocMode.value);

        const previousArticle = computed(() => findArticleByPath(article.value?.previousPath || ''));
        const nextArticle = computed(() => findArticleByPath(article.value?.nextPath || ''));
        const seriesArticles = computed(() => findArticlesByPaths(article.value?.seriesPaths || []));
        const relatedArticles = computed(() => findArticlesByPaths(article.value?.relatedPaths || []));

        /**
         * 让当前激活的目录项尽量保持在目录可视区域内。
         */
        const syncActiveTocIntoView = () => {
            if (isCompactTocMode.value) {
                return;
            }

            Vue.nextTick(() => {
                const tocElement = tocRoot.value;
                const activeLink = tocElement?.querySelector('.toc-item a.active');

                if (!tocElement || !activeLink) {
                    return;
                }

                activeLink.scrollIntoView({
                    block: 'nearest',
                    inline: 'nearest'
                });
            });
        };

        const scrollTo = id => {
            activeTocId.value = id;
            syncActiveTocIntoView();
            scrollToHeading(id);
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

        /**
         * 同步当前视口是否处于紧凑模式，并在移动端关闭目录联动行为。
         */
        const handleViewportChange = () => {
            isCompactTocMode.value = window.matchMedia('(max-width: 1024px)').matches;
        };

        /**
         * 根据当前页面滚动位置，计算应当高亮的目录项。
         */
        const updateActiveToc = () => {
            const contentElement = document.getElementById('article-content');

            if (!contentElement || toc.value.length === 0) {
                activeTocId.value = '';
                return;
            }

            const headerOffset = 160;
            const scrollTop = window.pageYOffset;
            const articleStart = contentElement.offsetTop - headerOffset;

            if (scrollTop < articleStart) {
                activeTocId.value = '';
                return;
            }

            let nextActiveId = toc.value[0]?.id || '';

            for (const item of toc.value) {
                const headingElement = document.getElementById(item.id);

                if (!headingElement) {
                    continue;
                }

                if (headingElement.getBoundingClientRect().top <= headerOffset) {
                    nextActiveId = item.id;
                    continue;
                }

                break;
            }

            if (activeTocId.value !== nextActiveId) {
                activeTocId.value = nextActiveId;
                syncActiveTocIntoView();
            }
        };

        const applyAnchorScroll = () => {
            const anchor = String(route.query.anchor || '');

            if (!anchor) {
                updateReadingProgress();
                updateActiveToc();
                return;
            }

            Vue.nextTick(() => {
                setTimeout(() => {
                    activeTocId.value = anchor;
                    syncActiveTocIntoView();
                    scrollTo(anchor);
                    updateReadingProgress();
                    updateActiveToc();
                }, 80);
            });
        };

        const handleScroll = () => {
            updateReadingProgress();
            updateActiveToc();
        };

        watch(() => route.query.anchor, () => {
            applyAnchorScroll();
        });

        watch(renderedContent, () => {
            applyAnchorScroll();
        });

        watch(toc, () => {
            Vue.nextTick(() => {
                updateActiveToc();
            });
        });

        watch(isCompactTocMode, () => {
            if (isCompactTocMode.value) {
                return;
            }

            syncActiveTocIntoView();
        });

        onMounted(() => {
            window.addEventListener('scroll', handleScroll);
            window.addEventListener('resize', handleScroll);
            window.addEventListener('resize', handleViewportChange);
            handleScroll();
        });

        onBeforeUnmount(() => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
            window.removeEventListener('resize', handleViewportChange);
        });

        const goToArticle = item => navigateToArticle(router, item);
        const goToSeries = seriesSlug => navigateToSeries(router, seriesSlug);
        const goToTagByName = tagName => {
            const matchedTag = findTagByName(tagName);

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
            showDesktopToc,
            progress,
            showBackToTop,
            activeTocId,
            tocRoot,
            scrollTo,
            goToArticle,
            goToSeries,
            goToTagByName,
            scrollToTop
        };
    }
};

/**
 * #endregion
 */
