param(
  [Parameter(Position = 0)]
  [string]$ProjectRoot
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PreferredPort = if ($env:THREADSMITH_PORT) { [int]$env:THREADSMITH_PORT } else { 5173 }
$Port = $PreferredPort
$AppHomeMode = if ($env:THREADSMITH_APP_HOME) { $env:THREADSMITH_APP_HOME } else { "0" }
$DryRun = if ($env:THREADSMITH_DRY_RUN) { $env:THREADSMITH_DRY_RUN } else { "0" }
$RuntimeDir = Join-Path $RootDir ".threadsmith-runtime"
$LastPortFile = Join-Path $RuntimeDir "last-port"
$RequestedProjectRoot = if ($ProjectRoot) { $ProjectRoot } elseif ($env:THREADSMITH_PROJECT_ROOT) { $env:THREADSMITH_PROJECT_ROOT } else { "" }
$TargetProjectRoot = ""
$HasExplicitProjectRoot = [bool]$RequestedProjectRoot
$AppOrigin = ""
$AppUrl = ""
$NpmCommand = ""

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

function Show-Usage {
  Write-Host "Threadsmith launcher"
  Write-Host ""
  Write-Host "Usage:"
  Write-Host "  .\Launch-Threadsmith.ps1 [project-root]"
  Write-Host ""
  Write-Host "Examples:"
  Write-Host "  .\Launch-Threadsmith.ps1"
  Write-Host "  .\Launch-Threadsmith.ps1 C:\Code\MyProject"
  Write-Host ""
  Write-Host "Without a project-root, Threadsmith follows the saved daily opening path."
  Write-Host "You can also use THREADSMITH_PROJECT_ROOT=C:\Code\MyProject."
  Write-Host "Set THREADSMITH_APP_HOME=1 to open the Threadsmith front door."
}

function Test-CommandExists([string]$CommandName) {
  return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

function Resolve-NpmCommand {
  $NpmCmd = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
  if ($NpmCmd) {
    return $NpmCmd.Source
  }

  $Npm = Get-Command "npm" -ErrorAction SilentlyContinue
  if ($Npm) {
    return $Npm.Source
  }

  return ""
}

function Resolve-ProjectRoot([string]$Candidate) {
  if ([string]::IsNullOrWhiteSpace($Candidate)) {
    return ""
  }

  if (Test-Path -LiteralPath $Candidate -PathType Container) {
    return (Resolve-Path -LiteralPath $Candidate).Path
  }

  $RelativeCandidate = Join-Path $RootDir $Candidate
  if (Test-Path -LiteralPath $RelativeCandidate -PathType Container) {
    return (Resolve-Path -LiteralPath $RelativeCandidate).Path
  }

  return $Candidate
}

function Update-AppUrl {
  $script:AppOrigin = "http://127.0.0.1:$script:Port"
  $script:AppUrl = $script:AppOrigin

  if ($script:AppHomeMode -eq "1") {
    $script:AppUrl = "$script:AppOrigin/?appHome=1"
  } elseif (-not [string]::IsNullOrWhiteSpace($script:TargetProjectRoot)) {
    $EncodedProjectRoot = [System.Uri]::EscapeDataString($script:TargetProjectRoot)
    $script:AppUrl = "$script:AppOrigin/?projectRoot=$EncodedProjectRoot"
  }
}

function Set-LauncherPort([int]$NextPort) {
  $script:Port = $NextPort
  Update-AppUrl
}

function Test-PortListening([int]$CandidatePort) {
  try {
    $Connection = Get-NetTCPConnection -LocalPort $CandidatePort -State Listen -ErrorAction SilentlyContinue
    return [bool]$Connection
  } catch {
    try {
      $TcpClient = [System.Net.Sockets.TcpClient]::new()
      $ConnectTask = $TcpClient.ConnectAsync("127.0.0.1", $CandidatePort)
      $Connected = $ConnectTask.Wait(200)
      $TcpClient.Dispose()
      return $Connected
    } catch {
      return $false
    }
  }
}

function Test-ThreadsmithPage([int]$CandidatePort) {
  try {
    $Response = Invoke-WebRequest -Uri "http://127.0.0.1:$CandidatePort/" -UseBasicParsing -TimeoutSec 2
    return ($Response.Content -like "*<title>Threadsmith</title>*")
  } catch {
    return $false
  }
}

function Open-ThreadsmithUrl {
  if ($env:THREADSMITH_SKIP_OPEN -eq "1") {
    return
  }

  Start-Process $script:AppUrl
}

function Find-ExistingThreadsmithPort {
  if (Test-Path -LiteralPath $LastPortFile -PathType Leaf) {
    $CandidateText = (Get-Content -LiteralPath $LastPortFile -Raw).Trim()
    $Candidate = 0
    if ([int]::TryParse($CandidateText, [ref]$Candidate) -and (Test-ThreadsmithPage $Candidate)) {
      Set-LauncherPort $Candidate
      return $true
    }
  }

  for ($Candidate = $PreferredPort; $Candidate -le ($PreferredPort + 12); $Candidate++) {
    if (Test-ThreadsmithPage $Candidate) {
      Set-LauncherPort $Candidate
      return $true
    }
  }

  return $false
}

function Find-AvailablePort([int]$StartPort) {
  $Candidate = $StartPort
  while (Test-PortListening $Candidate) {
    $Candidate++
  }

  Set-LauncherPort $Candidate
}

if ($ProjectRoot -eq "--help" -or $ProjectRoot -eq "-h") {
  Show-Usage
  exit 0
}

if ($AppHomeMode -ne "1" -and $HasExplicitProjectRoot) {
  $TargetProjectRoot = Resolve-ProjectRoot $RequestedProjectRoot
}

$NpmCommand = Resolve-NpmCommand

if (-not (Test-CommandExists "node") -or [string]::IsNullOrWhiteSpace($NpmCommand)) {
  Write-Host "Node.js/npm was not found in PATH."
  Write-Host "Please install Node.js and npm first, then try again."
  exit 1
}

Set-LauncherPort $Port

Write-Host "Threadsmith launcher"
Write-Host "Threadsmith root: $RootDir"
if ($AppHomeMode -eq "1") {
  Write-Host "Entry: Threadsmith front door"
} elseif ($HasExplicitProjectRoot) {
  Write-Host "Target project: $TargetProjectRoot"
} else {
  Write-Host "Entry: Saved daily opening path"
}
Write-Host "Preferred URL: $AppUrl"
Write-Host ""

if ($DryRun -eq "1") {
  Write-Host "Dry run: launcher configuration resolved."
  exit 0
}

if (Find-ExistingThreadsmithPort) {
  Write-Host "Threadsmith is already running."
  if ($AppHomeMode -eq "1") {
    Write-Host "Entry: Threadsmith front door"
  } elseif ($HasExplicitProjectRoot) {
    Write-Host "Target project: $TargetProjectRoot"
  } else {
    Write-Host "Entry: Saved daily opening path"
  }
  Write-Host "URL: $AppUrl"
  Write-Host "Threadsmith is the control deck. Keep the main coding conversation in your conductor surface."
  Open-ThreadsmithUrl
  exit 0
}

Find-AvailablePort $PreferredPort
Set-Content -LiteralPath $LastPortFile -Value $Port

if ($Port -ne $PreferredPort) {
  Write-Host "Preferred port $PreferredPort is busy."
  Write-Host "Falling back to $Port."
  Write-Host ""
}

$WaiterScript = {
  param($Url)

  for ($Attempt = 0; $Attempt -lt 45; $Attempt++) {
    try {
      Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 | Out-Null
      if ($env:THREADSMITH_SKIP_OPEN -ne "1") {
        Start-Process $Url
      }
      return
    } catch {
      Start-Sleep -Seconds 1
    }
  }
}

Start-Job -ScriptBlock $WaiterScript -ArgumentList $AppUrl | Out-Null

Set-Location -LiteralPath $RootDir

Write-Host "Starting control deck..."
if ($AppHomeMode -eq "1") {
  Write-Host "Entry: Threadsmith front door"
} elseif ($HasExplicitProjectRoot) {
  Write-Host "Target project: $TargetProjectRoot"
} else {
  Write-Host "Entry: Saved daily opening path"
}
Write-Host "URL: $AppUrl"
Write-Host "Threadsmith is the control deck. Keep the main coding conversation in your conductor surface."
Write-Host "Keep this PowerShell window open while using Threadsmith."
Write-Host ""

& $NpmCommand run dev --workspace @threadsmith/control-deck -- --host 127.0.0.1 --port $Port --strictPort
