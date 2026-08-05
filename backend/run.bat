@echo off
REM Spring Boot demo application launcher
REM This script runs the demo module from the backend directory

cd /d "%~dp0demo"
mvn "-DskipTests=true" "-Dspring.devtools.restart.enabled=false" spring-boot:run

pause
