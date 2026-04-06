package com.blogforum.service;

import com.blogforum.model.Comment;
import com.blogforum.model.Post;
import com.blogforum.model.User;
import com.blogforum.payload.request.CommentRequest;
import com.blogforum.repository.CommentRepository;
import com.blogforum.repository.PostRepository;
import com.blogforum.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CommentService {
    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    public List<Comment> getCommentsByPost(Long postId) {
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));
        return commentRepository.findByPostAndParentIsNull(post);
    }

    @Transactional
    public Comment addComment(Long postId, CommentRequest request) {
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));
            
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
            
        Comment comment = new Comment();
        comment.setContent(request.getContent());
        comment.setPost(post);
        comment.setUser(user);
        
        if (request.getParentId() != null) {
            Comment parent = commentRepository.findById(request.getParentId())
                .orElseThrow(() -> new RuntimeException("Parent comment not found"));
            comment.setParent(parent);
        }
        
        Comment savedComment = commentRepository.save(comment);
        
        if (savedComment.getParent() != null) {
            // It's a reply. Notify the parent comment's author.
            User parentAuthor = savedComment.getParent().getUser();
            if (!parentAuthor.getUsername().equals(username)) {
                notificationService.createNotification(
                    parentAuthor.getUsername(), 
                    username, 
                    com.blogforum.model.ENotificationType.COMMENT, 
                    username + " đã trả lời bình luận của bạn trong bài: " + post.getTitle(), 
                    post, 
                    savedComment
                );
            }
        } else {
            // It's a top-level comment. Notify the post's author.
            if (!post.getAuthor().getUsername().equals(username)) {
                notificationService.createNotification(
                    post.getAuthor().getUsername(), 
                    username, 
                    com.blogforum.model.ENotificationType.COMMENT, 
                    username + " đã bình luận về bài viết của bạn: " + post.getTitle(), 
                    post, 
                    savedComment
                );
            }
        }
        
        return savedComment;
    }
    
    @Transactional
    public void deleteComment(Long commentId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Comment comment = commentRepository.findById(commentId)
            .orElseThrow(() -> new RuntimeException("Comment not found"));
            
        boolean isAdmin = SecurityContextHolder.getContext().getAuthentication()
            .getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_MODERATOR"));
            
        if (!comment.getUser().getUsername().equals(username) && !isAdmin) {
            throw new RuntimeException("You are not authorized to delete this comment");
        }
        
        commentRepository.delete(comment);
    }
}
