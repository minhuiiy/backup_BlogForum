package com.blogforum.controller;

import com.blogforum.model.Post;
import com.blogforum.service.BlogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/posts")
public class BlogController {

    @Autowired
    private BlogService blogService;

    @GetMapping
    public ResponseEntity<Page<Post>> getAllPosts(Pageable pageable) {
        return ResponseEntity.ok(blogService.getAllPosts(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Post> getPostById(@PathVariable Long id) {
        return blogService.getPostById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN') or hasRole('EXPERT')")
    public ResponseEntity<Post> createPost(@RequestBody Post post) {
        return ResponseEntity.ok(blogService.createPost(post));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN') or hasRole('EXPERT')")
    public ResponseEntity<Post> updatePost(@PathVariable Long id, @RequestBody Post post) {
        post.setId(id);
        return ResponseEntity.ok(blogService.updatePost(post));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN') or hasRole('EXPERT')")
    public ResponseEntity<Void> deletePost(@PathVariable Long id) {
        blogService.deletePost(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<Post>> searchPosts(@RequestParam String query) {
        return ResponseEntity.ok(blogService.searchPosts(query));
    }

    @GetMapping("/pending/{categoryId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<Post>> getPendingPosts(@PathVariable Long categoryId, Pageable pageable) {
        // Có thể thêm filter kiểm tra quyền admin/moderator tại đây hoặc ở service
        return ResponseEntity.ok(blogService.getPendingPostsByCategory(categoryId, pageable));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MODERATOR')")
    public ResponseEntity<Post> approvePost(@PathVariable Long id) {
        return ResponseEntity.ok(blogService.approvePost(id));
    }

    @DeleteMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MODERATOR')")
    public ResponseEntity<Void> rejectPost(@PathVariable Long id) {
        blogService.rejectPost(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/vote")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN') or hasRole('EXPERT')")
    public ResponseEntity<Post> likePost(@PathVariable Long id) {
        return ResponseEntity.ok(blogService.likePost(id));
    }

    @GetMapping("/liked")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN') or hasRole('EXPERT')")
    public ResponseEntity<List<Long>> getLikedPosts() {
        return ResponseEntity.ok(blogService.getLikedPostIds());
    }

    // ===== SAVE POST =====
    @PostMapping("/{id}/save")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> savePost(@PathVariable Long id) {
        blogService.savePost(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/save")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> unsavePost(@PathVariable Long id) {
        blogService.unsavePost(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/saved")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Long>> getSavedPostIds() {
        return ResponseEntity.ok(blogService.getSavedPostIds());
    }
}
