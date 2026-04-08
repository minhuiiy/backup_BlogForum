package com.blogforum.service;

import com.blogforum.model.Category;
import com.blogforum.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;
import com.blogforum.model.User;
import com.blogforum.repository.UserRepository;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryService {
    @Autowired
    private CategoryRepository categoryRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private com.blogforum.repository.PostRepository postRepository;

    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    public Optional<Category> getCategoryById(Long id) {
        return categoryRepository.findById(id);
    }

    @Transactional
    public Category createCategory(Category category, String creatorUsername) {
        if (creatorUsername != null) {
            User creator = userRepository.findByUsername(creatorUsername).orElse(null);
            if (creator != null) {
                category.getModerators().add(creator);
                category.getMembers().add(creator);
                category.setCreator(creator); // Lưu người tạo
            }
        }
        return categoryRepository.save(category);
    }

    public Category updateCategory(Long id, Category category) {
        Category existingCategory = categoryRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Category not found"));
        existingCategory.setName(category.getName());
        existingCategory.setDescription(category.getDescription());
        return categoryRepository.save(existingCategory);
    }

    @Transactional
    public void deleteCategory(Long id) {
        postRepository.deleteByCategoryId(id);
        categoryRepository.deleteById(id);
    }

    /**
     * Xóa cộng đồng theo tên.
     * Chỉ cho phép nếu người dùng là creator hoặc ROLE_ADMIN.
     */
    @Transactional
    public void deleteCategoryByName(String categoryName, String requestingUsername) {
        Category category = categoryRepository.findByName(categoryName)
            .orElseThrow(() -> new RuntimeException("Cộng đồng không tồn tại: " + categoryName));

        User user = userRepository.findByUsername(requestingUsername)
            .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại: " + requestingUsername));

        boolean isAdmin = user.getRoles().stream()
            .anyMatch(r -> r.getName().name().equals("ROLE_ADMIN"));
        boolean isCreator = category.getCreator() != null &&
            category.getCreator().getUsername().equals(requestingUsername);

        if (!isAdmin && !isCreator) {
            throw new RuntimeException("Chỉ người tạo cộng đồng hoặc Quản trị viên hệ thống mới có quyền xóa.");
        }

        postRepository.deleteByCategoryId(category.getId());
        categoryRepository.delete(category);
    }

    @Transactional
    public Category updateCategorySettings(String categoryName, String username, String displayName, String description, String imageUrl) {
        Category category = categoryRepository.findByName(categoryName)
            .orElseThrow(() -> new RuntimeException("Category not found: " + categoryName));
            
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found: " + username));
            
        if (!category.getModerators().contains(user) && !user.getRoles().stream().anyMatch(r -> r.getName().name().equals("ROLE_ADMIN"))) {
             throw new RuntimeException("Bạn không phải quản trị viên của cộng đồng này");
        }
        
        if (displayName != null) category.setDisplayName(displayName);
        if (description != null) category.setDescription(description);
        if (imageUrl != null) category.setImageUrl(imageUrl);
        
        return categoryRepository.save(category);
    }

    @Transactional
    public Category updateCategorySettingsFull(String categoryName, String username, String displayName, String description, String imageUrl, String telegramChannelId) {
        Category category = categoryRepository.findByName(categoryName)
            .orElseThrow(() -> new RuntimeException("Category not found: " + categoryName));
            
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found: " + username));
            
        if (!category.getModerators().contains(user) && !user.getRoles().stream().anyMatch(r -> r.getName().name().equals("ROLE_ADMIN"))) {
             throw new RuntimeException("Bạn không phải quản trị viên của cộng đồng này");
        }
        
        if (displayName != null) category.setDisplayName(displayName);
        if (description != null) category.setDescription(description);
        if (imageUrl != null) category.setImageUrl(imageUrl);
        if (telegramChannelId != null) category.setTelegramChannelId(telegramChannelId.isBlank() ? null : telegramChannelId);
        
        return categoryRepository.save(category);
    }

    @Transactional
    public void joinCategory(String categoryName, String username, String role) {
        Category category = categoryRepository.findByName(categoryName)
            .orElseGet(() -> {
                Category newCat = Category.builder()
                        .name(categoryName)
                        .description("Cộng đồng " + categoryName)
                        .build();
                return categoryRepository.save(newCat);
            });
            
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found: " + username));
            
        if ("moderator".equals(role)) {
            category.getModerators().add(user);
        }
        category.getMembers().add(user);
        categoryRepository.save(category);
    }

    @Transactional
    public void leaveCategory(String categoryName, String username) {
        Category category = categoryRepository.findByName(categoryName).orElse(null);
        if (category == null) return;
        
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return;
        
        category.getMembers().remove(user);
        category.getModerators().remove(user);
        categoryRepository.save(category);
    }

    @Transactional(readOnly = true)
    public Map<String, String> getUserMemberships(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        Map<String, String> memberships = new HashMap<>();
        if (user == null) return memberships;
        
        List<Category> allCategories = categoryRepository.findAll();
        for (Category cat : allCategories) {
            String role = null;
            if (cat.getModerators().contains(user)) {
                role = "moderator";
            } else if (cat.getMembers().contains(user)) {
                role = "member";
            }
            if (role != null) {
                memberships.put(cat.getName(), role);
            }
        }
        return memberships;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getCategoryStats(String categoryName) {
        Map<String, Object> stats = new HashMap<>();
        Category category = categoryRepository.findByName(categoryName).orElse(null);
        if (category == null) {
            stats.put("memberCount", 1);
            return stats;
        }
        stats.put("memberCount", Math.max(1, category.getMembers().size()));
        return stats;
    }

    @Transactional
    public void promoteMember(String categoryName, String username) {
        Category category = categoryRepository.findByName(categoryName)
            .orElseThrow(() -> new RuntimeException("Category not found: " + categoryName));
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found: " + username));

        if (!category.getMembers().contains(user)) {
            throw new RuntimeException("User is not a member of this community");
        }
        category.getModerators().add(user);
        categoryRepository.save(category);
    }

    @Transactional
    public void demoteMember(String categoryName, String username) {
        Category category = categoryRepository.findByName(categoryName)
            .orElseThrow(() -> new RuntimeException("Category not found: " + categoryName));
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found: " + username));

        if (category.getModerators().contains(user)) {
            category.getModerators().remove(user);
            categoryRepository.save(category);
        }
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCategoryMembers(String categoryName) {
        Category category = categoryRepository.findByName(categoryName).orElse(null);
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        if (category == null) return result;

        for (User user : category.getMembers()) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", user.getId());
            map.put("username", user.getUsername());
            map.put("name", user.getUsername()); // fallback since name doesn't exist
            map.put("imageUrl", user.getAvatarUrl());
            map.put("isModerator", category.getModerators().contains(user));
            result.add(map);
        }
        return result;
    }
}
