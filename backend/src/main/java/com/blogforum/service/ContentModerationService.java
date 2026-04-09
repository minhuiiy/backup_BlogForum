package com.blogforum.service;

import org.springframework.stereotype.Service;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.blogforum.exception.ContentModerationException;

@Service
public class ContentModerationService {

    // Danh sách từ khóa tục tĩu/vi phạm. Chỉ dùng những từ RÕ RÀNG là tục tĩu.
    // Không dùng từ chung chung (vd: "chó" vì có thể là tên con vật, tư thế yoga...)
    private static final List<String> SENSITIVE_WORDS = Arrays.asList(
            "cặc", "lồn", "mẹ mày", "đụ má", "đụ mẹ", "khốn nạn", "đồ tồi", "fuck you", "motherfucker");

    // Một số dấu hiệu giả lập cho ảnh vi phạm
    private static final List<String> BANNED_IMAGE_KEYWORDS = Arrays.asList(
            "banned-image", "nsfw-content", "sensitive.jpg");

    /**
     * Kiểm tra nội dung chuỗi có chứa từ ngữ vi phạm không
     * 
     * @param text Nội dung hoặc tiêu đề
     */
    public void validateText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return;
        }

        String lowerCaseText = text.toLowerCase();
        for (String word : SENSITIVE_WORDS) {
            if (lowerCaseText.contains(word)) {
                throw new ContentModerationException(
                        "Bài viết chứa từ ngữ nhạy cảm vi phạm tiêu chuẩn cộng đồng: " + word);
            }
        }
    }

    /**
     * Parse nội dung HTML, trích xuất tất cả thẻ <img> để kiểm duyệt
     * 
     * @param htmlContent chuỗi HTML chứa ảnh
     */
    public void validateImagesInHtml(String htmlContent) {
        if (htmlContent == null || htmlContent.trim().isEmpty()) {
            return;
        }

        // Tìm tất cả các thẻ img src="..."
        String imgRegex = "<img[^>]+src\\s*=\\s*['\"]([^'\"]+)['\"][^>]*>";
        Pattern pattern = Pattern.compile(imgRegex, Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(htmlContent);

        while (matcher.find()) {
            String imgSrc = matcher.group(1);
            // Mock logic: kiểm tra thử nếu URL chứa từ khóa cấm
            for (String bannedKeyword : BANNED_IMAGE_KEYWORDS) {
                if (imgSrc.toLowerCase().contains(bannedKeyword)) {
                    throw new ContentModerationException(
                            "Bài viết chứa phương tiện nhạy cảm hoặc không hợp lệ: " + bannedKeyword);
                }
            }
            // Mở rộng sau này: nếu src là Base64 hoặc URL, gọi API tới AWS Rekognition hoặc
            // Google Cloud Vision.
        }
    }
}
