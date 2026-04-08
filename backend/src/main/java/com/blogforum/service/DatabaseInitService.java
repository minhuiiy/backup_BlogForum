package com.blogforum.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

@Service
public class DatabaseInitService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void init() {
        System.out.println("===> RUNNING AUTOMATIC DATABASE FIX...");
        
        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS user_interests (" +
                    "user_id BIGINT NOT NULL," +
                    "interest VARCHAR(255)" +
                    ")");
            System.out.println("===> Created user_interests table (if not existed).");
        } catch (Exception e) {
            System.err.println("Error creating user_interests: " + e.getMessage());
        }

        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS user_tags (" +
                    "user_id BIGINT NOT NULL," +
                    "tag VARCHAR(255)" +
                    ")");
            System.out.println("===> Created user_tags table (if not existed).");
        } catch (Exception e) {
            System.err.println("Error creating user_tags: " + e.getMessage());
        }

        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS user_saved_posts (" +
                    "user_id BIGINT NOT NULL," +
                    "post_id BIGINT NOT NULL," +
                    "PRIMARY KEY (user_id, post_id)" +
                    ")");
            System.out.println("===> Created user_saved_posts table (if not existed).");
        } catch (Exception e) {
            System.err.println("Error creating user_saved_posts: " + e.getMessage());
        }
    }
}
