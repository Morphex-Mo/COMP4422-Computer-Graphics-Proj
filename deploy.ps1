Write-Host "🚀 Starting deployment to GitHub Pages..." -ForegroundColor Green

# 构建项目
Write-Host "📦 Building project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# 切换到 PPTSide 分支
Write-Host "🔀 Switching to PPTSide branch..." -ForegroundColor Yellow
git checkout PPTSide

# 复制构建文件
Write-Host "📁 Copying build files..." -ForegroundColor Yellow
Copy-Item -Path "dist\*" -Destination "." -Recurse -Force

# 创建 .nojekyll
Write-Host "📄 Creating .nojekyll..." -ForegroundColor Yellow
"" | Out-File -FilePath ".nojekyll" -Encoding ASCII

# 提交更改
Write-Host "💾 Committing changes..." -ForegroundColor Yellow
git add .
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Deploy: $timestamp"

# 推送到 GitHub
Write-Host "⬆️  Pushing to GitHub..." -ForegroundColor Yellow
git push origin PPTSide

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌐 Your site will be available at:" -ForegroundColor Cyan
Write-Host "   https://morphex-mo.github.io/COMP4422-Computer-Graphics-Proj/" -ForegroundColor Cyan
Write-Host "⭐ Direct link:" -ForegroundColor Cyan
Write-Host "   https://morphex-mo.github.io/COMP4422-Computer-Graphics-Proj/?scene=starCollectorScene" -ForegroundColor Cyan
