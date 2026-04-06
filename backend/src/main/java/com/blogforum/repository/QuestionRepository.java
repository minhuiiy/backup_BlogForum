package com.blogforum.repository;

import com.blogforum.model.Question;
import com.blogforum.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    @EntityGraph(attributePaths = {"author"})
    Page<Question> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"author"})
    Page<Question> findByAuthor(User author, Pageable pageable);

    @EntityGraph(attributePaths = {"author"})
    Page<Question> findByTagsName(String tagName, Pageable pageable);

    @EntityGraph(attributePaths = {"author"})
    List<Question> findByTitleContainingIgnoreCase(String title);
}
