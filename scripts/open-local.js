/**
 * #region 本地页面打开脚本
 * 用于在本地服务启动后，快速打开指定页面。
 */

import { exec } from 'child_process';
import process from 'process';
import { pathToFileURL } from 'url';

/**
 * 获取命令行传入的目标地址或路由。
 * 支持：
 * 1. 完整 URL，例如 https://example.com
 * 2. 站内路由，例如 /#/archive
 * 3. 仅 hash 路由，例如 #/archive
 * 4. 空参数，默认打开首页
 * @returns {string} 规范化后的完整访问地址
 */
export function resolveTargetUrl(rawTarget = '') {
    const defaultBaseUrl = process.env.BLOGGER_LOCAL_URL || 'http://127.0.0.1:8080';
    const normalizedTarget = String(rawTarget || '').trim();

    if (!normalizedTarget) {
        return defaultBaseUrl;
    }

    if (/^https?:\/\//i.test(normalizedTarget)) {
        return normalizedTarget;
    }

    if (normalizedTarget.startsWith('#')) {
        return `${defaultBaseUrl}/${normalizedTarget}`;
    }

    if (normalizedTarget.startsWith('/')) {
        return `${defaultBaseUrl}${normalizedTarget}`;
    }

    return `${defaultBaseUrl}/#/${normalizedTarget.replace(/^#?\/?/, '')}`;
}

/**
 * 根据当前平台构建打开浏览器的命令。
 * @param {string} targetUrl - 目标地址
 * @returns {string} 可执行命令
 */
export function buildOpenCommand(targetUrl) {
    if (process.platform === 'win32') {
        return `start "" "${targetUrl}"`;
    }

    if (process.platform === 'darwin') {
        return `open "${targetUrl}"`;
    }

    return `xdg-open "${targetUrl}"`;
}

/**
 * 打开浏览器。
 */
export function openBrowser(rawTarget = '') {
    const targetUrl = resolveTargetUrl(rawTarget);
    const command = buildOpenCommand(targetUrl);

    exec(command, error => {
        if (error) {
            console.error(`打开页面失败：${error.message}`);
            process.exit(1);
        }

        console.log(`已打开页面：${targetUrl}`);
    });
}

const currentFileUrl = pathToFileURL(process.argv[1] || '').href;
const isDirectRun = import.meta.url === currentFileUrl;

if (isDirectRun) {
    openBrowser(process.argv[2] || '');
}

/**
 * #endregion
 */
