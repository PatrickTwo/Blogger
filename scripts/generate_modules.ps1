$articlesPath = Join-Path $PSScriptRoot "..\Resources\Articles"
$jsDataPath = Join-Path $PSScriptRoot "..\js\modules_data.js"
 
# 检查 Articles 目录是否存在，如果不存在则输出错误信息并退出脚本
if (-not (Test-Path $articlesPath)) {
    Write-Error "Articles directory not found at $articlesPath"
    exit 1
}
 
# 获取 Articles 目录下的所有子目录（模块）
$directories = Get-ChildItem -Path $articlesPath -Directory
 
$modules = @()
# 遍历每个模块目录
foreach ($dir in $directories) {
    # Get subdirectories (Chapters)
    $subDirs = Get-ChildItem -Path $dir.FullName -Directory
    $chapters = @()
     
    # 遍历每个章节目录
    foreach ($subDir in $subDirs) {
        # Get files (Articles) in the subdirectory
        $files = Get-ChildItem -Path $subDir.FullName -Filter *.md
        $articles = @()
 
        # 遍历每个文章文件，创建文章对象并添加到章节中
        foreach ($file in $files) {
            $articles += [PSCustomObject]@{
                title = $file.Name
                path = "Resources/Articles/" + $dir.Name + "/" + $subDir.Name + "/" + $file.Name
            }
        }
 
        $chapters += [PSCustomObject]@{
            name = $subDir.Name
            path = "Resources/Articles/" + $dir.Name + "/" + $subDir.Name
            articles = $articles
        }
    }
 
    # 创建模块对象并添加到模块列表中
    $modules += [PSCustomObject]@{
        name = $dir.Name
        path = "Resources/Articles/" + $dir.Name
        chapters = $chapters
    }
}
 
# 确保输出目录存在，如果不存在则创建目录
$outputDir = Split-Path $jsDataPath -Parent
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}
 
# 将模块列表转换为 JSON 格式，并写入到指定的 JavaScript 文件中
$json = $modules | ConvertTo-Json -Depth 10
$content = "window.BLOG_MODULES = $json;"
$content | Set-Content -Path $jsDataPath -Encoding UTF8
 
# 输出生成的模块数据路径
Write-Host "Modules data generated at $jsDataPath"