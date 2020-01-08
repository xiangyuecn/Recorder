@echo off

:Run
cls
if not exist test.wav (
	echo test.wav文件不存在，你应该录一个test.wav文件放到这个bat同级目录内
	goto Pause
)

javac -version
if errorlevel 1 (
	echo 需要安装JDK才能编译运行java文件
	goto Pause
)

javac *.java && java Main

set /p step=是否重新运行(y):
if "%step%"=="y" goto Run
goto End

:Pause
pause
:End