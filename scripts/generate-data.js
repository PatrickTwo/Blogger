import { buildSite } from './site-builder.js';

try {
    const result = buildSite();
    console.log(`站点索引已刷新，共生成 ${result.articleCount} 篇文章的数据。`);
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
