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
    },

    // #region 优化：黑夜模式切换
    /**
     * 初始化主题
     */
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeButton(savedTheme);
    },

    /**
     * 切换主题
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        // 优化：添加过渡动画类
        document.body.classList.add('theme-transition');

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeButton(newTheme);

        // 动画完成后移除类
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 300);
    },

    /**
     * 更新切换按钮文字/图标
     * @param {string} theme - 当前主题名称
     */
    updateThemeButton(theme) {
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) {
            const icon = btn.querySelector('.icon');
            const text = btn.querySelector('.text');
            if (theme === 'dark') {
                icon.innerText = '🌙';
                text.innerText = '深色';
            } else {
                icon.innerText = '☀️';
                text.innerText = '浅色';
            }
        }
    },
    // #endregion

    // #region 优化：添加复制代码功能
    /**
     * 复制代码到剪贴板
     * @param {HTMLElement} btn - 点击的按钮元素
     */
    copyCode(btn) {
        const wrapper = btn.closest('.code-block-wrapper');
        const code = wrapper.querySelector('code').innerText;

        navigator.clipboard.writeText(code).then(() => {
            const originalText = btn.innerText;
            btn.innerText = '已复制';
            btn.classList.add('copied');

            setTimeout(() => {
                btn.innerText = originalText;
                btn.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('无法复制代码: ', err);
            btn.innerText = '失败';
        });
    }
    // #endregion
};

// #region 优化：将 AppUtils 暴露到全局，以便在 HTML onclick 中使用
window.AppUtils = AppUtils;
// #endregion

/**
 * #endregion
 */
