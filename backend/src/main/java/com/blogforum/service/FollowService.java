package com.blogforum.service;

import com.blogforum.model.Follow;
import com.blogforum.model.User;
import com.blogforum.repository.FollowRepository;
import com.blogforum.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FollowService {

    @Autowired
    private FollowRepository followRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    @Transactional
    public void followUser(String targetUsername) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        if (currentUsername.equals(targetUsername)) return;

        User currentUser = userRepository.findByUsername(currentUsername).orElseThrow(() -> new RuntimeException("User not found"));
        User targetUser = userRepository.findByUsername(targetUsername).orElseThrow(() -> new RuntimeException("Target user not found"));

        if (!followRepository.existsByFollowerAndFollowing(currentUser, targetUser)) {
            Follow follow = Follow.builder()
                .follower(currentUser)
                .following(targetUser)
                .build();
            followRepository.save(follow);

            notificationService.createNotification(
                targetUsername,
                currentUsername,
                com.blogforum.model.ENotificationType.FOLLOW,
                currentUsername + " đã bắt đầu theo dõi bạn.",
                null,
                null
            );
        }
    }

    @Transactional
    public void unfollowUser(String targetUsername) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(currentUsername).orElseThrow(() -> new RuntimeException("User not found"));
        User targetUser = userRepository.findByUsername(targetUsername).orElseThrow(() -> new RuntimeException("Target user not found"));

        followRepository.findByFollowerAndFollowing(currentUser, targetUser)
                .ifPresent(followRepository::delete);
    }

    public boolean isFollowing(String checkUsername, String targetUsername) {
        User currentUser = userRepository.findByUsername(checkUsername).orElse(null);
        User targetUser = userRepository.findByUsername(targetUsername).orElse(null);
        if (currentUser == null || targetUser == null) return false;
        return followRepository.existsByFollowerAndFollowing(currentUser, targetUser);
    }

    public List<User> getFollowers(String username) {
        User user = userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found"));
        return followRepository.findByFollowing(user).stream().map(Follow::getFollower).collect(Collectors.toList());
    }

    public List<User> getFollowing(String username) {
        User user = userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found"));
        return followRepository.findByFollower(user).stream().map(Follow::getFollowing).collect(Collectors.toList());
    }
}
