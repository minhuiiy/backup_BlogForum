package com.blogforum.repository;

import com.blogforum.model.Notification;
import com.blogforum.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientOrderByCreatedAtDesc(User recipient);
    
    long countByRecipientAndReadFalse(User recipient);
}
