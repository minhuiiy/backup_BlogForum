package com.blogforum.service;

import com.blogforum.repository.PostRepository;
import com.blogforum.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class TelegramSchedulerService {

    @Autowired
    private TelegramService telegramService;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Gửi báo cáo thống kê hàng ngày lúc 8:00 giờ Việt Nam (1:00 UTC)
     */
    @Scheduled(cron = "0 0 1 * * *") // 8:00 AM UTC+7
    public void sendDailyReport() {
        try {
            long totalPosts = postRepository.count();
            long totalUsers = userRepository.count();
            // Bài viết trong 24h qua
            java.time.LocalDateTime yesterday = java.time.LocalDateTime.now().minusHours(24);
            long todayPosts = postRepository.countByCreatedAtAfter(yesterday);

            telegramService.sendDailyStats(totalPosts, totalUsers, todayPosts);
            log.info("Daily Telegram report sent");
        } catch (Exception e) {
            log.error("Failed to send daily Telegram report: {}", e.getMessage());
        }
    }
}
