package com.blogforum.payload.request;

import java.util.List;
import lombok.Data;

@Data
public class OnboardingRequest {
    private String gender;
    private List<String> interests;
    private List<String> tags;
}
