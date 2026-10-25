# Removes files that the redesign replaced. Run once from the project folder:
#   powershell -ExecutionPolicy Bypass -File scripts\remove-old-files.ps1
$root = Split-Path -Parent $PSScriptRoot
$files = @(
  'client\src\App.css',
  'client\src\assets\hero.png',
  'client\src\assets\react.svg',
  'client\src\assets\vite.svg',
  'client\src\components\Button\Button.jsx',
  'client\src\components\Modal\Modal.jsx',
  'client\src\components\Navbar\Navbar.jsx',
  'client\src\components\Sidebar\Sidebar.jsx',
  'client\src\components\common\AnimatedSection.jsx',
  'client\src\components\common\ClientMap.jsx',
  'client\src\components\common\PageMotion.jsx',
  'client\src\components\company\CompanyMessageBadge.jsx',
  'client\src\components\company\CompanyShell.jsx',
  'client\src\components\customer\CustomerProfileButton.jsx',
  'client\src\components\customer\CustomerTopNav.jsx',
  'client\src\components\layout\AnimatedContent.jsx',
  'client\src\layouts\AdminLayout.jsx',
  'client\src\layouts\CompanyLayout.jsx',
  'client\src\layouts\CustomerLayout.jsx',
  'client\src\layouts\PublicLayout.jsx',
  'client\src\routes\index.js',
  'client\src\store\index.js',
  'client\src\styles\main.css'
)
foreach ($f in $files) { $p = Join-Path $root $f; if (Test-Path $p) { Remove-Item $p -Force; Write-Host "Removed $f" } }
foreach ($d in @("client\src\layouts","client\src\routes","client\src\store","client\src\components\Button","client\src\components\Modal","client\src\components\Navbar","client\src\components\Sidebar","client\src\components\layout")) { $p = Join-Path $root $d; if ((Test-Path $p) -and -not (Get-ChildItem $p -Force)) { Remove-Item $p -Force } }
Write-Host "Done."
