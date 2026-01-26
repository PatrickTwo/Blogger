/**
 * #region Utilities & Constants
 */

export const AppUtils = {
    /**
     * 目录配置
     */
    TOC_CONFIG: {
        t1Level: 2,      // 提取的一级标题等级
        t2Level: 3,      // 提取二级标题等级
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

/**
 * #endregion
 */
