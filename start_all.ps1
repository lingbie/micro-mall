# start_all.ps1 - 微商城一键启动（MySQL + 后端 + 前端）
# 用法: 右键"使用 PowerShell 运行"，或在终端执行 powershell -ExecutionPolicy Bypass -File start_all.ps1
$ErrorActionPreference = "Continue"
$mysqlBin = "C:\Users\lingb\Desktop\chapter08\mysql\mysql-8.4.9-winx64\bin"
$mysqlIni = "C:\Users\lingb\Desktop\chapter08\mysql\mysql-8.4.9-winx64\my.ini"
$serverDir = "C:\Users\lingb\Desktop\chapter08\my-shop\server"
$webDir = "C:\Users\lingb\Desktop\chapter08\my-shop"

Write-Output "=== 1/3 启动 MySQL ==="
if (-not (netstat -ano | Select-String ":3306.*LISTENING")) {
  Start-Process -FilePath "$mysqlBin\mysqld.exe" -ArgumentList "--defaults-file=$mysqlIni" -WindowStyle Hidden
  Start-Sleep -Seconds 3
  Write-Output "MySQL 已启动 (3306)"
} else {
  Write-Output "MySQL 已在运行"
}

Write-Output "=== 2/3 启动后端 (8360) ==="
if (-not (netstat -ano | Select-String ":8360.*LISTENING")) {
  Start-Process -FilePath "node" -ArgumentList "index.js" -WorkingDirectory $serverDir -WindowStyle Hidden
  Start-Sleep -Seconds 3
  Write-Output "后端已启动 http://127.0.0.1:8360"
} else {
  Write-Output "后端已在运行"
}

Write-Output "=== 3/3 启动前端 (5173) ==="
if (-not (netstat -ano | Select-String ":5173.*LISTENING")) {
  Start-Process -FilePath "cmd" -ArgumentList "/c npm run dev" -WorkingDirectory $webDir -WindowStyle Hidden
  Start-Sleep -Seconds 6
  Write-Output "前端已启动 http://localhost:5173"
} else {
  Write-Output "前端已在运行"
}

Write-Output "`n=== 全部就绪，浏览器打开 http://localhost:5173 ==="
Write-Output "演示账号: demo1 / 123456"
