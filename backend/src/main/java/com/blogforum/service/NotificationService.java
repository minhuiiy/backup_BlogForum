package com.blogforum.service;

import com.blogforum.model.Notification;
import com.blogforum.model.User;
import com.blogforum.model.Post;
import com.blogforum.model.Comment;
import com.blogforum.model.ENotificationType;
import com.blogforum.repository.NotificationRepository;
import com.blogforum.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TelegramService telegramService;

    @Transactional
    public void createNotification(String recipientUsername, String actorUsername, ENotificationType type, String content, Post post, Comment comment) {
        if (recipientUsername.equals(actorUsername)) {
            return; // Don't notify yourself
        }

        User recipient = userRepository.findByUsername(recipientUsername).orElse(null);
        User actor = userRepository.findByUsername(actorUsername).orElse(null);

        if (recipient == null || actor == null) return;

        Notification notification = Notification.builder()
                .recipient(recipient)
                .actor(actor)
                .type(type)
                .content(content)
                .post(post)
                .comment(comment)
                .read(false)
                .build();

        Notification saved = notificationRepository.save(notification);

        // Use a specific topic for the user to bypass missing WebSocket Principal issues with JWT
        messagingTemplate.convertAndSend("/topic/notifications/" + recipientUsername, 
                "{\"id\":" + saved.getId() + 
                ",\"content\":\"" + content + "\"" +
                ",\"actor\":\"" + actorUsername + "\"" +
                ",\"type\":\"" + type.name() + "\"" +
                "}");

        // ============ Gửi thông báo Telegram nếu người nhận đã liên kết =============
        String recipientChatId = recipient.getTelegramChatId();
        if (recipientChatId != null && !recipientChatId.isBlank()) {
            switch (type) {
                case COMMENT -> {
                    boolean isReply = (comment != null && comment.getParent() != null);
                    String postTitle = post != null ? post.getTitle() : "bài viết";
                    Long postId = post != null ? post.getId() : null;
                    String commentText = comment != null ? comment.getContent() : content;
                    telegramService.notifyNewComment(recipientChatId, actorUsername, postTitle, postId, commentText, isReply);
                }
                case LIKE -> {
                    String postTitle = post != null ? post.getTitle() : "bài viết";
                    Long postId = post != null ? post.getId() : null;
                    telegramService.notifyNewLike(recipientChatId, actorUsername, postTitle, postId);
                }
                case FOLLOW -> {
                    telegramService.notifyNewFollower(recipientChatId, actorUsername);
                }
                default -> {} // MESSAGE handled separately in ChatService
            }
        }
    }

    public List<Notification> getUnreadNotificationsForUser(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return List.of();
        return notificationRepository.findByRecipientOrderByCreatedAtDesc(user);
    }
    
    public long getUnreadCount(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return 0;
        return notificationRepository.countByRecipientAndReadFalse(user);
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    @Transactional
    public void markAllAsRead(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return;
        List<Notification> unreads = notificationRepository.findByRecipientOrderByCreatedAtDesc(user);
        for (Notification n : unreads) {
            if (!n.isRead()) {
                n.setRead(true);
            }
        }
        notificationRepository.saveAll(unreads);
    }
    
    @Deprecated
    public void sendNotification(String username, String message) {
        messagingTemplate.convertAndSendToUser(username, "/queue/notifications", message);
    }
    
    @Deprecated
    public void sendPublicNotification(String message) {
        messagingTemplate.convertAndSend("/topic/public", message);
    }
}
