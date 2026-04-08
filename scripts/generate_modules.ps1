# #region 兼容旧脚本入口
<#
.SYNOPSIS
    兼容历史调用方式，转发到新的站点数据生成脚本。
.DESCRIPTION
    项目已经移除“模块/章节”目录驱动模型，改为统一扫描 Resources/Articles 并使用 Front Matter 元数据分类。
    保留本脚本仅用于兼容旧命令，实际构建逻辑统一由 node scripts/generate-data.js 执行。
#>

$projectRoot = Join-Path $PSScriptRoot ".."
$generateScriptPath = Join-Path $PSScriptRoot "generate-data.js"

if (-not (Test-Path $generateScriptPath)) {
    Write-Error "未找到 generate-data.js：$generateScriptPath"
    exit 1
}

Write-Host "提示：generate_modules.ps1 已切换为兼容入口，当前索引生成已基于 Front Matter 分类。"
node $generateScriptPath

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
# #endregion
