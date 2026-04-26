/**
 * #region Site Builder
 * 统一构建站点索引、RSS、Sitemap、robots，并执行内容校验
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractFrontMatter, slugify, stripMarkdown } from '../js/text-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const articlesDir = path.join(projectRoot, 'Resources', 'Articles');
const configFile = path.join(projectRoot, 'Resources', 'site.config.json');
const dataOutputFile = path.join(projectRoot, 'js', 'modules_data.js');
const rssOutputFile = path.join(projectRoot, 'rss.xml');
const sitemapOutputFile = path.join(projectRoot, 'sitemap.xml');
const robotsOutputFile = path.join(projectRoot, 'robots.txt');
const knownSiteRoutes = new Set(['/', '/article', '/list', '/search', '/archive', '/tags', '/series', '/about']);

const defaultConfig = {
    title: '开发日志',
    description: '记录 C#、Unity、网络编程、设计模式与工程实践的学习和总结。',
    author: 'wangl',
    siteUrl: 'https://patricktwo.github.io/Blogger',
    defaultKeywords: ['C#', 'Unity', '网络编程', '设计模式', '个人博客'],
    socialPreviewImage: 'Resources/Assets/image.png'
};

function readUtf8(filePath) {
    return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function writeUtf8(filePath, content) {
    fs.writeFileSync(filePath, content, 'utf8');
}

function fileExists(filePath) {
    return fs.existsSync(filePath);
}

function ensureDirectory(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
}

function escapeXml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function sanitizeText(value) {
    return String(value ?? '')
        .replace(/\r/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeDate(rawValue, fallbackDate) {
    if (!rawValue) {
        return fallbackDate.toISOString();
    }

    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) {
        return fallbackDate.toISOString();
    }

    return parsed.toISOString();
}

function toDisplayDate(isoString) {
    return isoString.slice(0, 10);
}

function cleanChapterLabel(chapterName) {
    return String(chapterName ?? '')
        .replace(/^[A-Z]\./, '')
        .replace(/^\d+\./, '')
        .trim();
}

function extractSummary(body, explicitSummary) {
    if (explicitSummary) {
        return sanitizeText(explicitSummary);
    }

    const paragraphs = body
        .split(/\r?\n\r?\n/)
        .map(block => stripMarkdown(block))
        .filter(block => block.length > 20);

    if (paragraphs.length > 0) {
        return paragraphs[0].slice(0, 140);
    }

    return '暂无摘要';
}

function estimateReadingMinutes(body) {
    const content = stripMarkdown(body);
    const length = content.replace(/\s+/g, '').length;

    if (length <= 0) {
        return 1;
    }

    return Math.max(1, Math.ceil(length / 320));
}

function getHeadingIds(markdown) {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const ids = [];
    let match = headingRegex.exec(markdown);

    while (match) {
        const titleText = match[2].replace(/\*\*|\*|__|~~/g, '');
        ids.push(slugify(titleText));
        match = headingRegex.exec(markdown);
    }

    return ids;
}

function createHashRoute(routePath, query = {}) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') {
            continue;
        }

        params.set(key, String(value));
    }

    const queryString = params.toString();
    return `#${routePath}${queryString ? `?${queryString}` : ''}`;
}

function createAbsoluteUrl(siteUrl, routePath, query = {}) {
    const normalizedSiteUrl = siteUrl.replace(/\/+$/, '');
    return `${normalizedSiteUrl}/${createHashRoute(routePath, query)}`;
}

function getRelativeAssetPath(fromFilePath, targetPath) {
    const sourceDirectory = path.dirname(fromFilePath);
    const resolvedPath = path.resolve(sourceDirectory, targetPath);
    return resolvedPath;
}

function resolveLinkedFilePath(fromFilePath, targetPath) {
    const sameDirectoryPath = getRelativeAssetPath(fromFilePath, targetPath);

    if (fileExists(sameDirectoryPath)) {
        return sameDirectoryPath;
    }

    const assetFallbackPath = path.join(projectRoot, 'Resources', 'Assets', path.basename(targetPath));

    if (fileExists(assetFallbackPath)) {
        return assetFallbackPath;
    }

    return sameDirectoryPath;
}

function collectMarkdownLinks(markdownText) {
    const links = [];
    const regex = /!?\[[^\]]*]\(([^)]+)\)/g;
    let match = regex.exec(markdownText);

    while (match) {
        links.push(match[1].trim());
        match = regex.exec(markdownText);
    }

    return links;
}

function normalizeArticleAlias(value) {
    return String(value ?? '')
        .trim()
        .replace(/^\/+/, '')
        .replace(/\.md$/i, '')
        .trim();
}

function buildArticleAliasMap(articles) {
    const aliasMap = new Map();

    for (const article of articles) {
        const aliases = [
            normalizeArticleAlias(path.basename(article.path, '.md')),
            normalizeArticleAlias(article.title)
        ].filter(Boolean);

        for (const alias of aliases) {
            if (!aliasMap.has(alias)) {
                aliasMap.set(alias, article.path);
            }
        }
    }

    return aliasMap;
}

function isKnownSiteRoute(targetPath) {
    const routePath = String(targetPath ?? '').split('?')[0] || '/';
    return knownSiteRoutes.has(routePath);
}

function resolveProjectRootPath(targetPath) {
    const sanitizedPath = String(targetPath ?? '').replace(/^\/+/, '');

    if (!sanitizedPath) {
        return '';
    }

    return path.join(projectRoot, sanitizedPath);
}

function resolveMarkdownLinkTarget(fromFilePath, targetPath, articleAliasMap) {
    const sanitizedTargetPath = String(targetPath ?? '').trim();

    if (!sanitizedTargetPath) {
        return '';
    }

    if (sanitizedTargetPath.startsWith('/')) {
        if (isKnownSiteRoute(sanitizedTargetPath)) {
            return '__site_route__';
        }

        const articleAlias = normalizeArticleAlias(sanitizedTargetPath);
        if (articleAliasMap.has(articleAlias)) {
            return '__article_route__';
        }

        return resolveProjectRootPath(sanitizedTargetPath);
    }

    return resolveLinkedFilePath(fromFilePath, sanitizedTargetPath);
}

function loadSiteConfig() {
    if (!fileExists(configFile)) {
        return defaultConfig;
    }

    const rawConfig = JSON.parse(readUtf8(configFile));
    const { analytics, ...restConfig } = rawConfig;

    return {
        ...defaultConfig,
        ...restConfig
    };
}

function inferArticleClassification(filePath, metadata) {
    const relativePath = path.relative(articlesDir, filePath);
    const pathSegments = relativePath.split(path.sep).filter(Boolean);
    const legacyCategory = pathSegments.length > 1 ? sanitizeText(pathSegments[0]) : '';
    const legacySubcategory = pathSegments.length > 2 ? sanitizeText(pathSegments[1]) : '';
    const category = sanitizeText(metadata.category || legacyCategory || '未分类');
    const subcategory = sanitizeText(metadata.subcategory || metadata.chapter || legacySubcategory || '');

    return {
        category,
        subcategory
    };
}

function createArticleRecord(filePath, siteConfig) {
    const rawText = readUtf8(filePath);
    const { metadata, body } = extractFrontMatter(rawText);
    const stats = fs.statSync(filePath);
    const { category, subcategory } = inferArticleClassification(filePath, metadata);
    const titleFromFile = path.basename(filePath, '.md');
    const explicitTags = Array.isArray(metadata.tags) ? metadata.tags : [];
    const fallbackTags = [category, cleanChapterLabel(subcategory)].filter(Boolean);
    const tags = [...new Set((explicitTags.length > 0 ? explicitTags : fallbackTags).map(tag => sanitizeText(tag)).filter(Boolean))];
    const orderMatch = titleFromFile.match(/^(\d+)\./);
    const order = metadata.order ?? (orderMatch ? Number(orderMatch[1]) : null);
    const date = normalizeDate(metadata.date, stats.birthtime);
    const updatedAt = normalizeDate(metadata.updatedAt, stats.mtime);
    const pathRelativeToProject = path.relative(projectRoot, filePath).replace(/\\/g, '/');
    const title = sanitizeText(metadata.title || titleFromFile);
    const summary = extractSummary(body, metadata.summary);
    const series = sanitizeText(metadata.series || '');
    const slug = slugify(title);
    const routeQuery = { path: pathRelativeToProject };

    return {
        title,
        summary,
        tags,
        category,
        subcategory,
        series,
        seriesSlug: series ? slugify(series) : '',
        order,
        date,
        updatedAt,
        draft: Boolean(metadata.draft),
        path: pathRelativeToProject,
        slug,
        route: createHashRoute('/article', routeQuery),
        url: createAbsoluteUrl(siteConfig.siteUrl, '/article', routeQuery),
        readMinutes: estimateReadingMinutes(body),
        headings: getHeadingIds(body),
        metadata,
        body,
        filePath
    };
}

function collectArticleFilePaths(directoryPath) {
    if (!fileExists(directoryPath)) {
        return [];
    }

    const articleFilePaths = [];

    const visit = (currentDirectoryPath) => {
        const directoryEntries = fs.readdirSync(currentDirectoryPath, { withFileTypes: true });

        for (const entry of directoryEntries) {
            const entryPath = path.join(currentDirectoryPath, entry.name);

            if (entry.isDirectory()) {
                visit(entryPath);
                continue;
            }

            if (entry.isFile() && entry.name.endsWith('.md')) {
                articleFilePaths.push(entryPath);
            }
        }
    };

    visit(directoryPath);
    return articleFilePaths;
}

function collectArticles(siteConfig) {
    return collectArticleFilePaths(articlesDir).map(filePath => createArticleRecord(filePath, siteConfig));
}

function sortArticles(articles) {
    return [...articles].sort((left, right) => {
        const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;

        if (left.category !== right.category) {
            return left.category.localeCompare(right.category, 'zh-CN');
        }

        if ((left.subcategory || '') !== (right.subcategory || '')) {
            return (left.subcategory || '').localeCompare(right.subcategory || '', 'zh-CN');
        }

        if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
        }

        return left.title.localeCompare(right.title, 'zh-CN');
    });
}

function buildArticleRelations(publishedArticles) {
    const articleMap = new Map(publishedArticles.map(article => [article.path, article]));
    const relations = new Map();
    const groupedByCategory = new Map();
    const groupedBySeries = new Map();

    for (const article of publishedArticles) {
        const categoryKey = `${article.category}::${article.subcategory || '__root__'}`;
        const categoryArticles = groupedByCategory.get(categoryKey) || [];
        categoryArticles.push(article);
        groupedByCategory.set(categoryKey, categoryArticles);

        if (article.seriesSlug) {
            const seriesArticles = groupedBySeries.get(article.seriesSlug) || [];
            seriesArticles.push(article);
            groupedBySeries.set(article.seriesSlug, seriesArticles);
        }
    }

    for (const articles of groupedByCategory.values()) {
        const sorted = [...articles].sort((left, right) => {
            const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
            const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;

            if (leftOrder !== rightOrder) {
                return leftOrder - rightOrder;
            }

            return left.title.localeCompare(right.title, 'zh-CN');
        });

        for (let index = 0; index < sorted.length; index += 1) {
            const current = sorted[index];
            const previous = sorted[index - 1];
            const next = sorted[index + 1];
            const currentRelation = relations.get(current.path) || {};

            relations.set(current.path, {
                ...currentRelation,
                previousPath: previous?.path || '',
                nextPath: next?.path || ''
            });
        }
    }

    for (const article of publishedArticles) {
        const relatedCandidates = publishedArticles
            .filter(candidate => candidate.path !== article.path)
            .map(candidate => {
                const sharedTags = candidate.tags.filter(tag => article.tags.includes(tag)).length;
                const sameCategory = candidate.category === article.category ? 1 : 0;
                const sameSubcategory = candidate.subcategory && candidate.subcategory === article.subcategory ? 1 : 0;
                const score = sharedTags * 10 + sameCategory * 3 + sameSubcategory * 2;

                return { candidate, score };
            })
            .filter(item => item.score > 0)
            .sort((left, right) => right.score - left.score || right.candidate.updatedAt.localeCompare(left.candidate.updatedAt))
            .slice(0, 3)
            .map(item => item.candidate.path);

        const seriesItems = article.seriesSlug
            ? (groupedBySeries.get(article.seriesSlug) || []).filter(item => item.path !== article.path).map(item => item.path)
            : [];

        const currentRelation = relations.get(article.path) || {};

        relations.set(article.path, {
            ...currentRelation,
            relatedPaths: relatedCandidates,
            seriesPaths: seriesItems
        });
    }

    return relations;
}

function buildCategories(publishedArticles) {
    const categoryMap = new Map();

    for (const article of sortArticles(publishedArticles)) {
        const currentCategory = categoryMap.get(article.category) || {
            name: article.category,
            slug: slugify(article.category),
            path: createHashRoute('/list', { category: article.category }),
            subcategories: [],
            articles: []
        };

        if (article.subcategory) {
            let subcategory = currentCategory.subcategories.find(item => item.name === article.subcategory);

            if (!subcategory) {
                subcategory = {
                    name: article.subcategory,
                    slug: slugify(article.subcategory),
                    path: createHashRoute('/list', { category: article.category, subcategory: article.subcategory }),
                    articles: []
                };
                currentCategory.subcategories.push(subcategory);
            }

            subcategory.articles.push(article);
        } else {
            currentCategory.articles.push(article);
        }

        categoryMap.set(article.category, currentCategory);
    }

    return [...categoryMap.values()].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
}

function buildTags(publishedArticles) {
    const tagMap = new Map();

    for (const article of publishedArticles) {
        for (const tagName of article.tags) {
            const slug = slugify(tagName);
            const currentTag = tagMap.get(slug) || {
                name: tagName,
                slug,
                count: 0,
                articlePaths: [],
                latestUpdatedAt: article.updatedAt
            };

            currentTag.count += 1;
            currentTag.articlePaths.push(article.path);
            currentTag.latestUpdatedAt = currentTag.latestUpdatedAt > article.updatedAt ? currentTag.latestUpdatedAt : article.updatedAt;
            tagMap.set(slug, currentTag);
        }
    }

    return [...tagMap.values()].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'zh-CN'));
}

function buildSeries(publishedArticles) {
    const seriesMap = new Map();

    for (const article of publishedArticles) {
        if (!article.seriesSlug) {
            continue;
        }

        const currentSeries = seriesMap.get(article.seriesSlug) || {
            name: article.series,
            slug: article.seriesSlug,
            count: 0,
            categoryNames: [],
            categoryLabel: '',
            articlePaths: [],
            updatedAt: article.updatedAt
        };

        currentSeries.count += 1;
        currentSeries.categoryNames = [...new Set([...currentSeries.categoryNames, article.category])];
        currentSeries.categoryLabel = currentSeries.categoryNames.length === 1
            ? currentSeries.categoryNames[0]
            : `${currentSeries.categoryNames[0]} 等 ${currentSeries.categoryNames.length} 个分类`;
        currentSeries.articlePaths.push(article.path);
        currentSeries.updatedAt = currentSeries.updatedAt > article.updatedAt ? currentSeries.updatedAt : article.updatedAt;
        seriesMap.set(article.seriesSlug, currentSeries);
    }

    return [...seriesMap.values()]
        .map(series => ({
            ...series,
            articlePaths: [...series.articlePaths]
        }))
        .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'zh-CN'));
}

function buildArchives(publishedArticles) {
    const archiveMap = new Map();

    for (const article of publishedArticles) {
        const yearMonth = article.updatedAt.slice(0, 7);
        const currentArchive = archiveMap.get(yearMonth) || {
            key: yearMonth,
            year: yearMonth.slice(0, 4),
            month: yearMonth.slice(5, 7),
            count: 0,
            articlePaths: []
        };

        currentArchive.count += 1;
        currentArchive.articlePaths.push(article.path);
        archiveMap.set(yearMonth, currentArchive);
    }

    return [...archiveMap.values()].sort((left, right) => right.key.localeCompare(left.key));
}

function validateContent(allArticles) {
    const warnings = [];
    const errors = [];
    const titleMap = new Map();
    const articleAliasMap = buildArticleAliasMap(allArticles);

    for (const article of allArticles) {
        const duplicatedPath = titleMap.get(article.title);

        if (duplicatedPath) {
            warnings.push(`文章标题重复：${article.title} -> ${duplicatedPath} 与 ${article.path}`);
        } else {
            titleMap.set(article.title, article.path);
        }

        if (!article.metadata.title) {
            warnings.push(`文章缺少 Front Matter title，已降级使用文件名：${article.path}`);
        }

        if (!article.metadata.date) {
            warnings.push(`文章缺少 Front Matter date，已降级使用文件创建时间：${article.path}`);
        }

        if (article.tags.length === 0) {
            warnings.push(`文章未提供可用标签：${article.path}`);
        }

        const links = collectMarkdownLinks(article.body);

        for (const link of links) {
            if (!link || /^https?:\/\//i.test(link) || /^mailto:/i.test(link)) {
                continue;
            }

            if (link.startsWith('#')) {
                const anchorId = slugify(link.slice(1));

                if (!article.headings.includes(anchorId)) {
                    warnings.push(`文章存在无效锚点链接：${article.path} -> ${link}`);
                }

                continue;
            }

            const sanitizedLink = link.split('#')[0];
            if (!sanitizedLink) {
                continue;
            }

            const resolvedPath = resolveMarkdownLinkTarget(article.filePath, sanitizedLink, articleAliasMap);

            if (resolvedPath === '__site_route__' || resolvedPath === '__article_route__') {
                continue;
            }

            if (!fileExists(resolvedPath)) {
                errors.push(`文章存在无效相对路径：${article.path} -> ${link}`);
            }
        }
    }

    const seriesGroups = new Map();

    for (const article of allArticles.filter(item => item.seriesSlug)) {
        const currentGroup = seriesGroups.get(article.seriesSlug) || [];
        currentGroup.push(article);
        seriesGroups.set(article.seriesSlug, currentGroup);
    }

    for (const [seriesSlug, articles] of seriesGroups) {
        const duplicateOrders = new Map();

        for (const article of articles) {
            if (article.order === null || article.order === undefined) {
                warnings.push(`系列文章缺少 order，系列排序可能不稳定：${seriesSlug} -> ${article.path}`);
                continue;
            }

            const currentOrderArticles = duplicateOrders.get(article.order) || [];
            currentOrderArticles.push(article.path);
            duplicateOrders.set(article.order, currentOrderArticles);
        }

        for (const [order, articlePaths] of duplicateOrders) {
            if (articlePaths.length > 1) {
                warnings.push(`系列文章 order 重复：${seriesSlug} -> ${order} -> ${articlePaths.join(', ')}`);
            }
        }
    }

    return { warnings, errors };
}

function buildRss(siteConfig, publishedArticles) {
    const items = publishedArticles
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 20)
        .map(article => `
        <item>
            <title>${escapeXml(article.title)}</title>
            <link>${escapeXml(article.url)}</link>
            <guid>${escapeXml(article.url)}</guid>
            <description>${escapeXml(article.summary)}</description>
            <pubDate>${new Date(article.updatedAt).toUTCString()}</pubDate>
            <category>${escapeXml(article.category)}</category>
        </item>`)
        .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
    <channel>
        <title>${escapeXml(siteConfig.title)}</title>
        <link>${escapeXml(siteConfig.siteUrl)}</link>
        <description>${escapeXml(siteConfig.description)}</description>
        <language>zh-CN</language>
        ${items}
    </channel>
</rss>
`;
}

function buildSitemap(siteConfig, categories, articles, tags, series) {
    const urls = [];

    urls.push(siteConfig.siteUrl);
    urls.push(createAbsoluteUrl(siteConfig.siteUrl, '/archive'));
    urls.push(createAbsoluteUrl(siteConfig.siteUrl, '/tags'));
    urls.push(createAbsoluteUrl(siteConfig.siteUrl, '/series'));
    urls.push(createAbsoluteUrl(siteConfig.siteUrl, '/about'));

    for (const category of categories) {
        urls.push(createAbsoluteUrl(siteConfig.siteUrl, '/list', { category: category.name }));
    }

    for (const article of articles) {
        urls.push(article.url);
    }

    for (const tag of tags) {
        urls.push(createAbsoluteUrl(siteConfig.siteUrl, '/tags', { tag: tag.slug }));
    }

    for (const currentSeries of series) {
        urls.push(createAbsoluteUrl(siteConfig.siteUrl, '/series', { slug: currentSeries.slug }));
    }

    const uniqueUrls = [...new Set(urls)];
    const items = uniqueUrls.map(url => `
    <url>
        <loc>${escapeXml(url)}</loc>
    </url>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>
`;
}

function buildRobots(siteConfig) {
    return `User-agent: *
Allow: /

Sitemap: ${siteConfig.siteUrl.replace(/\/+$/, '')}/sitemap.xml
`;
}

function createSiteDataModule(siteConfig, categories, articles, tags, series, archives) {
    const exportComment = `/**
 * 自动生成的站点数据
 * 请勿手动修改此文件，使用 node scripts/build-site.js 重新生成
 */`;

    return `${exportComment}
