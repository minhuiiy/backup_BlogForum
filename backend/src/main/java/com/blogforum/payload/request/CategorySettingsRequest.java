package com.blogforum.payload.request;

import lombok.Data;

@Data
public class CategorySettingsRequest {
    private String displayName;
    private String description;
    private String imageUrl;
}
