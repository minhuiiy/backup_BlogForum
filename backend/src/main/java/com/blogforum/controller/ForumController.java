package com.blogforum.controller;

import com.blogforum.model.Answer;
import com.blogforum.model.Question;
import com.blogforum.service.ForumService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/forum")
public class ForumController {

    @Autowired
    private ForumService forumService;

    @GetMapping("/questions")
    public ResponseEntity<Page<Question>> getAllQuestions(Pageable pageable) {
        return ResponseEntity.ok(forumService.getAllQuestions(pageable));
    }

    @GetMapping("/questions/{id}")
    public ResponseEntity<Question> getQuestionById(@PathVariable Long id) {
        return forumService.getQuestionById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/questions")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<Question> createQuestion(@RequestBody Question question) {
        return ResponseEntity.ok(forumService.createQuestion(question));
    }

    @GetMapping("/questions/{id}/answers")
    public ResponseEntity<List<Answer>> getAnswersByQuestion(@PathVariable Long id) {
        return ResponseEntity.ok(forumService.getAnswersByQuestion(id));
    }

    @PostMapping("/questions/{id}/answers")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<Answer> createAnswer(@PathVariable Long id, @RequestBody Answer answer) {
        return ResponseEntity.ok(forumService.createAnswer(id, answer));
    }

    @PutMapping("/questions/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<Question> updateQuestion(@PathVariable Long id, @RequestBody Question question) {
        return ResponseEntity.ok(forumService.updateQuestion(id, question));
    }

    @DeleteMapping("/questions/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteQuestion(@PathVariable Long id) {
        forumService.deleteQuestion(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/answers/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<Answer> updateAnswer(@PathVariable Long id, @RequestBody Answer answer) {
        return ResponseEntity.ok(forumService.updateAnswer(id, answer));
    }

    @DeleteMapping("/answers/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteAnswer(@PathVariable Long id) {
        forumService.deleteAnswer(id);
        return ResponseEntity.noContent().build();
    }
}
