package com.blogforum.controller;

import com.blogforum.model.User;
import com.blogforum.payload.request.UserProfileRequest;
import com.blogforum.service.UserService;
import com.blogforum.service.TelegramService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private TelegramService telegramService;

    @GetMapping("/me")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<User> getCurrentUser() {
        return ResponseEntity.ok(userService.getCurrentUserProfile());
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<User> updateCurrentUser(@RequestBody UserProfileRequest request) {
        return ResponseEntity.ok(userService.updateCurrentUserProfile(request));
    }

    @GetMapping("/profile/{username}")
    public ResponseEntity<User> getPublicUserProfile(@PathVariable String username) {
        return ResponseEntity.ok(userService.getUserByUsername(username));
    }

    @GetMapping("/search")
    public ResponseEntity<java.util.List<User>> searchUsers(@RequestParam("q") String keyword) {
        return ResponseEntity.ok(userService.searchUsers(keyword));
    }

    // ==========================================
    // Telegram Auto-Link Endpoints
    // ==========================================

    /** Tạo deep link liên kết Telegram (token hết hạn sau 10 phút) */
    @PostMapping("/telegram/generate-link")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> generateTelegramLink() {
        String username = getUsername();
        if (username == null) return ResponseEntity.status(401).build();
        try {
            Map<String, String> result = telegramService.generateLinkToken(username);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    /** Kiểm tra trạng thái liên kết Telegram */
    @GetMapping("/telegram/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getTelegramStatus() {
        String username = getUsername();
        if (username == null) return ResponseEntity.status(401).build();
        User user = userService.getUserByUsername(username);
        boolean linked = user.getTelegramChatId() != null && !user.getTelegramChatId().isBlank();
        return ResponseEntity.ok(Map.of("linked", linked, "chatId", linked ? user.getTelegramChatId() : ""));
    }

    /** Hủy liên kết Telegram */
    @DeleteMapping("/telegram/unlink")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> unlinkTelegram() {
        String username = getUsername();
        if (username == null) return ResponseEntity.status(401).build();
        userService.unlinkTelegram(username);
        return ResponseEntity.ok(Map.of("message", "Đã hủy liên kết Telegram"));
    }

    @GetMapping("/me/comments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getMyComments() {
        String username = getUsername();
        if (username == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(userService.getCommentsByUsername(username));
    }

    @GetMapping("/profile/{username}/comments")
    public ResponseEntity<?> getUserComments(@PathVariable String username) {
        return ResponseEntity.ok(userService.getCommentsByUsername(username));
    }

    private String getUsername() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails) return ((UserDetails) principal).getUsername();
        return null;
    }
}
