package com.blogforum.service;

import com.blogforum.model.Category;
import com.blogforum.model.Post;
import com.blogforum.model.User;
import com.blogforum.repository.CategoryRepository;
import com.blogforum.repository.PostRepository;
import com.blogforum.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
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
    private NotificationService notificationService;

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
        
        if (post.getCategory() != null && post.getCategory().getName() != null) {
            String categoryName = post.getCategory().getName();
            Category cat = categoryRepository.findByName(categoryName).orElseGet(() -> {
                Category newCat = new Category();
                newCat.setName(categoryName);
                newCat.setDescription("Cộng đồng " + categoryName);
                return categoryRepository.save(newCat);
            });
            post.setCategory(cat);
        }
        
        return postRepository.save(post);
    }

    public Post updatePost(Post post) {
        return postRepository.save(post);
    }

    public void deletePost(Long id) {
        postRepository.deleteById(id);
    }

    public List<Post> searchPosts(String query) {
        return postRepository.searchPostsByPopularity(query);
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
}
