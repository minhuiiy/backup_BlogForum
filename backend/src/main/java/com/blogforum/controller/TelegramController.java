package com.blogforum.controller;

import com.blogforum.model.User;
import com.blogforum.repository.UserRepository;
import com.blogforum.service.TelegramService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/telegram")
public class TelegramController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TelegramService telegramService;

    @Value("${telegram.bot.token}")
    private String botToken;

    /**
     * User liên kết tài khoản với Telegram Chat ID của họ
     * POST /api/v1/telegram/link  { "chatId": "1845357537" }
     */
    @PostMapping("/link")
    public ResponseEntity<?> linkTelegram(@RequestBody Map<String, String> body) {
        String username = getUsername();
        if (username == null) return ResponseEntity.status(401).build();

        String chatId = body.get("chatId");
        if (chatId == null || chatId.isBlank()) {
            return ResponseEntity.badRequest().body("Telegram Chat ID không hợp lệ");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setTelegramChatId(chatId);
        userRepository.save(user);

        // Gửi tin nhắn xác nhận
        telegramService.sendMessage(chatId,
                "✅ <b>Liên kết thành công!</b>\n\nTài khoản <b>@" + username + "</b> đã được kết nối với BlogForum.\n\nBạn sẽ nhận thông báo khi:\n📝 Bài viết của bạn được duyệt\n❌ Bài viết bị từ chối\n💬 Có người tương tác với bạn"
        );

        return ResponseEntity.ok(Map.of("message", "Liên kết Telegram thành công!", "chatId", chatId));
    }

    /**
     * Hủy liên kết Telegram
     * DELETE /api/v1/telegram/link
     */
    @DeleteMapping("/link")
    public ResponseEntity<?> unlinkTelegram() {
        String username = getUsername();
        if (username == null) return ResponseEntity.status(401).build();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setTelegramChatId(null);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Đã hủy liên kết Telegram"));
    }

    /**
     * Kiểm tra trạng thái liên kết
     * GET /api/v1/telegram/status
     */
    @GetMapping("/status")
    public ResponseEntity<?> getTelegramStatus() {
        String username = getUsername();
        if (username == null) return ResponseEntity.status(401).build();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean linked = user.getTelegramChatId() != null && !user.getTelegramChatId().isBlank();
        return ResponseEntity.ok(Map.of(
                "linked", linked,
                "chatId", linked ? user.getTelegramChatId() : ""
        ));
    }

    /**
     * Admin: Gửi tin nhắn test
     * POST /api/v1/telegram/test
     */
    @PostMapping("/test")
    public ResponseEntity<?> testNotification() {
        String username = getUsername();
        if (username == null) return ResponseEntity.status(401).build();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getTelegramChatId() == null) {
            return ResponseEntity.badRequest().body("Chưa liên kết Telegram! Hãy liên kết trước.");
        }

        telegramService.sendMessage(user.getTelegramChatId(),
                "🔔 <b>Thông báo thử nghiệm từ BlogForum!</b>\n\nHệ thống thông báo Telegram hoạt động bình thường ✅"
        );

        return ResponseEntity.ok(Map.of("message", "Đã gửi tin nhắn thử nghiệm tới Telegram của bạn!"));
    }

    private String getUsername() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails) {
            return ((UserDetails) principal).getUsername();
        }
        return null;
    }
}
