package com.blogforum.controller;

import com.blogforum.model.*;
import com.blogforum.repository.*;
import com.blogforum.service.BlogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private BlogService blogService;

    // ===== USERS =====
    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PutMapping("/users/{userId}/roles")
    public ResponseEntity<?> updateUserRoles(@PathVariable Long userId, @RequestBody Map<String, List<String>> request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<String> strRoles = request.get("roles");
        Set<Role> roles = new HashSet<>();
        if (strRoles != null) {
            strRoles.forEach(role -> {
                switch (role) {
                    case "admin": roles.add(roleRepository.findByName(ERole.ROLE_ADMIN).orElseThrow()); break;
                    case "mod": roles.add(roleRepository.findByName(ERole.ROLE_MODERATOR).orElseThrow()); break;
                    case "expert": roles.add(roleRepository.findByName(ERole.ROLE_EXPERT).orElseThrow()); break;
                    default: roles.add(roleRepository.findByName(ERole.ROLE_USER).orElseThrow());
                }
            });
        }
        user.setRoles(roles);
        userRepository.save(user);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/users/{userId}/lock")
    public ResponseEntity<?> toggleUserLock(@PathVariable Long userId, @RequestBody Map<String, Boolean> request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Boolean lockStatus = request.get("locked");
        if (lockStatus != null) { user.setLocked(lockStatus); userRepository.save(user); }
        return ResponseEntity.ok(user);
    }

    // ===== STATISTICS =====
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        long totalUsers = userRepository.count();
        long totalPosts = postRepository.count();
        long pendingPosts = postRepository.findAll().stream()
            .filter(p -> EPostStatus.PENDING.name().equals(p.getStatus() != null ? p.getStatus().name() : null))
            .count();
        long totalCommunities = categoryRepository.count();
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUsers", totalUsers);
        stats.put("totalPosts", totalPosts);
        stats.put("pendingPosts", pendingPosts);
        stats.put("totalCommunities", totalCommunities);
        return ResponseEntity.ok(stats);
    }

    // ===== POSTS =====
    @GetMapping("/posts")
    public ResponseEntity<?> getAllPostsAdmin(@RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        var posts = postRepository.findAll(pageable);
        return ResponseEntity.ok(posts);
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Void> deletePostAdmin(@PathVariable Long id) {
        blogService.deletePost(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/posts/{id}/approve")
    public ResponseEntity<?> approvePostAdmin(@PathVariable Long id) {
        return ResponseEntity.ok(blogService.approvePost(id));
    }

    @DeleteMapping("/posts/{id}/reject")
    public ResponseEntity<Void> rejectPostAdmin(@PathVariable Long id) {
        blogService.rejectPost(id);
        return ResponseEntity.noContent().build();
    }

    // ===== COMMUNITIES =====
    @GetMapping("/communities")
    public ResponseEntity<?> getAllCommunities() {
        return ResponseEntity.ok(categoryRepository.findAll());
    }

    @DeleteMapping("/communities/{id}")
    public ResponseEntity<Void> deleteCommunity(@PathVariable Long id) {
        categoryRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
