package com.blogforum.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import java.util.Map;

/**
 * CloudinaryService: Upload ảnh lên Cloudinary CDN.
 * - Miễn phí 25GB storage + 25GB bandwidth/tháng
 * - Ảnh được tối ưu tự động, phân phối qua CDN toàn cầu
 * - Fallback về local storage nếu cloudinary.cloud-name = YOUR_CLOUD_NAME
 */
@Slf4j
@Service
public class CloudinaryService {

    @Value("${cloudinary.cloud-name:YOUR_CLOUD_NAME}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    @Value("${cloudinary.folder:blogforum}")
    private String folder;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Kiểm tra Cloudinary đã được cấu hình chưa
     */
    public boolean isConfigured() {
        return !"YOUR_CLOUD_NAME".equals(cloudName)
                && cloudName != null && !cloudName.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && apiSecret != null && !apiSecret.isBlank();
    }

    /**
     * Upload file lên Cloudinary
     * @return URL CDN của ảnh (dạng https://res.cloudinary.com/...)
     */
    @SuppressWarnings("unchecked")
    public String uploadFile(MultipartFile file) throws Exception {
        if (!isConfigured()) {
            throw new IllegalStateException("Cloudinary chưa được cấu hình. Hãy điền cloudinary.cloud-name, cloudinary.api-key, cloudinary.api-secret vào application.properties");
        }

        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);

        // Tạo chữ ký
        String toSign = "folder=" + folder + "&timestamp=" + timestamp + apiSecret;
        String signature = sha1Hex(toSign);

        // Tạo multipart body
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource(file.getBytes()) {
            @Override public String getFilename() { return file.getOriginalFilename(); }
        });
        body.add("api_key", apiKey);
        body.add("timestamp", timestamp);
        body.add("folder", folder);
        body.add("signature", signature);
        // Tự động tối ưu ảnh: giới hạn 1920px, chất lượng auto
        body.add("transformation", "q_auto,f_auto,w_1920,c_limit");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
        String uploadUrl = "https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload";

        ResponseEntity<Map> response = restTemplate.postForEntity(uploadUrl, requestEntity, Map.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            String secureUrl = (String) response.getBody().get("secure_url");
            log.info("✅ Cloudinary upload thành công: {}", secureUrl);
            return secureUrl;
        }

        throw new RuntimeException("Cloudinary upload thất bại: " + response.getStatusCode());
    }

    /**
     * Xóa ảnh khỏi Cloudinary theo public_id
     */
    @SuppressWarnings("unchecked")
    public void deleteFile(String publicId) {
        if (!isConfigured() || publicId == null) return;
        try {
            String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
            String toSign = "public_id=" + publicId + "&timestamp=" + timestamp + apiSecret;
            String signature = sha1Hex(toSign);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("public_id", publicId);
            body.add("api_key", apiKey);
            body.add("timestamp", timestamp);
            body.add("signature", signature);

            HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(body);
            String deleteUrl = "https://api.cloudinary.com/v1_1/" + cloudName + "/image/destroy";
            restTemplate.postForEntity(deleteUrl, requestEntity, Map.class);
            log.info("🗑️ Cloudinary xóa ảnh: {}", publicId);
        } catch (Exception e) {
            log.error("Lỗi xóa ảnh Cloudinary: {}", e.getMessage());
        }
    }

    private String sha1Hex(String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec(apiSecret.getBytes(), "HmacSHA1"));
        byte[] bytes = mac.doFinal(data.getBytes());
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
