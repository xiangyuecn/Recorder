@echo off

node -v > nul
if errorlevel 1 (
	echo 未安装NodeJs，node相关的服务无法运行！！
	echo.
)

echo 【可用服务】
echo 1. node NodeJsServer_asr.aliyun.short.js 阿里云一句话识别生成Token的api接口

echo.
:inputIdx
set /p idx=请输入要运行的服务序号:

if "%idx%"=="1" (
	node NodeJsServer_asr.aliyun.short.js
) else (
	echo 序号%idx%不存在！
	goto inputIdx
)

echo bye~
pause