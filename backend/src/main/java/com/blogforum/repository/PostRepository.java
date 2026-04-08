package com.blogforum.repository;

import com.blogforum.model.Post;
import com.blogforum.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDateTime;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    @Query("SELECT p FROM Post p WHERE p.status = 'APPROVED' OR p.status IS NULL")
    @EntityGraph(attributePaths = {"author", "category"})
    Page<Post> findAll(Pageable pageable);

    @Query(value = "SELECT p FROM Post p LEFT JOIN p.category c " +
           "WHERE p.status = 'APPROVED' OR p.status IS NULL " +
           "ORDER BY CASE WHEN (c.name IN :interests) OR EXISTS (SELECT 1 FROM p.tags t WHERE t.name IN :tags) OR (p.author.username = :username) THEN 1 ELSE 0 END DESC, p.createdAt DESC",
           countQuery = "SELECT COUNT(p) FROM Post p WHERE p.status = 'APPROVED' OR p.status IS NULL")
    @EntityGraph(attributePaths = {"author", "category"})
    Page<Post> findAllPrioritized(@Param("interests") List<String> interests, @Param("tags") List<String> tags, @Param("username") String username, Pageable pageable);

    @Query("SELECT p.id FROM Post p JOIN p.likedByUsers u WHERE u.username = :username")
    List<Long> findLikedPostIdsByUsername(@Param("username") String username);

    @EntityGraph(attributePaths = {"author", "category"})
    Page<Post> findByAuthor(User author, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE (p.status = 'APPROVED' OR p.status IS NULL) AND p.category.id = :categoryId")
    @EntityGraph(attributePaths = {"author", "category"})
    Page<Post> findByCategoryId(@Param("categoryId") Long categoryId, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.status = 'PENDING' AND p.category.id = :categoryId")
    @EntityGraph(attributePaths = {"author", "category"})
    Page<Post> findPendingPostsByCategoryId(@Param("categoryId") Long categoryId, Pageable pageable);

    void deleteByCategoryId(Long categoryId);

    @EntityGraph(attributePaths = {"author", "category"})
    Page<Post> findByTagsName(String tagName, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE (p.status = 'APPROVED' OR p.status IS NULL) AND LOWER(p.title) LIKE LOWER(CONCAT('%', :title, '%')) ORDER BY (p.likes + p.commentCount) DESC")
    @EntityGraph(attributePaths = {"author", "category"})
    List<Post> searchPostsByPopularity(@Param("title") String title);

    // Đếm số bài đăng sau một thời điểm nhất định (dùng cho báo cáo daily)
    long countByCreatedAtAfter(LocalDateTime dateTime);
}
