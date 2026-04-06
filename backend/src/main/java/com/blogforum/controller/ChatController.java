package com.blogforum.controller;

import com.blogforum.model.ChatMessage;
import com.blogforum.payload.request.ChatRequest;
import com.blogforum.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @PostMapping("/send")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<ChatMessage> sendMessage(@RequestBody ChatRequest request) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        ChatMessage message = chatService.sendMessage(currentUsername, request);
        return ResponseEntity.ok(message);
    }

    @GetMapping("/history/{targetUsername}")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<List<ChatMessage>> getChatHistory(@PathVariable String targetUsername) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        List<ChatMessage> history = chatService.getConversation(currentUsername, targetUsername);
        return ResponseEntity.ok(history);
    }
    
    @PostMapping("/read/{senderUsername}")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<?> markAsRead(@PathVariable String senderUsername) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        chatService.markMessagesAsRead(currentUsername, senderUsername);
        return ResponseEntity.ok(Map.of("message", "Messages marked as read"));
    }
}
