<#
.SYNOPSIS
  卸载 @ulabe/dsh-conversation-nav：删除插件包并移除 cordis.patch.yml 条目。
.DESCRIPTION
  - 删除 <DshHome>/profiles/node_modules/@ulabe/dsh-conversation-nav/
  - 从 <DshHome>/profiles/<ProfileName>/cordis.patch.yml 移除插件条目（行状态机，幂等）
  - 卸载后需要完全重启 DeepSeek Harness 生效
.PARAMETER ProfileName
  目标 profile 名，默认 web。
.PARAMETER DshHome
  DSH home 目录，默认 $env:USERPROFILE\.dsh。
.PARAMETER DryRun
  只打印将要执行的操作，不实际修改。
.EXAMPLE
  .\uninstall.ps1
#>
[CmdletBinding(SupportsShouldProcess = $false)]
param(
    [string]$ProfileName = "web",
    [string]$DshHome = (Join-Path $env:USERPROFILE ".dsh"),
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$pluginName = "@ulabe/dsh-conversation-nav"
$targetPkgDir = Join-Path (Join-Path $DshHome "profiles\node_modules") $pluginName
$patchPath    = Join-Path (Join-Path $DshHome "profiles\$ProfileName") "cordis.patch.yml"

# ── 1. 删除插件包 ──────────────────────────────────────────────────────────
if (Test-Path $targetPkgDir) {
    if ($DryRun) {
        Write-Host "[dry-run] 删除插件包 $targetPkgDir"
    } else {
        Remove-Item $targetPkgDir -Recurse -Force
        Write-Host "已删除插件包: $targetPkgDir"
    }
} else {
    Write-Host "插件包不存在（可能已卸载）: $targetPkgDir"
}

# ── 2. 从 patch 移除条目（行状态机） ───────────────────────────────────────
if (Test-Path $patchPath) {
    $lines = [System.IO.File]::ReadAllLines($patchPath)
    $out = New-Object System.Collections.Generic.List[string]
    $skipBlock = $false

    for ($i = 0; $i -lt $lines.Length; $i++) {
        $line = $lines[$i]

        # 块开始：install.ps1 写入的注释行
        if (-not $skipBlock -and $line -match '^#.*conversation position navigator') {
            $skipBlock = $true
            continue
        }
        # 块结束：块内的 name 行
        if ($skipBlock -and $line -match '^\s*name: @ulabe/dsh-conversation-nav') {
            $skipBlock = $false
            continue
        }
        # 块内其余行（含 - insert: 与 - id: 行）全部跳过
        if ($skipBlock) {
            continue
        }
        # 手工条目：独立的 - id: conversation-nav 行（可能带缩进，插在已有 insert 列表里）
        if ($line -match '^[ \t]*- id: conversation-nav') {
            if ($i + 1 -lt $lines.Length -and $lines[$i + 1] -match '^\s*name: @ulabe/dsh-conversation-nav') {
                $i++   # 连同下一行的 name 行一起跳过
            }
            continue
        }

        $out.Add($line)
    }

    $cleaned = ($out -join "`n").TrimEnd()
    if ($cleaned -ne "") { $cleaned = $cleaned + "`n" }

    # DSH requires the patch to stay a top-level YAML array: if removing the
    # plugin entry left no entries at all, restore the default empty array
    # (comments alone would fail the loader's array validation).
    if ($cleaned -notmatch '(?m)^[ \t]*- ') {
        $patchHeader = @"
# Your patch layer for this dsh profile, applied after every bundle layer:
# a top-level YAML array of loader patch entries (id-targeted config
# overrides, disables, and insert lists; `!!js` expressions allowed).
"@
        $cleaned = $patchHeader + "`n[]`n"
    }

    $original = [System.IO.File]::ReadAllText($patchPath)
    if ($cleaned.Trim() -ne $original.Trim()) {
        if ($DryRun) {
            Write-Host "[dry-run] 从 patch 移除插件条目: $patchPath"
        } else {
            [System.IO.File]::WriteAllText($patchPath, $cleaned, (New-Object System.Text.UTF8Encoding($false)))
            Write-Host "已从 patch 移除插件条目: $patchPath"
        }
    } else {
        Write-Host "patch 中未找到插件条目（可能已移除）: $patchPath"
    }
} else {
    Write-Host "patch 不存在（可能已卸载）: $patchPath"
}

Write-Host ""
Write-Host "卸载完成。请【完全退出并重新启动】DeepSeek Harness 使改动生效。"
