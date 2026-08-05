package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * HYPERKART Commerce Spring Boot Application
 * ===========================================
 * Main bootstrapper class for the backend application services.
 * Enables automatic task scheduling for real-time background event simulation.
 */
@SpringBootApplication
@EnableScheduling
public class DemoApplication {

	/**
	 * Application execution entry point.
	 *
	 * @param args command line arguments
	 */
	public static void main(String[] args) {
		SpringApplication.run(DemoApplication.class, args);
	}

}
