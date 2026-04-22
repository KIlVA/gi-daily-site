Set-Location "C:\Users\weiwei.lin\Desktop\AI TEST\gi-daily-site"
$result = python update_daily.py batch_temp_0417_0420.json 2>&1
$result | Out-File -FilePath "C:\Users\weiwei.lin\Desktop\AI TEST\gi-daily-site\update_result.txt" -Encoding utf8
