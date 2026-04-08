package com.blogforum.payload.request;

import lombok.Data;

@Data
public class UserProfileRequest {
    private String bio;
    private String displayName;
    private String avatarUrl;
    private String gender;
}
