const { createApp, ref, onMounted, computed, nextTick } = Vue;
const { createRouter, createWebHashHistory } = VueRouter;

/**
 * #region Utilities & Services
 */

const AppUtils = {
    /**
     * 目录配置
     */
    TOC_CONFIG: {
        t1Level: 2,      // 提取的一级标题等级
        t2Level: 3,      // 提取的二级标题等级
        showSubLevel: true // 是否显示二级标题 (相对于 minLevel)
    },

    /**
     * 格式化文章标题，移除扩展名
     */
    formatTitle(title) {
        return title ? title.replace('.md', '') : '';
    },

    /**
     * 对路径进行编码，解决特殊字符问题
     */
    encodePath(path) {
        if (!path) return '';
        return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
    }
};

const MarkdownService = {
    /**
     * 解析 Markdown 内容并提取目录
     */
    parse(text) {
        const tocItems = [];
        const renderer = new marked.Renderer();

        // 处理自定义容器标签 (:::info, :::warning, :::danger)
        const processCustomBlocks = (content) => {
            // 适配 Windows (\r\n) 和 Linux (\n) 换行符，并增强匹配灵活性
            const blockRegex = /:::(info|warning|danger)\s*[\r\n]+([\s\S]*?)[\r\n]+:::/g;

            return content.replace(blockRegex, (match, type, innerContent) => {
                // 对内部内容进行预解析，确保块级语法（如列表）在 HTML 容器内也能正确渲染
                // 使用 marked.parse 直接解析内部片段
                const parsedInner = marked.parse(innerContent.trim());
                return `<div class="custom-block ${type}">
                    <div class="custom-block-content">${parsedInner}</div>
                </div>`;
            });
        };

        const processedText = processCustomBlocks(text);

        renderer.heading = function (arg1, arg2) {
            let titleText = '';
            let level = 1;

            if (arg1 && typeof arg1 === 'object') {
                titleText = arg1.text || '';
                level = arg1.depth || 1;
            } else {
                titleText = arg1 || '';
                level = arg2 || 1;
            }

            const cleanText = titleText.replace(/\*\*|\*|__/g, '');
            const id = cleanText.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');

            const { t1Level: minLevel, t2Level: maxLevel, showSubLevel } = AppUtils.TOC_CONFIG;

            // 提取逻辑：在层级范围内，且如果不是最小层级，则需满足 showSubLevel 为 true
            const isWithinRange = level >= minLevel && level <= maxLevel;
            const isLevelAllowed = level === minLevel || showSubLevel;

            if (isWithinRange && isLevelAllowed) {
                // 计算相对层级，方便 CSS 渲染 (minLevel 为 1 级，其后依次递增)
                const relativeLevel = level - minLevel + 1;
                tocItems.push({ id, text: cleanText, level: relativeLevel });
            }

            const htmlText = marked.parseInline(titleText);
            return `<h${level} id="${id}">${htmlText}</h${level}>`;
        };

        const htmlContent = marked.parse(processedText, {
            renderer: renderer,
            breaks: true,
            gfm: true,
            async: false
        });

        // 兜底逻辑
        if (tocItems.length === 0) {
            const tokens = marked.lexer(processedText);
            const { t1Level: minLevel, t2Level: maxLevel, showSubLevel } = AppUtils.TOC_CONFIG;

            tokens.forEach(token => {
                if (token.type === 'heading') {
                    const level = token.depth;
                    const isWithinRange = level >= minLevel && level <= maxLevel;
                    const isLevelAllowed = level === minLevel || showSubLevel;

                    if (isWithinRange && isLevelAllowed) {
                        const cleanText = token.text.replace(/\*\*|\*|__/g, '');
                        const id = cleanText.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
                        const relativeLevel = level - minLevel + 1;
                        tocItems.push({ id, text: cleanText, level: relativeLevel });
                    }
                }
            });
        }

        return { htmlContent, tocItems };
    },

    /**
     * 高亮代码块
     */
    highlightCode() {
        nextTick(() => {
            document.querySelectorAll('pre code').forEach((el) => {
                if (!el.className) {
                    el.classList.add('language-csharp');
                }
                hljs.highlightElement(el);
            });
        });
    }
};

/**
 * #endregion
 */

/**
 * #region Components
 */

// 通用面包屑组件
const Breadcrumb = {
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

// 通用加载动画组件
const LoadingSpinner = {
    template: `<div class="loading-spinner"></div>`
};

// 首页组件：显示知识模块
const HomeView = {
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
        const modules = ref(window.BLOG_MODULES || []);
        const router = VueRouter.useRouter();

        const goToModule = (name) => {
            router.push({ name: 'list', query: { module: name } });
        };

        return { modules, goToModule };
    }
};

// 列表页组件：显示章节和文章
const ListView = {
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
            return (window.BLOG_MODULES || []).find(m => m.name === moduleName.value);
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

// 文章页组件：显示 Markdown 内容
const ArticleView = {
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

                <!-- 目录栏 -->
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
                // 增加头部偏移量 (header + breadcrumb 高度)
                const headerOffset = 200;
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

// 404 页面组件
const NotFoundView = {
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

/**
 * #endregion
 */

/**
 * #region Router & App Setup
 */

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
    // 这里可以添加生产环境的错误上报逻辑
};

app.use(router);
app.mount('#app');

/**
 * #endregion
 */
