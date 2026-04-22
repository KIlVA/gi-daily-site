Set oShell = CreateObject("WScript.Shell")
oShell.CurrentDirectory = "C:\Users\weiwei.lin\Desktop\AI TEST\gi-daily-site"
oShell.Run "cmd /c python -m http.server 8000", 0, False