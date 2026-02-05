# #region 模块索引生成脚本
<#
.SYNOPSIS
    自动扫描 Resources/Articles 目录并生成 js/modules_data.js。
.DESCRIPTION
    该脚本会遍历文章目录结构，生成包含模块、章节和文章路径的 ES 模块文件。
#>

$articlesPath = Join-Path $PSScriptRoot "..\Resources\Articles"
$jsDataPath = Join-Path $PSScriptRoot "..\js\modules_data.js"
 
# 检查 Articles 目录是否存在，如果不存在则输出错误信息并退出脚本
if (-not (Test-Path $articlesPath)) {
    Write-Error "Articles directory not found at $articlesPath"
    exit 1
}
 
# 获取 Articles 目录下的所有子目录（模块），并按名称排序
$directories = Get-ChildItem -Path $articlesPath -Directory | Sort-Object { [regex]::Replace($_.Name, '\d+', { $args[0].Value.PadLeft(10, '0') }) }
 
$modules = @()
# 遍历每个模块目录
foreach ($dir in $directories) {
    # 获取子目录（章节），并按名称排序
    $subDirs = Get-ChildItem -Path $dir.FullName -Directory | Sort-Object { [regex]::Replace($_.Name, '\d+', { $args[0].Value.PadLeft(10, '0') }) }
    $chapters = @()
     
    # 遍历每个章节目录
    foreach ($subDir in $subDirs) {
        # 获取子目录下的文章文件（.md），并按名称排序
        $files = Get-ChildItem -Path $subDir.FullName -Filter *.md | Sort-Object { [regex]::Replace($_.Name, '\d+', { $args[0].Value.PadLeft(10, '0') }) }
        $articles = @()
 
        # 遍历每个文章文件，创建文章对象并添加到章节中
        foreach ($file in $files) {
            $articles += [PSCustomObject]@{
                title = $file.Name
                path = "Resources/Articles/" + $dir.Name + "/" + $subDir.Name + "/" + $file.Name
            }
        }

        # 优化：仅添加包含文章的章节
        if ($articles.Count -gt 0) {
            $chapters += [PSCustomObject]@{
                name = $subDir.Name
                path = "Resources/Articles/" + $dir.Name + "/" + $subDir.Name
                articles = $articles
            }
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
# 优化：使用 ES 模块导出格式 (export const BLOG_MODULES)
$json = $modules | ConvertTo-Json -Depth 10
$content = @"
/**
 * 自动生成的文章索引数据
 * 请勿手动修改此文件，使用 PowerShell 脚本 generate_modules.ps1 重新生成
 */
export const BLOG_MODULES = $json;
"@

# 修复：使用 UTF8 编码保存文件 (无 BOM)
[System.IO.File]::WriteAllText($jsDataPath, $content, [System.Text.Encoding]::UTF8)
 
# 输出生成的模块数据路径
Write-Host "Modules data generated at $jsDataPath (ES Module format)"
# #endregion