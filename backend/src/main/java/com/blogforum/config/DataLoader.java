package com.blogforum.config;

import com.blogforum.model.*;
import com.blogforum.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.util.Set;

@Component
public class DataLoader implements CommandLineRunner {

    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CategoryRepository categoryRepository;
    @Autowired
    private TagRepository tagRepository;
    @Autowired
    private PostRepository postRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        if (roleRepository.count() == 0) {
            roleRepository.save(new Role(null, ERole.ROLE_USER));
            roleRepository.save(new Role(null, ERole.ROLE_MODERATOR));
            roleRepository.save(new Role(null, ERole.ROLE_ADMIN));
            roleRepository.save(new Role(null, ERole.ROLE_EXPERT));
            System.out.println("Roles have been seeded successfully!");
        } else if (roleRepository.findByName(ERole.ROLE_EXPERT).isEmpty()) {
            roleRepository.save(new Role(null, ERole.ROLE_EXPERT));
            System.out.println("ROLE_EXPERT have been seeded successfully!");
        }

        if (userRepository.count() == 0) {
            User admin = userRepository.findByUsername("admin").orElseGet(() -> {
                User newUser = User.builder()
                        .username("admin")
                        .email("admin@blogforum.com")
                        .password(passwordEncoder.encode("123456"))
                        .build();
                newUser.setRoles(Set.of(roleRepository.findByName(ERole.ROLE_ADMIN).get()));
                return userRepository.save(newUser);
            });
        }
        
        // Cưỡng ép Migration kiểu dữ liệu cho bảng cũ
        try {
            jdbcTemplate.execute("ALTER TABLE posts MODIFY content LONGTEXT");
            System.out.println("Modified posts content column to LONGTEXT");
        } catch (Exception e) {
            System.out.println("Could not modify posts content column: " + e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE comments MODIFY content LONGTEXT");
            System.out.println("Modified comments content column to LONGTEXT");
        } catch (Exception e) {
            System.out.println("Could not modify comments content column: " + e.getMessage());
        }
    }
}
