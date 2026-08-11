# Stage 1: Build
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app
COPY backend/demo/pom.xml ./pom.xml
COPY backend/demo/src ./src
ENV MAVEN_OPTS="-Xmx384m"
RUN mvn clean package -DskipTests -B

# Stage 2: Run
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN mkdir -p uploads
EXPOSE 8080
ENTRYPOINT ["java", "-Xms128m", "-Xmx448m", "-XX:+UseG1GC", "-XX:+TieredCompilation", "-XX:TieredStopAtLevel=1", "-Djava.net.preferIPv4Stack=true", "-Dspring.jmx.enabled=false", "-jar", "app.jar"]
