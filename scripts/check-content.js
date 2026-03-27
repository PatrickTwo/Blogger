import { checkContent } from './site-builder.js';

const result = checkContent();

if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('内容校验通过，没有发现错误或警告。');
    process.exit(0);
}

if (result.warnings.length > 0) {
    console.warn(`发现 ${result.warnings.length} 条警告：`);
    for (const warning of result.warnings) {
        console.warn(`- ${warning}`);
    }
}

if (result.errors.length > 0) {
    console.error(`发现 ${result.errors.length} 条错误：`);
    for (const error of result.errors) {
        console.error(`- ${error}`);
    }
    process.exit(1);
}
