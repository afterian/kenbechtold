[CmdletBinding()]
param(
    [string]$DestinationRoot = 'G:\Shared drives\Dream City Studio\Projects\KenBechtold'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$repoName = Split-Path -Leaf $repoRoot
$archiveRoot = Join-Path (Split-Path -Parent $repoRoot) ($repoName + '-Archive')

if (-not (Test-Path -LiteralPath $repoRoot -PathType Container)) {
    throw "Repository folder is unavailable: $repoRoot"
}
if (-not (Test-Path -LiteralPath $archiveRoot -PathType Container)) {
    throw "Private archive folder is unavailable: $archiveRoot"
}

$destinationDrive = [System.IO.Path]::GetPathRoot($DestinationRoot)
if ($destinationDrive -and $destinationDrive -match '^[A-Za-z]:\\$' -and -not (Test-Path -LiteralPath $destinationDrive -PathType Container)) {
    throw "Backup destination drive is unavailable: $destinationDrive"
}
try {
    New-Item -ItemType Directory -Path $DestinationRoot -Force | Out-Null
} catch {
    throw "Cannot access backup destination '$DestinationRoot': $($_.Exception.Message)"
}

$websiteDestination = Join-Path $DestinationRoot 'website'
$archiveDestination = Join-Path $DestinationRoot 'archive'

$copyJobs = @(
    @{ Source = $repoRoot; Destination = $websiteDestination; Label = 'website' },
    @{ Source = $archiveRoot; Destination = $archiveDestination; Label = 'private archive' }
)

foreach ($job in $copyJobs) {
    & robocopy $job.Source $job.Destination /E /XD (Join-Path $repoRoot '.git') /NFL /NDL /NJH /NJS /NP
    $copyResult = $LASTEXITCODE
    if ($copyResult -gt 7) {
        throw "Robocopy failed for $($job.Label) with exit code $copyResult."
    }
}

Write-Output "Backup completed: $websiteDestination and $archiveDestination"
