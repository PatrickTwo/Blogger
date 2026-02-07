/**
 * #region Article Index Generator
 * 自动扫描 Resources/Articles 目录并生成 js/modules_data.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const articlesDir = path.join(__dirname, '../Resources/Articles');
const outputFile = path.join(__dirname, '../js/modules_data.js');

function scanDirectory(dir) {
    const chapters = [];
    if (!fs.existsSync(dir)) return chapters;

    const items = fs.readdirSync(dir);

    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            const articles = fs.readdirSync(fullPath)
                .filter(file => file.endsWith('.md'))
                .map(file => ({
                    title: file,
                    path: path.relative(path.join(__dirname, '..'), path.join(fullPath, file)).replace(/\\/g, '/')
                }));
            
            if (articles.length > 0) {
                chapters.push({
                    name: item,
                    path: path.relative(path.join(__dirname, '..'), fullPath).replace(/\\/g, '/'),
                    articles: articles
                });
            }
        }
    });
    return chapters;
}

function generate() {
    console.log('开始扫描文章目录...');
    
    if (!fs.existsSync(articlesDir)) {
        console.error('错误: 找不到目录 ' + articlesDir);
        process.exit(1);
    }

    const modules = fs.readdirSync(articlesDir)
        .filter(item => fs.statSync(path.join(articlesDir, item)).isDirectory())
        .map(moduleName => {
            const modulePath = path.join(articlesDir, moduleName);
            // #region 扫描模块根目录下的文章
            const articles = fs.readdirSync(modulePath)
                .filter(file => {
                    const fullPath = path.join(modulePath, file);
                    return fs.statSync(fullPath).isFile() && file.endsWith('.md');
                })
                .map(file => ({
                    title: file,
                    path: path.relative(path.join(__dirname, '..'), path.join(modulePath, file)).replace(/\\/g, '/')
                }));
            // #endregion

            return {
                name: moduleName,
                path: `Resources/Articles/${moduleName}`,
                chapters: scanDirectory(modulePath),
                articles: articles
            };
        });

    const content = `/**
 * 自动生成的文章索引数据
 * 请勿手动修改此文件，使用 node scripts/generate-data.js 重新生成
 */
export const BLOG_MODULES = ${JSON.stringify(modules, null, 4)};`;

    fs.writeFileSync(outputFile, content);
    console.log('✅ js/modules_data.js 已自动更新');
}

generate();

/**
 * #endregion
 */
