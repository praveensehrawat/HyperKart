package com.example.demo.product;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

/**
 * File Upload Controller
 * ======================
 * Manages HTTP Multipart form file uploads. Saves files to local disk and returns the serving path.
 */
@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private final String uploadDir = "uploads";

    @PostMapping
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Uploaded file cannot be empty"));
        }

        try {
            // Ensure destination uploads directory exists
            File directory = new File(uploadDir);
            if (!directory.exists()) {
                directory.mkdirs();
            }

            // Generate unique UUID based filename
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String filename = UUID.randomUUID().toString() + extension;

            // Write bytes to destination folder
            byte[] bytes = file.getBytes();
            Path path = Paths.get(uploadDir + File.separator + filename);
            Files.write(path, bytes);

            // Construct relative public URL path
            String fileUrl = "/uploads/" + filename;
            return ResponseEntity.ok(Map.of("imageUrl", fileUrl));

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "Failed to save file on disk: " + e.getMessage()
            ));
        }
    }
}
