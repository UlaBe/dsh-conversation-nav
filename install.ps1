<#
.SYNOPSIS
  安装 @ulabe/dsh-conversation-nav 到 DeepSeek Harness (DSH) 的 profile。
.DESCRIPTION
  - 复制插件包到 <DshHome>/profiles/node_modules/@ulabe/dsh-conversation-nav/
  - 在 <DshHome>/profiles/<ProfileName>/cordis.patch.yml 追加 loader 条目（幂等，可重复执行）
  - 安装后需要完全重启 DeepSeek Harness 生效
.PARAMETER ProfileName
  目标 profile 名，默认 web。
.PARAMETER DshHome
  DSH home 目录，默认 $env:USERPROFILE\.dsh。
.PARAMETER DryRun
  只打印将要执行的操作，不实际修改。
.EXAMPLE
  .\install.ps1
.EXAMPLE
  .\install.ps1 -ProfileName web -DshHome C:\Users\someone\.dsh
.EXAMPLE
  .\install.ps1 -DryRun
#>
[CmdletBinding(SupportsShouldProcess = $false)]
param(
    [string]$ProfileName = "web",
    [string]$DshHome = (Join-Path $env:USERPROFILE ".dsh"),
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$pluginName = "@ulabe/dsh-conversation-nav"
$sourceDir  = $PSScriptRoot

if (-not (Test-Path (Join-Path $sourceDir "package.json"))) {
    throw "插件源目录无效: $sourceDir （缺少 package.json，请从插件源目录运行本脚本）"
}

$profilesDir      = Join-Path $DshHome "profiles"
$targetPkgDir     = Join-Path (Join-Path $profilesDir "node_modules") $pluginName
$profileDir       = Join-Path $profilesDir $ProfileName
$patchPath        = Join-Path $profileDir "cordis.patch.yml"

Write-Host "==> 插件源 : $sourceDir"
Write-Host "==> 插件包 : $targetPkgDir"
Write-Host "==> patch  : $patchPath"
Write-Host ""

# ── 1. 复制插件包 ──────────────────────────────────────────────────────────
if ($DryRun) {
    Write-Host "[dry-run] 复制 package.json + lib/ + cordis.patch.yml  ->  $targetPkgDir"
} else {
    New-Item -ItemType Directory -Force -Path $targetPkgDir | Out-Null
    Copy-Item (Join-Path $sourceDir "package.json") $targetPkgDir -Force
    Copy-Item (Join-Path $sourceDir "lib") $targetPkgDir -Recurse -Force
    Copy-Item (Join-Path $sourceDir "cordis.patch.yml") $targetPkgDir -Force
    Write-Host "已复制插件包 -> $targetPkgDir"
}

# ── 2. cordis.patch.yml 条目（幂等） ───────────────────────────────────────
$patchHeader = @"
# Your patch layer for this dsh profile, applied after every bundle layer:
# a top-level YAML array of loader patch entries (id-targeted config
# overrides, disables, and insert lists; `!!js` expressions allowed).
"@

$patchEntry = @"

# ── conversation position navigator (@ulabe/dsh-conversation-nav) ──────────
- insert:
    - id: conversation-nav
      name: $pluginName
"@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path $patchPath)) {
    if ($DryRun) {
        Write-Host "[dry-run] 创建 $patchPath 并写入插件条目"
    } else {
        New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
        $content = $patchHeader + "`n" + $patchEntry + "`n"
        [System.IO.File]::WriteAllText($patchPath, $content, $utf8NoBom)
        Write-Host "已创建 patch 并写入条目: $patchPath"
    }
} else {
    $existing = [System.IO.File]::ReadAllText($patchPath)
    if ($existing -match [regex]::Escape($pluginName)) {
        Write-Host "patch 已包含 $pluginName 条目，跳过（幂等）"
    } elseif ($existing.Trim() -eq "[]") {
        if ($DryRun) {
            Write-Host "[dry-run] 替换空数组 patch 为插件条目"
        } else {
            $content = $patchHeader + "`n" + $patchEntry + "`n"
            [System.IO.File]::WriteAllText($patchPath, $content, $utf8NoBom)
            Write-Host "已替换空 patch 并写入条目: $patchPath"
        }
    } else {
        if ($DryRun) {
            Write-Host "[dry-run] 追加插件条目到 $patchPath"
        } else {
            $content = $existing.TrimEnd() + "`n" + $patchEntry + "`n"
            [System.IO.File]::WriteAllText($patchPath, $content, $utf8NoBom)
            Write-Host "已追加条目: $patchPath"
        }
    }
}

Write-Host ""
Write-Host "安装完成。请【完全退出并重新启动】DeepSeek Harness 使插件生效。"
Write-Host "验证：对话区右侧中间应出现悬浮按钮；打开后抽屉列出全部用户消息（自动加载历史）。"
