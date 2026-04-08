/**
 * #region 共享文本工具
 * 这组纯函数同时给前端运行时和构建脚本使用，避免同一套规则维护两份。
 */

/**
 * 解析 Front Matter 中的标量值。
 * @param {string} rawValue - 原始值
 * @returns {string | number | boolean}
 */
function parseScalar(rawValue) {
    const value = String(rawValue || '').trim();

    if (!value) {
        return '';
    }

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        return value.slice(1, -1);
    }

    if (value === 'true') {
        return true;
    }

    if (value === 'false') {
        return false;
    }

    if (/^-?\d+(\.\d+)?$/.test(value)) {
        return Number(value);
    }

    return value;
}

/**
 * 解析 Front Matter 中的数组值。
 * @param {string} rawValue - 原始值
 * @returns {string[]}
 */
function parseArray(rawValue) {
    const value = String(rawValue || '').trim();

    if (!value) {
        return [];
    }

    if (value.startsWith('[') && value.endsWith(']')) {
        return value
            .slice(1, -1)
            .split(',')
            .map(item => String(parseScalar(item)).trim())
            .filter(Boolean);
    }

    return value
        .split(',')
        .map(item => String(parseScalar(item)).trim())
        .filter(Boolean);
}

/**
 * 从 Markdown 中解析 Front Matter。
 * @param {string} rawText - 原始 Markdown 内容
 * @returns {{ metadata: Record<string, string | number | boolean | string[]>, body: string }}
 */
export function extractFrontMatter(rawText) {
    const text = String(rawText || '').replace(/^\uFEFF/, '');

    if (!text.startsWith('---')) {
        return { metadata: {}, body: text };
    }

    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

    if (!match) {
        return { metadata: {}, body: text };
    }

    const metadataBlock = match[1];
    const metadata = {};

    for (const line of metadataBlock.split(/\r?\n/)) {
        const trimmedLine = line.trim();

        if (!trimmedLine || trimmedLine.startsWith('#')) {
            continue;
        }

        const separatorIndex = line.indexOf(':');

        if (separatorIndex <= 0) {
            continue;
        }

        const key = line.slice(0, separatorIndex).trim();
        const rawValue = line.slice(separatorIndex + 1);
        const lowerKey = key.toLowerCase();

        if (lowerKey === 'tags' || lowerKey === 'keywords') {
            metadata[key] = parseArray(rawValue);
            continue;
        }

        metadata[key] = parseScalar(rawValue);
    }

    return {
        metadata,
        body: text.slice(match[0].length)
    };
}

/**
 * 生成稳定的 slug。
 * @param {string} value - 原始文本
 * @returns {string}
 */
export function slugify(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * 去除 Markdown 常见标记，提取纯文本。
 * @param {string} markdown - Markdown 内容
 * @returns {string}
 */
export function stripMarkdown(markdown) {
    return String(markdown || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`[^`]*`/g, ' ')
        .replace(/!\[[^\]]*]\(([^)]+)\)/g, ' ')
        .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^>\s?/gm, '')
        .replace(/^[-*+]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        .replace(/[*_~>#]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * #endregion
 */
