package com.blogforum.payload.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatRequest {
    @NotBlank
    private String content;

    @NotBlank
    private String receiverUsername;
}