export const SITE_META = ${JSON.stringify(siteConfig, null, 4)};
export const BLOG_CATEGORIES = ${JSON.stringify(categories, null, 4)};
export const BLOG_ARTICLES = ${JSON.stringify(articles, null, 4)};
export const BLOG_TAGS = ${JSON.stringify(tags, null, 4)};
export const BLOG_SERIES = ${JSON.stringify(series, null, 4)};
export const BLOG_ARCHIVES = ${JSON.stringify(archives, null, 4)};
`;
}

export function buildSite() {
    ensureDirectory(path.dirname(dataOutputFile));

    const siteConfig = loadSiteConfig();
    const allArticles = collectArticles(siteConfig);
    const validationResult = validateContent(allArticles);

    if (validationResult.errors.length > 0) {
        throw new Error(`内容校验失败：\n${validationResult.errors.map(item => `- ${item}`).join('\n')}`);
    }

    const publishedArticles = sortArticles(allArticles.filter(article => !article.draft));
    const relations = buildArticleRelations(publishedArticles);
    const enrichedArticles = publishedArticles.map(article => ({
        ...article,
        metadata: undefined,
        body: undefined,
        filePath: undefined,
        headings: article.headings,
        displayDate: toDisplayDate(article.date),
        displayUpdatedAt: toDisplayDate(article.updatedAt),
        ...relations.get(article.path)
    }));
    const categories = buildCategories(enrichedArticles);
    const tags = buildTags(enrichedArticles);
    const series = buildSeries(enrichedArticles);
    const archives = buildArchives(enrichedArticles);
    const siteDataModule = createSiteDataModule(siteConfig, categories, enrichedArticles, tags, series, archives);
    const rssContent = buildRss(siteConfig, enrichedArticles);
    const sitemapContent = buildSitemap(siteConfig, categories, enrichedArticles, tags, series);
    const robotsContent = buildRobots(siteConfig);

    writeUtf8(dataOutputFile, siteDataModule);
    writeUtf8(rssOutputFile, rssContent);
    writeUtf8(sitemapOutputFile, sitemapContent);
    writeUtf8(robotsOutputFile, robotsContent);

    return {
        articleCount: enrichedArticles.length,
        pageCount: 1,
        warningCount: validationResult.warnings.length,
        warnings: validationResult.warnings
    };
}

export function checkContent() {
    const siteConfig = loadSiteConfig();
    const allArticles = collectArticles(siteConfig);
    return validateContent(allArticles);
}

/**
 * #endregion
 */
