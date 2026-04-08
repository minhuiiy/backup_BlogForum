package com.blogforum.service;

import com.blogforum.model.Comment;
import com.blogforum.model.User;
import com.blogforum.payload.request.UserProfileRequest;
import com.blogforum.repository.CommentRepository;
import com.blogforum.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CommentRepository commentRepository;

    public User getCurrentUserProfile() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng"));
    }

    @Transactional
    public User updateCurrentUserProfile(UserProfileRequest profileRequest) {
        User user = getCurrentUserProfile();
        if (profileRequest.getBio() != null) {
            user.setBio(profileRequest.getBio());
        }
        if (profileRequest.getAvatarUrl() != null) {
            user.setAvatarUrl(profileRequest.getAvatarUrl());
        }
        if (profileRequest.getDisplayName() != null) {
            user.setDisplayName(profileRequest.getDisplayName());
        }
        if (profileRequest.getGender() != null) {
            user.setGender(profileRequest.getGender());
        }
        return userRepository.save(user);
    }

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public java.util.List<User> searchUsers(String keyword) {
        return userRepository.findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(keyword, keyword);
    }
    @Transactional
    public void unlinkTelegram(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setTelegramChatId(null);
        user.setTelegramLinkToken(null);
        user.setTelegramLinkTokenExpiry(null);
        userRepository.save(user);
    }

    public List<Comment> getCommentsByUsername(String username) {
        return commentRepository.findByUserUsernameOrderByCreatedAtDesc(username);
    }
}
