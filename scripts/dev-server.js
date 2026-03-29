/**
 * #region 本地开发服务器
 * 提供一键启动静态服务并自动打开浏览器的能力。
 */

import fs from 'fs';
import http from 'http';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import { openBrowser, resolveTargetUrl } from './open-local.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp',
    '.xml': 'application/xml; charset=utf-8'
};

/**
 * 解析命令行参数。
 * @returns {{ shouldOpen: boolean, routeTarget: string, port: number, host: string, showHelp: boolean }} 参数结果
 */
function parseArguments() {
    const args = process.argv.slice(2);
    let shouldOpen = false;
    let routeTarget = '';
    let port = Number(process.env.BLOGGER_LOCAL_PORT || 8080);
    let host = process.env.BLOGGER_LOCAL_HOST || '127.0.0.1';
    let showHelp = false;

    for (let index = 0; index < args.length; index += 1) {
        const currentArg = String(args[index] || '').trim();

        if (!currentArg) {
            continue;
        }

        if (currentArg === '--open') {
            shouldOpen = true;
            continue;
        }

        if (currentArg === '--help' || currentArg === '-h') {
            showHelp = true;
            continue;
        }

        if (currentArg === '--port') {
            const portArg = Number(args[index + 1]);
            if (!Number.isNaN(portArg) && portArg > 0) {
                port = portArg;
                index += 1;
            }
            continue;
        }

        if (currentArg === '--host') {
            const hostArg = String(args[index + 1] || '').trim();
            if (hostArg) {
                host = hostArg;
                index += 1;
            }
            continue;
        }

        if (!routeTarget) {
            routeTarget = currentArg;
        }
    }

    return { shouldOpen, routeTarget, port, host, showHelp };
}

/**
 * 输出帮助信息。
 */
function printHelp() {
    console.log('用法：');
    console.log('node scripts/dev-server.js');
    console.log('node scripts/dev-server.js --open');
    console.log('node scripts/dev-server.js --open /#/archive');
    console.log('node scripts/dev-server.js --port 9000 --open');
}

/**
 * 获取请求路径对应的本地文件。
 * @param {string} requestUrl - 请求地址
 * @returns {string} 本地文件路径
 */
function resolveFilePath(requestUrl) {
    const parsedUrl = new URL(requestUrl, 'http://127.0.0.1');
    const decodedPath = decodeURIComponent(parsedUrl.pathname);
    const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[\\/])+/, '');
    let filePath = path.join(projectRoot, normalizedPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    if (!path.extname(filePath) && !fs.existsSync(filePath)) {
        filePath = path.join(projectRoot, 'index.html');
    }

    return filePath;
}

/**
 * 获取响应内容类型。
 * @param {string} filePath - 文件路径
 * @returns {string} Content-Type
 */
function getContentType(filePath) {
    return mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

/**
 * 创建静态文件服务器。
 * @returns {http.Server} 服务实例
 */
function createStaticServer() {
    return http.createServer((request, response) => {
        const requestUrl = request.url || '/';
        const filePath = resolveFilePath(requestUrl);

        fs.readFile(filePath, (error, fileBuffer) => {
            if (error) {
                response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                response.end('未找到请求资源');
                return;
            }

            response.writeHead(200, { 'Content-Type': getContentType(filePath) });
            response.end(fileBuffer);
        });
    });
}

/**
 * 启动本地开发服务器。
 */
function startServer() {
    const options = parseArguments();

    if (options.showHelp) {
        printHelp();
        return;
    }

    process.env.BLOGGER_LOCAL_URL = `http://${options.host}:${options.port}`;
    const server = createStaticServer();

    server.on('error', error => {
        console.error(`本地服务器启动失败：${error.message}`);
        process.exit(1);
    });

    server.listen(options.port, options.host, () => {
        const homeUrl = resolveTargetUrl('');
        console.log(`本地服务器已启动：${homeUrl}`);

        if (options.shouldOpen) {
            openBrowser(options.routeTarget);
        } else {
            console.log('可追加 --open 参数，在启动后自动打开浏览器。');
        }
    });
}

startServer();

/**
 * #endregion
 */
