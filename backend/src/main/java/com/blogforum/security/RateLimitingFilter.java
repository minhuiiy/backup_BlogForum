package com.blogforum.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate Limiting Filter: Giới hạn số lượng request từ mỗi IP
 * - Tối đa 100 request/phút cho API thông thường
 * - Tối đa 10 request/phút cho endpoint đăng nhập (chống brute force)
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    // Giới hạn: 100 request/phút mỗi IP (API chung)
    private static final int MAX_REQUESTS_PER_MINUTE = 100;
    // Giới hạn: 10 request/phút mỗi IP (auth endpoints)
    private static final int MAX_AUTH_REQUESTS_PER_MINUTE = 10;
    private static final long WINDOW_MS = 60_000L; // 1 phút

    private final Map<String, RequestCounter> requestCounts = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // Bỏ qua các request OPTIONS (CORS preflight)
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        String requestUri = request.getRequestURI();
        boolean isAuthEndpoint = requestUri.contains("/api/v1/auth/signin")
                || requestUri.contains("/api/v1/auth/signup");

        int limit = isAuthEndpoint ? MAX_AUTH_REQUESTS_PER_MINUTE : MAX_REQUESTS_PER_MINUTE;
        String key = clientIp + ":" + (isAuthEndpoint ? "auth" : "api");

        RequestCounter counter = requestCounts.computeIfAbsent(key, k -> new RequestCounter());

        if (counter.isRateLimited(limit)) {
            response.setStatus(429); // Too Many Requests
            response.setContentType("application/json");
            response.setHeader("Retry-After", "60");
            response.getWriter().write("{\"error\":\"Quá nhiều yêu cầu, vui lòng thử lại sau 1 phút.\",\"status\":429}");
            return;
        }

        // Thêm security headers cho mọi response API
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        response.setHeader("Pragma", "no-cache");

        filterChain.doFilter(request, response);
    }

    /**
     * Lấy IP thực của client (xử lý cả trường hợp đi qua proxy/load balancer)
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        return request.getRemoteAddr();
    }

    private static class RequestCounter {
        private final AtomicInteger count = new AtomicInteger(0);
        private volatile long windowStart = System.currentTimeMillis();

        boolean isRateLimited(int limit) {
            long now = System.currentTimeMillis();
            if (now - windowStart > WINDOW_MS) {
                // Reset cửa sổ thời gian
                windowStart = now;
                count.set(0);
            }
            return count.incrementAndGet() > limit;
        }
    }
}
