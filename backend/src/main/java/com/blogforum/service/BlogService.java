package com.blogforum.service;

import com.blogforum.model.Category;
import com.blogforum.model.Post;
import com.blogforum.model.EPostStatus;
import com.blogforum.model.Tag;
import com.blogforum.model.User;
import com.blogforum.repository.CategoryRepository;
import com.blogforum.repository.PostRepository;
import com.blogforum.repository.TagRepository;
import com.blogforum.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BlogService {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private TagRepository tagRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ContentModerationService contentModerationService;

    @Autowired
    private TelegramService telegramService;

    @Transactional(readOnly = true)
    public Page<Post> getAllPosts(Pageable pageable) {
        if (SecurityContextHolder.getContext().getAuthentication() != null &&
            SecurityContextHolder.getContext().getAuthentication().getPrincipal() instanceof UserDetails) {
            String username = ((UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getUsername();
            User user = userRepository.findByUsername(username).orElse(null);
            
            if (user != null) {
                boolean hasInterests = user.getInterests() != null && !user.getInterests().isEmpty();
                boolean hasTags = user.getTags() != null && !user.getTags().isEmpty();
                
                List<String> interestsParams = hasInterests ? user.getInterests() : List.of("DUMMY_XXX_NO_MATCH");
                List<String> tagsParams = hasTags ? user.getTags() : List.of("DUMMY_XXX_NO_MATCH");
                
                return postRepository.findAllPrioritized(interestsParams, tagsParams, username, pageable);
            }
        }
        
        return postRepository.findAll(pageable);
    }

    public Optional<Post> getPostById(Long id) {
        return postRepository.findById(id);
    }

    @Transactional
    public Post createPost(Post post) {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            throw new RuntimeException("No authentication found in security context");
        }
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username;
        if (principal instanceof UserDetails) {
            username = ((UserDetails) principal).getUsername();
        } else {
            username = principal.toString();
        }
        
        if ("anonymousUser".equals(username)) {
            throw new RuntimeException("Cannot create post as anonymous user");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        post.setAuthor(user);
        
        // Kiểm duyệt bài viết trước khi lưu
        contentModerationService.validateText(post.getTitle());
        contentModerationService.validateText(post.getContent());
        contentModerationService.validateImagesInHtml(post.getContent());
        
        if (post.getCategory() != null && post.getCategory().getName() != null) {
            String categoryName = post.getCategory().getName();
            Category cat = categoryRepository.findByName(categoryName).orElseGet(() -> {
                Category newCat = new Category();
                newCat.setName(categoryName);
                newCat.setDescription("Cộng đồng " + categoryName);
                return categoryRepository.save(newCat);
            });
            post.setCategory(cat);

            // Kiểm tra quyền moderator và admin
            boolean isModerator = cat.getModerators().contains(user);
            boolean isAdmin = user.getRoles().stream().anyMatch(r -> r.getName().name().equals("ROLE_ADMIN"));

            // ✅ Bắt buộc phải là member, moderator, hoặc admin mới được đăng bài
            boolean isMember = cat.getMembers().contains(user);
            if (!isMember && !isModerator && !isAdmin) {
                throw new RuntimeException("Bạn cần tham gia cộng đồng '" + categoryName + "' trước khi đăng bài.");
            }

            // Logic phân quyền duyệt: mod/admin tự duyệt, member thường cần chờ
            if (!isModerator && !isAdmin) {
                post.setStatus(EPostStatus.PENDING);
            } else {
                post.setStatus(EPostStatus.APPROVED);
            }
        } else {
            post.setStatus(EPostStatus.APPROVED);
        }
        
        // Resolve tags: tìm hoặc tạo tag trong DB để tránh TransientObjectException
        if (post.getTags() != null && !post.getTags().isEmpty()) {
            Set<Tag> managedTags = new HashSet<>();
            for (Tag tag : post.getTags()) {
                String tagName = tag.getName();
                if (tagName == null || tagName.isBlank()) continue;
                String normalized = tagName.trim().toLowerCase().replaceAll("\\s+", "-");
                Tag managed = tagRepository.findByName(normalized)
                    .orElseGet(() -> tagRepository.save(new Tag(null, normalized)));
                managedTags.add(managed);
            }
            post.setTags(managedTags);
        }

        Post savedPost = postRepository.save(post);

        // Lưu tags và cập nhật sở thích user (thuật toán đề xuất)
        if (post.getTags() != null && !post.getTags().isEmpty()) {
            List<String> userTagList = user.getTags() != null ? new java.util.ArrayList<>(user.getTags()) : new java.util.ArrayList<>();
            for (Tag tag : post.getTags()) {
                if (!userTagList.contains(tag.getName())) {
                    userTagList.add(tag.getName());
                }
            }
            user.setTags(userTagList);
            userRepository.save(user);
        }

        // Gửi thông báo Telegram nếu bài cần duyệt
        if (EPostStatus.PENDING.equals(savedPost.getStatus())) {
            telegramService.notifyAdminNewPendingPost(savedPost);
        }

        return savedPost;
    }

    @Transactional
    public Post updatePost(Post post) {
        Post existingPost = postRepository.findById(post.getId())
            .orElseThrow(() -> new RuntimeException("Bài viết không tồn tại"));
            
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        boolean isAdmin = SecurityContextHolder.getContext().getAuthentication()
            .getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_MODERATOR"));
            
        if (!existingPost.getAuthor().getUsername().equals(username) && !isAdmin) {
            throw new RuntimeException("Bạn không có quyền chỉnh sửa bài viết này");
        }

        // Validate: tiêu đề và nội dung không được để trống
        if (post.getTitle() == null || post.getTitle().trim().isEmpty()) {
            throw new com.blogforum.exception.ContentModerationException("Tiêu đề bài viết không được để trống");
        }
        if (post.getContent() == null || post.getContent().trim().isEmpty()) {
            throw new com.blogforum.exception.ContentModerationException("Nội dung bài viết không được để trống");
        }
        
        // Kiểm duyệt nội dung
        contentModerationService.validateText(post.getTitle());
        contentModerationService.validateText(post.getContent());
        contentModerationService.validateImagesInHtml(post.getContent());
        
        existingPost.setTitle(post.getTitle());
        existingPost.setContent(post.getContent());
        if (post.getCategory() != null) {
            existingPost.setCategory(post.getCategory());
        }
        
        return postRepository.save(existingPost);
    }

    public void deletePost(Long id) {
        Post existingPost = postRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Post not found"));
            
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        boolean isAdmin = SecurityContextHolder.getContext().getAuthentication()
            .getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_MODERATOR"));
            
        if (!existingPost.getAuthor().getUsername().equals(username) && !isAdmin) {
            throw new RuntimeException("You are not authorized to delete this post");
        }
        postRepository.deleteById(id);
    }

    public List<Post> searchPosts(String query) {
        return postRepository.searchPostsByPopularity(query);
    }

    @Transactional(readOnly = true)
    public Page<Post> getPendingPostsByCategory(Long categoryId, Pageable pageable) {
        return postRepository.findPendingPostsByCategoryId(categoryId, pageable);
    }

    @Transactional
    public Post approvePost(Long postId) {
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));
        post.setStatus(EPostStatus.APPROVED);
        Post saved = postRepository.save(post);

        // Thông báo tác giả qua Telegram
        telegramService.notifyAuthorPostApproved(saved);

        // Cross-post lên channel của category nếu có
        if (saved.getCategory() != null && saved.getCategory().getTelegramChannelId() != null) {
            telegramService.crossPostToChannel(saved, saved.getCategory().getTelegramChannelId());
        }

        return saved;
    }

    @Transactional
    public void rejectPost(Long postId) {
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));
        // Thông báo tác giả trước khi xóa
        telegramService.notifyAuthorPostRejected(post);
        postRepository.delete(post);
    }

    @Transactional
    public Post likePost(Long postId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found: " + postId));

        if (post.getLikedByUsers().contains(user)) {
            post.getLikedByUsers().remove(user);
            post.setLikes(Math.max(0, post.getLikes() - 1));
        } else {
            post.getLikedByUsers().add(user);
            post.setLikes(post.getLikes() + 1);
            
            // Notify author if it's not their own post
            if (!post.getAuthor().getUsername().equals(username)) {
                com.blogforum.model.ENotificationType type = com.blogforum.model.ENotificationType.LIKE;
                notificationService.createNotification(
                    post.getAuthor().getUsername(), 
                    username, 
                    type, 
                    username + " đã thích bài viết của bạn: " + post.getTitle(), 
                    post, 
                    null
                );
            }
        }

        return postRepository.save(post);
    }

    public List<Long> getLikedPostIds() {
        if (SecurityContextHolder.getContext().getAuthentication() == null || !SecurityContextHolder.getContext().getAuthentication().isAuthenticated()) {
            return List.of();
        }
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if ("anonymousUser".equals(username)) {
            return List.of();
        }
        return postRepository.findLikedPostIdsByUsername(username);
    }

    // ===== SAVE / BOOKMARK =====
    @Transactional
    public void savePost(Long postId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found: " + postId));
        user.getSavedPosts().add(post);
        userRepository.save(user);
    }

    @Transactional
    public void unsavePost(Long postId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found: " + postId));
        user.getSavedPosts().remove(post);
        userRepository.save(user);
    }

    public List<Long> getSavedPostIds() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if ("anonymousUser".equals(username)) return List.of();
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return List.of();
        return user.getSavedPosts().stream()
                .map(Post::getId)
                .collect(java.util.stream.Collectors.toList());
    }
}
