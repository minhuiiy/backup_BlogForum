package com.blogforum.service;

import com.blogforum.model.Post;
import com.blogforum.model.User;
import com.blogforum.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class TelegramService {

    @Autowired
    private UserRepository userRepository;

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${telegram.bot.admin-chat-id}")
    private String adminChatId;

    @Value("${telegram.bot.frontend-url:http://localhost:4200}")
    private String frontendUrl;

    @Value("${telegram.bot.username:BlogForumNotifyBot}")
    private String botUsername;

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String TELEGRAM_API = "https://api.telegram.org/bot";

    // Theo dõi offset để không xử lý lại message cũ
    private long lastUpdateId = 0;

    // ============================================================
    // Anti-Spam Maps: key = recipientChatId + ":" + postId/userId
    //   LIKE:    10 phút/bài (tránh spam vote)
    //   COMMENT:  2 phút/bài (gom comment nhiều người) 
    //   FOLLOW:   5 phút/người theo dõi
    //   CHAT: đã có sẵn 5 phút/cặp
    // ============================================================
    private final java.util.concurrent.ConcurrentHashMap<String, Long> likeNotifyCooldown    = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.concurrent.ConcurrentHashMap<String, Long> commentNotifyCooldown = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.concurrent.ConcurrentHashMap<String, Long> followNotifyCooldown  = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.concurrent.ConcurrentHashMap<String, Long> chatNotifyCooldown    = new java.util.concurrent.ConcurrentHashMap<>();

    private static final long LIKE_COOLDOWN_MS    = 10 * 60 * 1000L; // 10 phút
    private static final long COMMENT_COOLDOWN_MS =  2 * 60 * 1000L; //  2 phút
    private static final long FOLLOW_COOLDOWN_MS  =  5 * 60 * 1000L; //  5 phút
    private static final long CHAT_COOLDOWN_MS    =  5 * 60 * 1000L; //  5 phút

    /** Trả về true nếu vượt có thể gửi (chưa trong cooldown) */
    private boolean checkAndSetCooldown(java.util.concurrent.ConcurrentHashMap<String, Long> map, String key, long cooldownMs) {
        long now = System.currentTimeMillis();
        Long last = map.get(key);
        if (last != null && (now - last) < cooldownMs) return false; // đang trong cooldown
        map.put(key, now);
        return true;
    }

    // =====================================================
    // Link flow: Tạo token + deep link cho user
    // =====================================================
    public Map<String, String> generateLinkToken(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        String token = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        user.setTelegramLinkToken(token);
        user.setTelegramLinkTokenExpiry(LocalDateTime.now().plusMinutes(10));
        userRepository.save(user);

        String deepLink = "https://t.me/" + botUsername + "?start=" + token;
        Map<String, String> result = new HashMap<>();
        result.put("link", deepLink);
        result.put("token", token);
        result.put("botUsername", botUsername);
        return result;
    }

    // =====================================================
    // Long-polling: Kiểm tra tin nhắn mới mỏi 4 giây
    // =====================================================
    @Scheduled(fixedDelay = 4000)
    public void pollUpdates() {
        try {
            String url = TELEGRAM_API + botToken + "/getUpdates?offset=" + (lastUpdateId + 1) + "&timeout=3";
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null || !Boolean.TRUE.equals(response.get("ok"))) return;

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> updates = (List<Map<String, Object>>) response.get("result");
            if (updates == null || updates.isEmpty()) return;

            for (Map<String, Object> update : updates) {
                Number updateId = (Number) update.get("update_id");
                if (updateId != null) lastUpdateId = updateId.longValue();

                processUpdate(update);
            }
        } catch (Exception e) {
            // Không log lỗi để tránh spam log khi Telegram API chậm
        }
    }

    @SuppressWarnings("unchecked")
    private void processUpdate(Map<String, Object> update) {
        Map<String, Object> message = (Map<String, Object>) update.get("message");
        if (message == null) return;

        String text = (String) message.get("text");
        if (text == null || !text.startsWith("/start ")) return;

        String token = text.substring(7).trim();
        if (token.isEmpty()) {
            // /start thuần — chào hỏi
            Map<String, Object> chat = (Map<String, Object>) message.get("chat");
            if (chat != null) {
                String chatId = String.valueOf(chat.get("id"));
                sendMessage(chatId, "✅ <b>Xin chào bạn đến với BlogForum Bot!</b>\n\nHãy vào trang Profile → chọn Liên kết Telegram để bắt đầu nhận thông báo.");
            }
            return;
        }

        // Tìm user có token này
        userRepository.findByTelegramLinkToken(token).ifPresent(user -> {
            if (user.getTelegramLinkTokenExpiry() != null &&
                user.getTelegramLinkTokenExpiry().isBefore(LocalDateTime.now())) {
                log.warn("Telegram link token expired for user: {}", user.getUsername());
                return;
            }

            Map<String, Object> chat = (Map<String, Object>) message.get("chat");
            if (chat == null) return;
            String chatId = String.valueOf(chat.get("id"));

            // Lưu Chat ID, xóa token
            user.setTelegramChatId(chatId);
            user.setTelegramLinkToken(null);
            user.setTelegramLinkTokenExpiry(null);
            userRepository.save(user);

            log.info("✅ Telegram linked for user {} with chatId {}", user.getUsername(), chatId);

            // Gửi tin chào mừng
            sendMessage(chatId,
                "✅ <b>Liên kết thành công!</b>\n\n" +
                "Đây là tài khoản <b>@" + user.getUsername() + "</b>\n" +
                "Bạn sẽ nhận thông báo qua Telegram khi có:\n" +
                "✅ Bài viết được duyệt/từ chối\n" +
                "💬 Bình luận mới\n" +
                "❤️ Lượt thích\n" +
                "🔔 Người theo dõi mới\n" +
                "✉️ Tin nhắn chat\n\n" +
                "🔗 <a href=\"" + frontendUrl + "/profile\">Xem Profile của bạn</a>");
        });
    }

    // =====================================================
    // Core: Gửi text message đến bất kỳ chatId nào
    // =====================================================
    @Async
    public void sendMessage(String chatId, String text) {
        try {
            String url = TELEGRAM_API + botToken + "/sendMessage";
            Map<String, String> body = new HashMap<>();
            body.put("chat_id", chatId);
            body.put("text", text);
            body.put("parse_mode", "HTML");
            body.put("disable_web_page_preview", "false");
            restTemplate.postForObject(url, body, String.class);
            log.info("Telegram message sent to chatId={}", chatId);
        } catch (Exception e) {
            log.error("Failed to send Telegram message to chatId={}: {}", chatId, e.getMessage());
        }
    }

    // =====================================================
    // Thông báo Admin: Bài mới PENDING cần duyệt
    // =====================================================
    @Async
    public void notifyAdminNewPendingPost(Post post) {
        String categoryName = post.getCategory() != null ? post.getCategory().getName() : "Chung";
        String authorName = post.getAuthor() != null ? post.getAuthor().getUsername() : "Unknown";

        String text = "📝 <b>Bài viết mới cần duyệt!</b>\n\n" +
                "📌 <b>Tiêu đề:</b> " + escapeHtml(post.getTitle()) + "\n" +
                "👤 <b>Tác giả:</b> @" + authorName + "\n" +
                "🏘️ <b>Cộng đồng:</b> r/" + escapeHtml(categoryName) + "\n\n" +
                "🔗 <a href=\"" + frontendUrl + "/r/" + categoryName + "\">Xem cộng đồng</a> | " +
                "<a href=\"" + frontendUrl + "/post/" + post.getId() + "\">Xem bài</a>";

        sendMessage(adminChatId, text);
    }

    // =====================================================
    // Thông báo tác giả: Bài được duyệt (DM cá nhân)
    // =====================================================
    @Async
    public void notifyAuthorPostApproved(Post post) {
        if (post.getAuthor() == null || post.getAuthor().getTelegramChatId() == null) return;

        String categoryName = post.getCategory() != null ? post.getCategory().getName() : "Chung";
        String text = "✅ <b>Bài viết của bạn đã được duyệt!</b>\n\n" +
                "📌 <b>Tiêu đề:</b> " + escapeHtml(post.getTitle()) + "\n" +
                "🏘️ <b>Cộng đồng:</b> r/" + escapeHtml(categoryName) + "\n\n" +
                "👉 <a href=\"" + frontendUrl + "/post/" + post.getId() + "\">Xem bài viết ngay</a>";

        sendMessage(post.getAuthor().getTelegramChatId(), text);
    }

    // =====================================================
    // Thông báo tác giả: Bài bị từ chối (DM cá nhân)
    // =====================================================
    @Async
    public void notifyAuthorPostRejected(Post post) {
        if (post.getAuthor() == null || post.getAuthor().getTelegramChatId() == null) return;

        String text = "❌ <b>Bài viết bị từ chối</b>\n\n" +
                "📌 <b>Tiêu đề:</b> " + escapeHtml(post.getTitle()) + "\n" +
                "💬 Bài viết của bạn không đáp ứng tiêu chí của cộng đồng.\n" +
                "Vui lòng kiểm tra lại nội dung và thử đăng lại.";

        sendMessage(post.getAuthor().getTelegramChatId(), text);
    }

    // =====================================================
    // Cross-post: Đăng bài lên channel Telegram của cộng đồng
    // =====================================================
    @Async
    public void crossPostToChannel(Post post, String channelChatId) {
        if (channelChatId == null || channelChatId.isBlank()) return;

        String authorName = post.getAuthor() != null ? post.getAuthor().getUsername() : "Unknown";
        String categoryName = post.getCategory() != null ? post.getCategory().getName() : "Chung";

        // Lấy text content (bỏ HTML tags)
        String rawContent = post.getContent() != null
                ? post.getContent().replaceAll("<[^>]*>", "").trim()
                : "";
        String preview = rawContent.length() > 200
                ? rawContent.substring(0, 200) + "..."
                : rawContent;

        String text = "🗞️ <b>Bài mới trong r/" + escapeHtml(categoryName) + "</b>\n\n" +
                "📌 <b>" + escapeHtml(post.getTitle()) + "</b>\n" +
                "👤 Đăng bởi <b>@" + authorName + "</b>\n\n" +
                (preview.isEmpty() ? "" : "💬 " + escapeHtml(preview) + "\n\n") +
                "👉 <a href=\"" + frontendUrl + "/post/" + post.getId() + "\">Đọc toàn bài →</a>";

        sendMessage(channelChatId, text);
    }

    // =====================================================
    // Thông báo admin: Thống kê hàng ngày
    // =====================================================
    @Async
    public void sendDailyStats(long totalPosts, long totalUsers, long todayPosts) {
        String text = "📊 <b>Báo cáo hàng ngày - BlogForum</b>\n\n" +
                "📝 Tổng bài viết: <b>" + totalPosts + "</b>\n" +
                "👥 Tổng người dùng: <b>" + totalUsers + "</b>\n" +
                "🔥 Bài viết hôm nay: <b>" + todayPosts + "</b>\n\n" +
                "🔗 <a href=\"" + frontendUrl + "/admin\">Trang quản trị</a>";

        sendMessage(adminChatId, text);
    }

    // =====================================================
    // Thông báo admin: Có comment vi phạm / report
    // =====================================================
    @Async
    public void notifyAdminContentViolation(String type, String content, String reportedBy) {
        String text = "⚠️ <b>Cảnh báo nội dung vi phạm!</b>\n\n" +
                "📋 <b>Loại:</b> " + escapeHtml(type) + "\n" +
                "👤 <b>Báo cáo bởi:</b> @" + escapeHtml(reportedBy) + "\n" +
                "📝 <b>Nội dung:</b>\n<code>" + escapeHtml(
                content.length() > 150 ? content.substring(0, 150) + "..." : content) + "</code>\n\n" +
                "🔗 <a href=\"" + frontendUrl + "/admin\">Xem trang quản trị</a>";

        sendMessage(adminChatId, text);
    }

    // =====================================================
    // Thông báo khi có bình luận mới vào bài viết
    // =====================================================
    @Async
    public void notifyNewComment(String recipientChatId, String commenterUsername, String postTitle, Long postId, String commentContent, boolean isReply) {
        if (recipientChatId == null || recipientChatId.isBlank()) return;

        String preview = commentContent != null && commentContent.length() > 100
                ? commentContent.substring(0, 100) + "..."
                : commentContent;

        String action = isReply ? "trả lời bình luận của bạn" : "bình luận về bài viết của bạn";
        String icon = isReply ? "↩️" : "💬";

        String text = icon + " <b>Bình luận mới!</b>\n\n" +
                "👤 <b>@" + escapeHtml(commenterUsername) + "</b> đã " + action + "\n" +
                "📌 <b>" + escapeHtml(postTitle) + "</b>\n\n" +
                (preview != null ? "💬 <i>" + escapeHtml(preview) + "</i>\n\n" : "") +
                "👉 <a href=\"" + frontendUrl + "/post/" + postId + "\">Xem bình luận</a>";

        sendMessage(recipientChatId, text);
    }

    // =====================================================
    // Thông báo khi bài viết được like
    // Chống spam: tối đa 1 thông báo / 10 phút / bài
    // =====================================================
    @Async
    public void notifyNewLike(String recipientChatId, String likerUsername, String postTitle, Long postId) {
        if (recipientChatId == null || recipientChatId.isBlank()) return;

        String key = recipientChatId + ":like:" + postId;
        if (!checkAndSetCooldown(likeNotifyCooldown, key, LIKE_COOLDOWN_MS)) {
            log.debug("[Anti-spam] Like notif blocked for postId={} (cooldown 10 min)", postId);
            return;
        }

        String text = "❤️ <b>Bài viết được yêu thích!</b>\n\n" +
                "👤 <b>@" + escapeHtml(likerUsername) + "</b> đã thích bài viết của bạn\n" +
                "📌 <b>" + escapeHtml(postTitle) + "</b>\n\n" +
                "👉 <a href=\"" + frontendUrl + "/post/" + postId + "\">Xem bài viết</a>";

        sendMessage(recipientChatId, text);
    }

    // =====================================================
    // Thông báo khi có người theo dõi mới
    // Chống spam: 5 phút/cặp (follow-unfollow liên tục)
    // =====================================================
    @Async
    public void notifyNewFollower(String recipientChatId, String followerUsername) {
        if (recipientChatId == null || recipientChatId.isBlank()) return;

        String key = recipientChatId + ":follow:" + followerUsername;
        if (!checkAndSetCooldown(followNotifyCooldown, key, FOLLOW_COOLDOWN_MS)) {
            log.debug("[Anti-spam] Follow notif blocked for {}", followerUsername);
            return;
        }

        String text = "🔔 <b>Người theo dõi mới!</b>\n\n" +
                "👤 <b>@" + escapeHtml(followerUsername) + "</b> đã bắt đầu theo dõi bạn\n\n" +
                "👉 <a href=\"" + frontendUrl + "/user/" + followerUsername + "\">Xem hồ sơ</a>";

        sendMessage(recipientChatId, text);
    }

    // =====================================================
    // Thông báo khi có tin nhắn chat mới
    // Chống spam: 5 phút/cặp (người gửi)
    // =====================================================
    @Async
    public void notifyNewChatMessage(String recipientChatId, String senderUsername, String messageContent) {
        if (recipientChatId == null || recipientChatId.isBlank()) return;

        String key = recipientChatId + ":chat:" + senderUsername;
        if (!checkAndSetCooldown(chatNotifyCooldown, key, CHAT_COOLDOWN_MS)) {
            log.debug("[Anti-spam] Chat notif blocked from {}", senderUsername);
            return;
        }

        String preview = messageContent != null && messageContent.length() > 120
                ? messageContent.substring(0, 120) + "..."
                : messageContent;

        String text = "✉️ <b>Tin nhắn mới từ @" + escapeHtml(senderUsername) + "</b>\n\n" +
                "💬 <i>" + escapeHtml(preview) + "</i>\n\n" +
                "👉 <a href=\"" + frontendUrl + "/home\">Trả lời ngay</a>";

        sendMessage(recipientChatId, text);
    }

    // =====================================================
    // Utility: Escape HTML cho Telegram
    // =====================================================
    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }
}
