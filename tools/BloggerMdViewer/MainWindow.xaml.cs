using System.Collections.ObjectModel;
using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Microsoft.Web.WebView2.Core;
using Microsoft.Win32;

namespace BloggerMdViewer
{
    /// <summary>
    /// 主窗口逻辑类
    /// </summary>
    public partial class MainWindow : Window
    {
        private string _currentFilePath = string.Empty;
        private bool _isWebView2Initialized = false;
        private bool _isPreviewPageLoaded = false;
        private string _previewPageUrl = string.Empty;
        private string _pendingMarkdownContent = string.Empty;
        private string _pendingBaseDirectory = string.Empty;
        private bool _isUpdatingTocSelection = false;
        private readonly ObservableCollection<TocItem> _tocItems = new ObservableCollection<TocItem>();
        private readonly ObservableCollection<HistoryItem> _historyItems = new ObservableCollection<HistoryItem>();
        private readonly string _historyFilePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "BloggerMdViewer",
            "history.json");

        /// <summary>
        /// 初始化主窗口并启动 WebView2。
        /// </summary>
        public MainWindow()
        {
            InitializeComponent();
            TocListBox.ItemsSource = _tocItems;
            HistoryListBox.ItemsSource = _historyItems;
            LoadOpenHistory();
            InitializeWebView2();
        }

        #region WebView2 初始化

        /// <summary>
        /// 异步初始化 WebView2 运行时
        /// </summary>
        private async void InitializeWebView2()
        {
            try
            {
                string userDataFolder = Path.Combine(Path.GetDirectoryName(_historyFilePath) ?? string.Empty, "WebView2Data");

                CoreWebView2Environment env = await CoreWebView2Environment.CreateAsync(
                    userDataFolder: userDataFolder);

                await PreviewWebView.EnsureCoreWebView2Async(env);

                // 配置 WebView2 环境
                PreviewWebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
                PreviewWebView.CoreWebView2.Settings.AreDevToolsEnabled = false;

                // 注册脚本，用于处理目录点击和复制按钮
                await PreviewWebView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(GetInitScript());
                PreviewWebView.CoreWebView2.NavigationCompleted += PreviewWebView_NavigationCompleted;
                PreviewWebView.CoreWebView2.WebMessageReceived += PreviewWebView_WebMessageReceived;

                _isWebView2Initialized = true;

                // 加载 Markdown 预览页面
                LoadPreviewPage();
            }
            catch (Exception ex)
            {
                ShowError($"WebView2 初始化失败：{ex.Message}");
            }
        }

        /// <summary>
        /// 处理预览页面加载完成事件，并执行等待中的 Markdown 渲染。
        /// </summary>
        private void PreviewWebView_NavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
        {
            if (!e.IsSuccess)
            {
                ShowError($"预览页面加载失败：{e.WebErrorStatus}");
                return;
            }

            _isPreviewPageLoaded = true;

            if (!string.IsNullOrEmpty(_pendingMarkdownContent))
            {
                RenderMarkdown(_pendingMarkdownContent, _pendingBaseDirectory);
                _pendingMarkdownContent = string.Empty;
                _pendingBaseDirectory = string.Empty;
            }
        }

        /// <summary>
        /// 加载 Markdown 预览 HTML 页面
        /// </summary>
        private void LoadPreviewPage()
        {
            // 获取应用程序所在目录的 Assets 文件夹中的 HTML 文件
            string appDirectory = AppDomain.CurrentDomain.BaseDirectory;
            string htmlPath = Path.Combine(appDirectory, "Assets", "markdown-viewer.html");

            if (File.Exists(htmlPath))
            {
                _previewPageUrl = new Uri(htmlPath).AbsoluteUri;
                PreviewWebView.CoreWebView2.Navigate(_previewPageUrl);
            }
            else
            {
                ShowError($"预览页面文件不存在：{htmlPath}");
            }
        }

        /// <summary>
        /// 获取前端初始化脚本
        /// </summary>
        private static string GetInitScript()
        {
            return @"
                window.addEventListener('click', function(e) {
                    const target = e.target;
                    // 处理目录项点击
                    if (target.tagName === 'A' && target.classList.contains('toc-link')) {
                        e.preventDefault();
                        const id = target.getAttribute('data-id');
                        if (id) {
                            const element = document.getElementById(id);
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }
                    }
                    // 处理复制按钮点击
                    if (target.classList && target.classList.contains('code-block-copy')) {
                        const wrapper = target.closest('.code-block-wrapper');
                        const code = wrapper ? wrapper.querySelector('code').innerText : '';
                        navigator.clipboard.writeText(code).then(function() {
                            const originalText = target.innerText;
                            target.innerText = '已复制';
                            target.classList.add('copied');
                            setTimeout(function() {
                                target.innerText = originalText;
                                target.classList.remove('copied');
                            }, 2000);
                        }).catch(function(err) {
                            console.error('复制失败：', err);
                            target.innerText = '失败';
                        });
                    }
                }, true);
            ";
        }

