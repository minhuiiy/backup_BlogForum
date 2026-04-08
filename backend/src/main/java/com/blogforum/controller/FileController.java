package com.blogforum.controller;

import com.blogforum.service.CloudinaryService;
import com.blogforum.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.Resource;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private CloudinaryService cloudinaryService;

    @PostMapping("/upload")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        Map<String, String> response = new HashMap<>();

        // Ưu tiên Cloudinary nếu đã cấu hình
        if (cloudinaryService.isConfigured()) {
            try {
                String cloudUrl = cloudinaryService.uploadFile(file);
                response.put("fileDownloadUri", cloudUrl);
                response.put("fileName", file.getOriginalFilename());
                response.put("fileType", file.getContentType());
                response.put("size", String.valueOf(file.getSize()));
                response.put("storage", "cloudinary");
                return ResponseEntity.ok(response);
            } catch (Exception e) {
                // Fallback về local nếu Cloudinary lỗi
                return uploadToLocal(file, response);
            }
        }

        // Fallback: lưu local
        return uploadToLocal(file, response);
    }

    private ResponseEntity<Map<String, String>> uploadToLocal(MultipartFile file, Map<String, String> response) {
        String fileName = fileStorageService.storeFile(file);
        response.put("fileName", fileName);
        response.put("fileDownloadUri", "/api/v1/files/" + fileName);
        response.put("fileType", file.getContentType());
        response.put("size", String.valueOf(file.getSize()));
        response.put("storage", "local");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{fileName:.+}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName, HttpServletRequest request) {
        Resource resource = fileStorageService.loadFileAsResource(fileName);

        String contentType = null;
        try {
            contentType = request.getServletContext().getMimeType(resource.getFile().getAbsolutePath());
        } catch (IOException ex) {
            // ignore
        }

        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @GetMapping("/cloudinary-status")
    public ResponseEntity<Map<String, Object>> cloudinaryStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("configured", cloudinaryService.isConfigured());
        status.put("message", cloudinaryService.isConfigured()
                ? "✅ Cloudinary CDN đã sẵn sàng"
                : "⚠️ Đang dùng local storage. Cấu hình Cloudinary để tăng hiệu suất.");
        return ResponseEntity.ok(status);
    }
}
