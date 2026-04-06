package com.blogforum.controller;

import com.blogforum.model.ERole;
import com.blogforum.model.Role;
import com.blogforum.model.User;
import com.blogforum.payload.request.LoginRequest;
import com.blogforum.payload.request.SignupRequest;
import com.blogforum.payload.response.JwtResponse;
import com.blogforum.payload.response.MessageResponse;
import com.blogforum.repository.RoleRepository;
import com.blogforum.repository.UserRepository;
import com.blogforum.security.jwt.JwtUtils;
import com.blogforum.security.services.UserDetailsImpl;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.blogforum.payload.request.GoogleLoginRequest;
import com.blogforum.payload.request.OnboardingRequest;
import java.util.Collections;
import java.util.UUID;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  @Autowired
  AuthenticationManager authenticationManager;

  @Autowired
  UserRepository userRepository;

  @Autowired
  RoleRepository roleRepository;

  @Autowired
  PasswordEncoder encoder;

  @Autowired
  JwtUtils jwtUtils;

  @Value("${google.client.id}")
  private String googleClientId;

  @PostMapping("/signin")
  public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {

    Authentication authentication = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

    SecurityContextHolder.getContext().setAuthentication(authentication);
    String jwt = jwtUtils.generateJwtToken(authentication);

    UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
    List<String> roles = userDetails.getAuthorities().stream()
        .map(item -> item.getAuthority())
        .collect(Collectors.toList());

    return ResponseEntity.ok(new JwtResponse(jwt,
        userDetails.getId(),
        userDetails.getUsername(),
        userDetails.getEmail(),
        roles,
        userDetails.isOnboardingCompleted()));
  }

  @PostMapping("/signup")
  public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
    if (userRepository.existsByUsername(signUpRequest.getUsername())) {
      return ResponseEntity
          .badRequest()
          .body(new MessageResponse("Tên người dùng đã tồn tại!"));
    }

    if (userRepository.existsByEmail(signUpRequest.getEmail())) {
      return ResponseEntity
          .badRequest()
          .body(new MessageResponse("Email đã tồn tại!"));
    }

    // Create new user's account
    User user = User.builder()
        .username(signUpRequest.getUsername())
        .email(signUpRequest.getEmail())
        .password(encoder.encode(signUpRequest.getPassword()))
        .build();

    Set<String> strRoles = signUpRequest.getRole();
    Set<Role> roles = new HashSet<>();

    if (strRoles == null) {
      Role userRole = roleRepository.findByName(ERole.ROLE_USER)
          .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
      roles.add(userRole);
    } else {
      strRoles.forEach(role -> {
        switch (role) {
          case "admin":
            Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            roles.add(adminRole);

            break;
          case "mod":
            Role modRole = roleRepository.findByName(ERole.ROLE_MODERATOR)
                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            roles.add(modRole);

            break;
          default:
            Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            roles.add(userRole);
        }
      });
    }

    user.setRoles(roles);
    userRepository.save(user);

    return ResponseEntity.ok(new MessageResponse("Đăng ký thành công!"));
  }

  @PostMapping("/google")
  public ResponseEntity<?> authenticateGoogleUser(@Valid @RequestBody GoogleLoginRequest googleLoginRequest) {
    try {
      GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
          .setAudience(Collections.singletonList(googleClientId))
          .build();

      GoogleIdToken idToken = verifier.verify(googleLoginRequest.getIdToken());
      if (idToken != null) {
        Payload payload = idToken.getPayload();

        String email = payload.getEmail();
        String pictureUrl = (String) payload.get("picture");

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
          String baseName = email.split("@")[0];
          if (baseName.length() > 14) {
              baseName = baseName.substring(0, 14);
          }
          String usernameStr = baseName + "_" + UUID.randomUUID().toString().substring(0, 5);

          // Create new user for Google login
          user = User.builder()
              .username(usernameStr)
              .email(email)
              // Assign a random password since it's a google account and User entity has @NotBlank
              .password(encoder.encode(UUID.randomUUID().toString()))
              .avatarUrl(pictureUrl)
              .build();

          Set<Role> roles = new HashSet<>();
          Role userRole = roleRepository.findByName(ERole.ROLE_USER)
              .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
          roles.add(userRole);
          user.setRoles(roles);
          
          userRepository.save(user);
        }

        // Generate JWT based on UserDetailsImpl
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        String jwt = jwtUtils.generateJwtToken(authentication);

        List<String> roles = userDetails.getAuthorities().stream()
            .map(item -> item.getAuthority())
            .collect(Collectors.toList());

        return ResponseEntity.ok(new JwtResponse(jwt,
            userDetails.getId(),
            userDetails.getUsername(),
            userDetails.getEmail(),
            roles,
            userDetails.isOnboardingCompleted()));

      } else {
        return ResponseEntity.badRequest().body(new MessageResponse("Invalid Google ID Token"));
      }
    } catch (Exception e) {
      return ResponseEntity.internalServerError().body(new MessageResponse("Internal authentication error: " + e.getMessage()));
    }
  }

  @PostMapping("/onboarding")
  public ResponseEntity<?> completeOnboarding(@Valid @RequestBody OnboardingRequest request) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
    User user = userRepository.findById(userDetails.getId()).orElse(null);
    if (user != null) {
      user.setGender(request.getGender());
      user.setInterests(request.getInterests());
      user.setTags(request.getTags());
      user.setOnboardingCompleted(true);
      userRepository.save(user);
      return ResponseEntity.ok(new MessageResponse("Onboarding completed successfully!"));
    }
    return ResponseEntity.badRequest().body(new MessageResponse("User not found!"));
  }
}