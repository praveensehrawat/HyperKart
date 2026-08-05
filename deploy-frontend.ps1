# PowerShell Script to build and deploy to XAMPP htdocs folder
# ==========================================================

Write-Host "Building Vite React frontend..." -ForegroundColor Cyan
Set-Location "d:\AI-HyperKart-Commerce\frontend"
& "C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "d:\AI-HyperKart-Commerce\frontend\node_modules\vite\bin\vite.js" build

Write-Host "Copying compiled assets & .htaccess to C:\xampp\htdocs..." -ForegroundColor Green
Copy-Item -Path "d:\AI-HyperKart-Commerce\frontend\dist\*" -Destination "C:\xampp\htdocs" -Recurse -Force
Copy-Item -Path "d:\AI-HyperKart-Commerce\frontend\public\.htaccess" -Destination "C:\xampp\htdocs\.htaccess" -Force

Write-Host "Deployment completed! Open http://localhost:8085/ in your browser." -ForegroundColor Yellow
