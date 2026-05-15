Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\Esisya\Desktop\asker motoru\Panel"
WshShell.Run "cmd /c npm start", 0, False
Set WshShell = Nothing
