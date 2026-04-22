Set oShell = CreateObject("WScript.Shell")
Set oExec = oShell.Exec("cmd /c netstat -ano | findstr :8000")
Dim result
result = ""
Do While Not oExec.StdOut.AtEndOfStream
    result = result & oExec.StdOut.ReadLine() & "|"
Loop
Set oFile = CreateObject("Scripting.FileSystemObject").CreateTextFile("C:\Users\weiwei.lin\Desktop\AI TEST\gi-daily-site\port8000_pids.txt", True)
oFile.Write result
oFile.Close
