package com.blogforum.service;

import com.blogforum.model.ChatMessage;
import com.blogforum.model.User;
import com.blogforum.payload.request.ChatRequest;
import com.blogforum.repository.ChatMessageRepository;
import com.blogforum.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import com.blogforum.repository.FollowRepository;

@Service
public class ChatService {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FollowRepository followRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private TelegramService telegramService;

    // Anti-spam: lưu thời điểm gửi Telegram notification cuối cùng cho mỗi cặp (sender->receiver)
    // Key: "senderUsername->receiverUsername", Value: timestamp
    private final java.util.concurrent.ConcurrentHashMap<String, Long> lastTelegramNotifyTime = new java.util.concurrent.ConcurrentHashMap<>();
    private static final long TELEGRAM_NOTIFY_COOLDOWN_MS = 5 * 60 * 1000; // 5 phút

    @Transactional
    public ChatMessage sendMessage(String senderUsername, ChatRequest request) {
        User sender = userRepository.findByUsername(senderUsername).orElseThrow(() -> new RuntimeException("Sender not found"));
        User receiver = userRepository.findByUsername(request.getReceiverUsername()).orElseThrow(() -> new RuntimeException("Receiver not found"));

        ChatMessage message = ChatMessage.builder()
                .sender(sender)
                .receiver(receiver)
                .content(request.getContent())
                .read(false)
                .build();

        ChatMessage savedMessage = chatMessageRepository.save(message);

        // STOMP WebSocket broadcast
        messagingTemplate.convertAndSend("/topic/chat/" + receiver.getUsername(), savedMessage);
        messagingTemplate.convertAndSend("/topic/chat/" + sender.getUsername(), savedMessage);

        // ============ Telegram notification khi có tin nhắn mới =============
        String receiverChatId = receiver.getTelegramChatId();
        if (receiverChatId != null && !receiverChatId.isBlank()) {
            // Anti-spam: chỉ gửi Telegram tối đa 1 lần / 5 phút cho cùng 1 sender
            String spamKey = senderUsername + "->" + receiver.getUsername();
            long now = System.currentTimeMillis();
            Long lastNotify = lastTelegramNotifyTime.get(spamKey);
            if (lastNotify == null || (now - lastNotify) > TELEGRAM_NOTIFY_COOLDOWN_MS) {
                lastTelegramNotifyTime.put(spamKey, now);
                telegramService.notifyNewChatMessage(receiverChatId, senderUsername, request.getContent());
            }
        }

        return savedMessage;
    }

    public List<ChatMessage> getConversation(String user1Username, String user2Username) {
        User user1 = userRepository.findByUsername(user1Username).orElseThrow();
        User user2 = userRepository.findByUsername(user2Username).orElseThrow();
        return chatMessageRepository.findConversation(user1, user2);
    }
    
    @Transactional
    public void markMessagesAsRead(String currentUsername, String senderUsername) {
        User receiver = userRepository.findByUsername(currentUsername).orElseThrow();
        User sender = userRepository.findByUsername(senderUsername).orElseThrow();
        
        List<ChatMessage> unreadMessages = chatMessageRepository.findByReceiverAndReadFalse(receiver);
        for (ChatMessage msg : unreadMessages) {
            if (msg.getSender().getId().equals(sender.getId())) {
                msg.setRead(true);
                chatMessageRepository.save(msg);
            }
        }
    }

    public List<User> getMessageRequests(String currentUsername) {
        User receiver = userRepository.findByUsername(currentUsername).orElseThrow();
        List<User> senders = chatMessageRepository.findDistinctSendersByReceiver(receiver);
        
        return senders.stream()
            .filter(sender -> !followRepository.existsByFollowerAndFollowing(receiver, sender))
            .collect(Collectors.toList());
    }
}
