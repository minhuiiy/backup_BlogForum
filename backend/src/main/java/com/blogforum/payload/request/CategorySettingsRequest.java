package com.blogforum.payload.request;

import lombok.Data;

@Data
public class CategorySettingsRequest {
    private String displayName;
    private String description;
    private String imageUrl;
    // Channel Telegram ID để cross-post bài mới lên channel
    private String telegramChannelId;
}
