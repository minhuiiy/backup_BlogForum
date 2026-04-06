package com.blogforum.repository;

import com.blogforum.model.Comment;
import com.blogforum.model.Post;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    @EntityGraph(attributePaths = {"user"})
    List<Comment> findByPost(Post post);

    @EntityGraph(attributePaths = {"user"})
    List<Comment> findByPostAndParentIsNull(Post post);

    @EntityGraph(attributePaths = {"user"})
    List<Comment> findByParentIsNull(); // Get top-level comments
}
