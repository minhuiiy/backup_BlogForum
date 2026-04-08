package com.blogforum.controller;

import com.blogforum.model.Category;
import com.blogforum.service.CategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

@RestController
@RequestMapping("/api/v1/categories")
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    @GetMapping
    public ResponseEntity<List<Category>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Category> getCategoryById(@PathVariable Long id) {
        return categoryService.getCategoryById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Category> createCategory(@RequestBody Category category) {
        String username = getUsername();
        return ResponseEntity.ok(categoryService.createCategory(category, username));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MODERATOR')")
    public ResponseEntity<Category> updateCategory(@PathVariable Long id, @RequestBody Category category) {
        return ResponseEntity.ok(categoryService.updateCategory(id, category));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MODERATOR')")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/by-name/{name}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> deleteCategoryByName(@PathVariable String name) {
        String username = getUsername();
        if (username == null) return ResponseEntity.status(401).build();
        try {
            categoryService.deleteCategoryByName(name, username);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        }
    }

    @PutMapping("/{name}/settings")
    public ResponseEntity<?> updateCategorySettings(@PathVariable String name, @RequestBody com.blogforum.payload.request.CategorySettingsRequest request) {
        String username = getUsername();
        if (username == null) return ResponseEntity.status(401).build();
        try {
            Category updated = categoryService.updateCategorySettingsFull(
                name, username,
                request.getDisplayName(),
                request.getDescription(),
                request.getImageUrl(),
                request.getTelegramChannelId()
            );
            // Clear passwords and unneeded relations
            updated.setMembers(null);
            updated.setModerators(null);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.status(403).body(e.getMessage());
        }
    }

    @PostMapping("/{name}/join")
    public ResponseEntity<?> joinCategory(@PathVariable String name, @RequestParam(defaultValue = "member") String role) {
        String username = getUsername();
        if (username == null) return ResponseEntity.status(401).build();
        categoryService.joinCategory(name, username, role);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{name}/leave")
    public ResponseEntity<?> leaveCategory(@PathVariable String name) {
        String username = getUsername();
        if (username == null) return ResponseEntity.status(401).build();
        categoryService.leaveCategory(name, username);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{name}/promote")
    public ResponseEntity<?> promoteMember(@PathVariable String name, @RequestParam String memberUsername) {
        String username = getUsername();
        if (username == null) return ResponseEntity.status(401).build();
        categoryService.promoteMember(name, memberUsername);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{name}/demote")
    public ResponseEntity<?> demoteMember(@PathVariable String name, @RequestParam String memberUsername) {
        String username = getUsername();
        if (username == null) return ResponseEntity.status(401).build();
        categoryService.demoteMember(name, memberUsername);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{name}/members")
    public ResponseEntity<List<java.util.Map<String, Object>>> getCategoryMembers(@PathVariable String name) {
        return ResponseEntity.ok(categoryService.getCategoryMembers(name));
    }

    @GetMapping("/my-memberships")
    public ResponseEntity<Map<String, String>> getMyMemberships() {
        String username = getUsername();
        if (username == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(categoryService.getUserMemberships(username));
    }

    @GetMapping("/{name}/stats")
    public ResponseEntity<Map<String, Object>> getCategoryStats(@PathVariable String name) {
        return ResponseEntity.ok(categoryService.getCategoryStats(name));
    }

    private String getUsername() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails) {
            return ((UserDetails) principal).getUsername();
        }
        return null;
    }
}
