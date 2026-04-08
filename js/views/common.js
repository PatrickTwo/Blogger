/**
 * #region 通用视图组件
 */

import { buildArticleCardMeta, findArticlesByKeyword, navigateToArticle } from '../view-helpers.js';

const { ref, computed, watch, onMounted, onBeforeUnmount } = Vue;

export const Breadcrumb = {
    props: {
        categoryName: String,
        articleTitle: String
    },
    template: `
        <nav class="breadcrumb">
            <router-link to="/">首页</router-link>
            <template v-if="categoryName">
                <span class="separator">/</span>
                <router-link v-if="articleTitle" :to="{ name: 'list', query: { category: categoryName } }">
                    {{ categoryName }}
                </router-link>
                <span v-else class="current">{{ categoryName }}</span>
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
        const normalizedKeyword = computed(() => String(keyword.value || '').trim().toLowerCase());
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
