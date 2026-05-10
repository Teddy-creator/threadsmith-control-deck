$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:THREADSMITH_APP_HOME = "1"

& (Join-Path $RootDir "Launch-Threadsmith.ps1")
