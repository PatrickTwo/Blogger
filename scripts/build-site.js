import { buildSite } from './site-builder.js';

try {
    const result = buildSite();

    console.log(`站点构建完成：${result.articleCount} 篇文章，${result.pageCount} 个独立页面。`);

    if (result.warningCount > 0) {
        console.warn(`发现 ${result.warningCount} 条内容警告：`);
        for (const warning of result.warnings.slice(0, 20)) {
            console.warn(`- ${warning}`);
        }

        if (result.warningCount > 20) {
            console.warn(`- 其余 ${result.warningCount - 20} 条警告已省略，可通过 node scripts/check-content.js 查看完整结果。`);
        }
    }
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
