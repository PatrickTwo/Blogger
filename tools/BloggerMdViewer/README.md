# Blogger Markdown 查看器

基于 WPF + WebView2 的本地 Markdown 文件查看工具。

## 系统要求

- Windows 10 版本 1809 及以上
- .NET 8.0 Runtime
- WebView2 Runtime（Windows 11 通常已预装，Windows 10 可能需要手动安装）

## 运行方式

### 方式一：直接运行可执行文件

1. 进入 `tools/BloggerMdViewer/bin/Debug/net8.0-windows/` 目录
2. 双击 `BloggerMdViewer.exe` 启动

### 方式二：命令行运行

```bash
cd tools/BloggerMdViewer
dotnet run
```

### 方式三：发布为独立程序

```bash
cd tools/BloggerMdViewer
dotnet publish -c Release -r win-x64 --self-contained
```

## 功能特性

### 文件操作

- **打开文件**：通过系统对话框选择单个 `.md` 文件进行预览
- **拖拽打开**：将单个 `.md` 文件拖到窗口任意位置即可打开
- **打开历史**：左侧常驻最近打开的 Markdown 文档，点击即可再次预览

### 预览功能

- **Markdown 渲染**：支持标准 CommonMark 和 GitHub Flavored Markdown
- **目录生成**：自动从 `##` 和 `###` 标题生成目录，点击可滚动定位
- **代码高亮**：支持多种语言的语法高亮（通过 Highlight.js）
- **代码块复制**：每个代码块右上角提供「复制」按钮
- **Mermaid 图表**：支持 ` ```mermaid ` 代码块，自动渲染为图表；语法错误时显示源码回退
- **自定义块**：支持 `:::info`、`:::warning`、`:::danger`、`:::hint`、`:::abstract`、`:::ref`、`:::summary`、`:::updates` 等自定义块
- **标题锚点**：悬停标题显示锚点按钮，点击可复制链接
- **Front Matter**：自动解析并跳过 YAML Front Matter
- **相对图片**：支持 Markdown 中的相对路径图片

## 快捷操作

| 操作 | 说明 |
|------|------|
| 点击「打开文件」 | 选择单个 Markdown 文件 |
| 拖入 `.md` 文件 | 直接打开该 Markdown 文件 |
| 点击左侧历史项 | 重新打开最近预览过的文档 |
| 点击目录项 | 滚动到对应标题 |
| 点击代码块「复制」 | 复制代码内容 |

## 目录结构

```
tools/BloggerMdViewer/
├── Assets/
│   ├── markdown-viewer.html  # Markdown 预览页面
│   ├── vendor/               # 本地 Markdown 渲染运行时依赖
│   └── Styles.xaml           # WPF 样式资源
├── App.xaml                  # 应用程序定义
├── App.xaml.cs               # 应用程序入口
├── MainWindow.xaml           # 主窗口布局
├── MainWindow.xaml.cs        # 主窗口逻辑
├── BloggerMdViewer.csproj    # 项目文件
└── README.md                 # 本文档
```

## 技术栈

| 组件 | 技术 |
|------|------|
| 桌面框架 | WPF (.NET 8.0) |
| Web 内容渲染 | WebView2 |
| Markdown 解析 | marked.js |
| 代码高亮 | Highlight.js |
| 图表渲染 | Mermaid.js |
| 样式 | CSS3（与 Blogger 主站风格一致） |

> marked.js、Highlight.js 和 Mermaid.js 已随工具放在 `Assets/vendor/`，预览不依赖 CDN。

## 常见问题

### WebView2 初始化失败

如果遇到「WebView2 初始化失败」错误，请手动安装 [WebView2 Runtime](https://developer.microsoft.com/zh-cn/microsoft-edge/webview2/)。

### 图片无法显示

确保图片路径相对于当前 Markdown 文件的路径是有效的。支持的图片格式包括：`.png`、`.jpg`、`.jpeg`、`.gif`、`.svg`、`.webp`。

### Mermaid 图表渲染失败

请检查 Mermaid 语法是否正确。渲染失败时会显示源码回退而非空白区域。
