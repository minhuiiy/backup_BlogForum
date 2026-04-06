package com.blogforum.payload.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CommentRequest {
    @NotBlank(message = "Comment content cannot be empty")
    private String content;

    private Long parentId;
}
