# Spring Boot demo application launcher (PowerShell version)
# This script runs the demo module from the backend directory

Push-Location "$PSScriptRoot\demo"
try {
    mvn "-DskipTests=true" "-Dspring.devtools.restart.enabled=false" spring-boot:run
} finally {
    Pop-Location
}
