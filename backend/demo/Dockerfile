# Stage 1: Build
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
ENV MAVEN_OPTS="-Xmx384m"
RUN mvn clean package -DskipTests -B

# Stage 2: Run
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN mkdir -p uploads
EXPOSE 8080
ENTRYPOINT ["java", "-Xms128m", "-Xmx384m", "-XX:+UseG1GC", "-Djava.net.preferIPv4Stack=true", "-jar", "app.jar"]
