package com.blogforum.service;

import com.blogforum.model.Answer;
import com.blogforum.model.Question;
import com.blogforum.model.User;
import com.blogforum.repository.AnswerRepository;
import com.blogforum.repository.QuestionRepository;
import com.blogforum.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ForumService {

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private AnswerRepository answerRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    public Page<Question> getAllQuestions(Pageable pageable) {
        return questionRepository.findAll(pageable);
    }

    public Optional<Question> getQuestionById(Long id) {
        return questionRepository.findById(id);
    }

    public Question createQuestion(Question question) {
        User user = getCurrentUser();
        question.setAuthor(user);
        return questionRepository.save(question);
    }

    public List<Answer> getAnswersByQuestion(Long questionId) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));
        return answerRepository.findByQuestion(question);
    }

    public Answer createAnswer(Long questionId, Answer answer) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));
        User user = getCurrentUser();
        answer.setQuestion(question);
        answer.setUser(user);
        Answer savedAnswer = answerRepository.save(answer);
        
        if (!question.getAuthor().getUsername().equals(user.getUsername())) {
             notificationService.createNotification(
                  question.getAuthor().getUsername(), 
                  user.getUsername(),
                  com.blogforum.model.ENotificationType.COMMENT,
                  user.getUsername() + " đã trả lời câu hỏi của bạn: " + question.getTitle(),
                  null,
                  null
             );
        }
        
        return savedAnswer;
    }

    public Question updateQuestion(Long id, Question questionDetails) {
        Question existingQuestion = questionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Question not found"));
        User user = getCurrentUser();
        boolean isAdmin = user.getRoles().stream()
            .anyMatch(r -> r.getName().name().equals("ROLE_ADMIN") || r.getName().name().equals("ROLE_MODERATOR"));
        if (!existingQuestion.getAuthor().getId().equals(user.getId()) && !isAdmin) {
            throw new RuntimeException("Unauthorized: You can only edit your own questions");
        }
        existingQuestion.setTitle(questionDetails.getTitle());
        existingQuestion.setContent(questionDetails.getContent());
        return questionRepository.save(existingQuestion);
    }

    public void deleteQuestion(Long id) {
        Question existingQuestion = questionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Question not found"));
        User user = getCurrentUser();
        boolean isAdmin = user.getRoles().stream()
            .anyMatch(r -> r.getName().name().equals("ROLE_ADMIN") || r.getName().name().equals("ROLE_MODERATOR"));
        if (!existingQuestion.getAuthor().getId().equals(user.getId()) && !isAdmin) {
            throw new RuntimeException("Unauthorized: You can only delete your own questions");
        }
        questionRepository.deleteById(id);
    }
    
    public Answer updateAnswer(Long id, Answer answerDetails) {
        Answer existingAnswer = answerRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Answer not found"));
        User user = getCurrentUser();
        boolean isAdmin = user.getRoles().stream()
            .anyMatch(r -> r.getName().name().equals("ROLE_ADMIN") || r.getName().name().equals("ROLE_MODERATOR"));
        if (!existingAnswer.getUser().getId().equals(user.getId()) && !isAdmin) {
            throw new RuntimeException("Unauthorized: You can only edit your own answers");
        }
        existingAnswer.setContent(answerDetails.getContent());
        return answerRepository.save(existingAnswer);
    }

    public void deleteAnswer(Long id) {
        Answer existingAnswer = answerRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Answer not found"));
        User user = getCurrentUser();
        boolean isAdmin = user.getRoles().stream()
            .anyMatch(r -> r.getName().name().equals("ROLE_ADMIN") || r.getName().name().equals("ROLE_MODERATOR"));
        if (!existingAnswer.getUser().getId().equals(user.getId()) && !isAdmin) {
            throw new RuntimeException("Unauthorized: You can only delete your own answers");
        }
        answerRepository.deleteById(id);
    }

    private User getCurrentUser() {
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
            throw new RuntimeException("Cannot perform action as anonymous user");
        }

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }
}
