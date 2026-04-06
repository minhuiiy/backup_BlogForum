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

@Service
public class ChatService {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

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
}