        /// <summary>
        /// 接收预览页回传的目录数据，并同步到右侧目录栏。
        /// </summary>
        private void PreviewWebView_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                string json = e.WebMessageAsJson;
                WebMessagePayload? payload = JsonSerializer.Deserialize<WebMessagePayload>(
                    json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (payload == null)
                {
                    return;
                }

                if (string.Equals(payload.Type, "toc", StringComparison.OrdinalIgnoreCase))
                {
                    UpdateToc(payload.Items ?? new List<TocMessageItem>());
                    return;
                }

                if (string.Equals(payload.Type, "activeToc", StringComparison.OrdinalIgnoreCase))
                {
                    SetActiveToc(payload.Id ?? string.Empty);
                }
            }
            catch (Exception ex)
            {
                ShowError($"同步目录失败：{ex.Message}");
            }
        }

        #endregion

        #region 拖拽打开文档

        /// <summary>
        /// 判断拖入内容是否为单个 Markdown 文件，并更新拖放效果。
        /// </summary>
        private void Window_DragEnter(object sender, DragEventArgs e)
        {
            e.Effects = TryGetDraggedMarkdownFile(e, out string _) ? DragDropEffects.Copy : DragDropEffects.None;
            DropOverlay.Visibility = e.Effects == DragDropEffects.Copy ? Visibility.Visible : Visibility.Collapsed;
            e.Handled = true;
        }

        /// <summary>
        /// 拖拽离开窗口时隐藏拖放提示层。
        /// </summary>
        private void Window_DragLeave(object sender, DragEventArgs e)
        {
            DropOverlay.Visibility = Visibility.Collapsed;
            e.Handled = true;
        }

        /// <summary>
        /// 处理拖入 Markdown 文件后的打开行为。
        /// </summary>
        private void Window_Drop(object sender, DragEventArgs e)
        {
            if (!TryGetDraggedMarkdownFile(e, out string filePath))
            {
                DropOverlay.Visibility = Visibility.Collapsed;
                ShowError("请拖入单个 Markdown 文件（.md）。");
                e.Handled = true;
                return;
            }

            DropOverlay.Visibility = Visibility.Collapsed;
            LoadMarkdownFile(filePath);
            e.Handled = true;
        }

        /// <summary>
        /// 从拖拽事件中提取单个 Markdown 文件路径。
        /// </summary>
        /// <param name="e">拖拽事件参数。</param>
        /// <param name="filePath">提取到的 Markdown 文件路径。</param>
        /// <returns>是否成功提取到可打开的 Markdown 文件。</returns>
        private static bool TryGetDraggedMarkdownFile(DragEventArgs e, out string filePath)
        {
            filePath = string.Empty;

            if (!e.Data.GetDataPresent(DataFormats.FileDrop))
            {
                return false;
            }

            object? data = e.Data.GetData(DataFormats.FileDrop);

            if (data is not string[] droppedPaths || droppedPaths.Length != 1)
            {
                return false;
            }

            string candidatePath = droppedPaths[0];

            if (!File.Exists(candidatePath) || !candidatePath.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            filePath = candidatePath;
            return true;
        }

        #endregion

        #region 文件操作

        /// <summary>
        /// 打开文件按钮点击事件
        /// </summary>
        private void OpenFileButton_Click(object sender, RoutedEventArgs e)
        {
            OpenFile();
        }

        /// <summary>
        /// 打开单个 Markdown 文件
        /// </summary>
        private void OpenFile()
        {
            OpenFileDialog dialog = new OpenFileDialog
            {
                Title = "选择 Markdown 文件",
                Filter = "Markdown 文件 (*.md)|*.md|所有文件 (*.*)|*.*",
                FilterIndex = 1
            };

            if (dialog.ShowDialog() == true)
            {
                string filePath = dialog.FileName;

                // 检查文件扩展名
                if (!filePath.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
                {
                    ShowError("仅支持 Markdown 文件（.md）");
                    return;
                }

                // 加载文件内容
                LoadMarkdownFile(filePath);
            }
        }

        /// <summary>
        /// 加载并渲染 Markdown 文件
        /// </summary>
        private void LoadMarkdownFile(string filePath)
        {
            try
            {
                // 检查文件是否存在
                if (!File.Exists(filePath))
                {
                    ShowError($"文件不存在：{filePath}");
                    return;
                }

                _currentFilePath = filePath;
                AddToOpenHistory(filePath);
                DocumentTitleText.Text = Path.GetFileName(filePath);
                DocumentStatusText.Text = filePath;

                // 读取文件内容
                string markdownContent = File.ReadAllText(filePath, System.Text.Encoding.UTF8);

                // 获取文件所在目录作为资源基准路径
                string baseDirectory = Path.GetDirectoryName(filePath) ?? string.Empty;

                // 渲染 Markdown
                RenderMarkdown(markdownContent, baseDirectory);
            }
            catch (Exception ex)
            {
                ShowError($"读取文件失败：{ex.Message}");
            }
        }

        #endregion

        #region 打开历史

        /// <summary>
        /// 加载本地打开历史。
        /// </summary>
        private void LoadOpenHistory()
        {
            try
            {
                if (!File.Exists(_historyFilePath))
                {
                    UpdateHistoryStatus();
                    return;
                }

                string json = File.ReadAllText(_historyFilePath, System.Text.Encoding.UTF8);
                List<string>? paths = JsonSerializer.Deserialize<List<string>>(json);

                foreach (string path in paths ?? new List<string>())
                {
                    if (!File.Exists(path) || !path.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    _historyItems.Add(new HistoryItem
                    {
                        FileName = Path.GetFileName(path),
                        FilePath = path
                    });
                }

                UpdateHistoryStatus();
            }
            catch (Exception ex)
            {
                ShowError($"加载打开历史失败：{ex.Message}");
            }
        }

        /// <summary>
        /// 将文件加入打开历史，并持久化到本地。
        /// </summary>
        /// <param name="filePath">Markdown 文件路径。</param>
        private void AddToOpenHistory(string filePath)
        {
            HistoryItem? existingItem = _historyItems.FirstOrDefault(item =>
                string.Equals(item.FilePath, filePath, StringComparison.OrdinalIgnoreCase));

            if (existingItem != null)
            {
                _historyItems.Remove(existingItem);
            }

            _historyItems.Insert(0, new HistoryItem
            {
                FileName = Path.GetFileName(filePath),
                FilePath = filePath
            });

            while (_historyItems.Count > 30)
            {
                _historyItems.RemoveAt(_historyItems.Count - 1);
            }

            SaveOpenHistory();
            UpdateHistoryStatus();
        }

        /// <summary>
        /// 保存打开历史到本地 JSON 文件。
        /// </summary>
        private void SaveOpenHistory()
        {
            string? directory = Path.GetDirectoryName(_historyFilePath);

            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            List<string> paths = _historyItems.Select(item => item.FilePath).ToList();
            string json = JsonSerializer.Serialize(paths, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(_historyFilePath, json, System.Text.Encoding.UTF8);
        }

        /// <summary>
        /// 同步打开历史面板状态文本。
        /// </summary>
        private void UpdateHistoryStatus()
        {
            HistoryStatusText.Text = _historyItems.Count > 0
                ? $"{_historyItems.Count} 个最近文档"
                : "打开过的 Markdown 文档会显示在这里";
        }

        /// <summary>
        /// 从打开历史中选择文档。
        /// </summary>
        private void HistoryListBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (HistoryListBox.SelectedItem is HistoryItem selectedItem)
            {
                LoadMarkdownFile(selectedItem.FilePath);
            }
        }

        #endregion

        #region Markdown 渲染

        /// <summary>
        /// 渲染 Markdown 内容到 WebView2
        /// </summary>
        private async void RenderMarkdown(string markdownContent, string baseDirectory)
        {
            if (!_isWebView2Initialized)
            {
                _pendingMarkdownContent = markdownContent;
                _pendingBaseDirectory = baseDirectory;
                return;
            }

            if (!_isPreviewPageLoaded)
            {
                _pendingMarkdownContent = markdownContent;
                _pendingBaseDirectory = baseDirectory;
                return;
            }

            try
            {
                string contentJson = JsonSerializer.Serialize(markdownContent);
                string baseDirectoryJson = JsonSerializer.Serialize(baseDirectory);

                // 通过 JSON 字面量传递内容，避免 Markdown 中的特殊字符破坏脚本。
                string script = $@"
                    if (typeof window.__renderMarkdown === 'function') {{
                        window.__renderMarkdown({{
                            content: {contentJson},
                            baseDirectory: {baseDirectoryJson}
                        }});
                    }} else {{
                        document.body.innerHTML = '<div style=""padding:24px;font-family:Segoe UI,sans-serif;color:#991B1B;background:#FEE2E2;""><strong>Markdown 预览运行时未初始化。</strong><p>请检查 markdown-viewer.html 是否加载完成，以及 marked.js、Highlight.js、Mermaid 等资源是否可用。</p></div>';
                    }}
                ";

                await PreviewWebView.CoreWebView2.ExecuteScriptAsync(script);

                // 显示预览区域
                EmptyStatePanel.Visibility = Visibility.Collapsed;
                PreviewWebView.Visibility = Visibility.Visible;
            }
            catch (Exception ex)
            {
                ShowError($"渲染 Markdown 失败：{ex.Message}");
            }
        }

        #endregion

        #region 文档目录联动

        /// <summary>
        /// 更新右侧目录列表。
        /// </summary>
        /// <param name="items">前端解析出的目录项。</param>
        private void UpdateToc(List<TocMessageItem> items)
        {
            _isUpdatingTocSelection = true;
            _tocItems.Clear();

            foreach (TocMessageItem item in items)
            {
                _tocItems.Add(new TocItem
                {
                    Id = item.Id ?? string.Empty,
                    Text = item.Text ?? string.Empty,
                    Level = item.Level,
                    Indent = item.Level > 1 ? new Thickness(14, 0, 0, 0) : new Thickness(0),
                    FontSize = item.Level > 1 ? 12.0 : 13.0,
                    FontWeight = item.Level > 1 ? FontWeights.Normal : FontWeights.SemiBold
                });
            }

            TocStatusText.Text = _tocItems.Count > 0 ? $"{_tocItems.Count} 个标题" : "当前文档没有 ## / ### 标题";
            TocListBox.SelectedItem = null;
            _isUpdatingTocSelection = false;
        }

        /// <summary>
        /// 根据预览页滚动位置高亮当前目录项。
        /// </summary>
        /// <param name="id">当前标题 ID。</param>
        private void SetActiveToc(string id)
        {
            _isUpdatingTocSelection = true;

            TocItem? matchedItem = _tocItems.FirstOrDefault(item => item.Id == id);

            if (matchedItem == null)
            {
                TocListBox.SelectedItem = null;
                _isUpdatingTocSelection = false;
                return;
            }

            TocListBox.SelectedItem = matchedItem;
            TocListBox.ScrollIntoView(matchedItem);
            _isUpdatingTocSelection = false;
        }

        /// <summary>
        /// 点击右侧目录时滚动预览页到对应标题。
        /// </summary>
        private async void TocListBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (_isUpdatingTocSelection || TocListBox.SelectedItem is not TocItem selectedItem)
            {
                return;
            }

            string idJson = JsonSerializer.Serialize(selectedItem.Id);
            string script = $"window.__scrollToHeading && window.__scrollToHeading({idJson});";
            await PreviewWebView.CoreWebView2.ExecuteScriptAsync(script);
        }

        #endregion

        #region 错误处理与提示

        /// <summary>
        /// 显示错误信息
        /// </summary>
        private void ShowError(string message)
        {
            MessageBox.Show(message, "错误", MessageBoxButton.OK, MessageBoxImage.Error);
        }

        #endregion

        #region 数据模型

        /// <summary>
        /// 文件信息项
        /// </summary>
        private class HistoryItem
        {
            public string FileName { get; set; } = string.Empty;
            public string FilePath { get; set; } = string.Empty;
        }

        /// <summary>
        /// WebView2 回传消息。
        /// </summary>
        private class WebMessagePayload
        {
            public string Type { get; set; } = string.Empty;
            public string? Id { get; set; }
            public List<TocMessageItem>? Items { get; set; }
        }

        /// <summary>
        /// WebView2 回传的目录项。
        /// </summary>
        private class TocMessageItem
        {
            public string? Id { get; set; }
            public string? Text { get; set; }
            public int Level { get; set; }
        }

        /// <summary>
        /// 右侧目录显示项。
        /// </summary>
        private class TocItem
        {
            public string Id { get; set; } = string.Empty;
            public string Text { get; set; } = string.Empty;
            public int Level { get; set; }
            public Thickness Indent { get; set; }
            public double FontSize { get; set; }
            public FontWeight FontWeight { get; set; }
        }

        #endregion
    }
}
