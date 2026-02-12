package api

import (
	"encoding/json"
	"fmt"
	"time"
)

// Anthropic Request Structure
type AnthropicRequest struct {
	Model     string             `json:"model"`
	Messages  []AnthropicMessage `json:"messages"`
	System    string             `json:"system,omitempty"`
	MaxTokens int                `json:"max_tokens"`
	Stream    bool               `json:"stream,omitempty"`
}

type AnthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Anthropic Response Structure
type AnthropicResponse struct {
	ID           string    `json:"id"`
	Type         string    `json:"type"`
	Role         string    `json:"role"`
	Content      []Content `json:"content"`
	Model        string    `json:"model"`
	StopReason   string    `json:"stop_reason"`
	StopSequence string    `json:"stop_sequence"`
	Usage        Usage     `json:"usage"`
}

type Content struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

// OpenAI Response Structure (Partial, for mapping)
type OpenAIResponse struct {
	ID      string         `json:"id"`
	Object  string         `json:"object"`
	Created int64          `json:"created"`
	Model   string         `json:"model"`
	Choices []OpenAIChoice `json:"choices"`
	Usage   OpenAIUsage    `json:"usage"`
}

type OpenAIChoice struct {
	Index        int           `json:"index"`
	Message      OpenAIMessage `json:"message"`
	FinishReason string        `json:"finish_reason"`
}

type OpenAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenAIUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// ConvertOpenAIToAnthropic converts an OpenAI-style request body to Anthropic format
func ConvertOpenAIToAnthropic(body map[string]interface{}) (map[string]interface{}, error) {
	// 1. Extract System Prompt
	var systemPrompt string
	var messages []AnthropicMessage

	if rawMsgs, ok := body["messages"].([]interface{}); ok {
		for _, m := range rawMsgs {
			if msgMap, ok := m.(map[string]interface{}); ok {
				role, _ := msgMap["role"].(string)
				content, _ := msgMap["content"].(string)

				if role == "system" {
					if systemPrompt != "" {
						systemPrompt += "\n"
					}
					systemPrompt += content
				} else {
					messages = append(messages, AnthropicMessage{
						Role:    role,
						Content: content,
					})
				}
			}
		}
	}

	// 2. Max Tokens (Required by Anthropic)
	maxTokens := 4096 // Default high limit
	if mt, ok := body["max_tokens"].(float64); ok {
		maxTokens = int(mt)
	}

	// 3. Resolve Model ID (Map aliases to specific versions)
	model := body["model"].(string)
	switch model {
	case "claude-3-5-sonnet":
		model = "claude-3-5-sonnet-latest"
	case "claude-3-opus":
		model = "claude-3-opus-latest"
	case "claude-3-sonnet":
		model = "claude-3-sonnet-20240229"
	case "claude-3-haiku":
		model = "claude-3-haiku-20240307"
	}

	// 4. Construct Anthropic Request
	anthropicReq := AnthropicRequest{
		Model:     model,
		Messages:  messages,
		System:    systemPrompt,
		MaxTokens: maxTokens,
	}

	// Convert back to map for generic handling
	reqBytes, err := json.Marshal(anthropicReq)
	if err != nil {
		return nil, err
	}

	var reqMap map[string]interface{}
	err = json.Unmarshal(reqBytes, &reqMap)
	return reqMap, err
}

// ConvertAnthropicToOpenAI converts an Anthropic response to OpenAI format
func ConvertAnthropicToOpenAI(anthropicBody []byte) ([]byte, error) {
	var antResp AnthropicResponse
	if err := json.Unmarshal(anthropicBody, &antResp); err != nil {
		return nil, fmt.Errorf("failed to parse anthropic response: %v", err)
	}

	// Extract content
	content := ""
	if len(antResp.Content) > 0 {
		content = antResp.Content[0].Text
	}

	// Map Finish Reason
	finishReason := "stop"
	if antResp.StopReason == "max_tokens" {
		finishReason = "length"
	}

	// Construct OpenAI Response
	oaiResp := OpenAIResponse{
		ID:      antResp.ID,
		Object:  "chat.completion",
		Created: time.Now().Unix(),
		Model:   antResp.Model,
		Choices: []OpenAIChoice{
			{
				Index: 0,
				Message: OpenAIMessage{
					Role:    "assistant",
					Content: content,
				},
				FinishReason: finishReason,
			},
		},
		Usage: OpenAIUsage{
			PromptTokens:     antResp.Usage.InputTokens,
			CompletionTokens: antResp.Usage.OutputTokens,
			TotalTokens:      antResp.Usage.InputTokens + antResp.Usage.OutputTokens,
		},
	}

	return json.Marshal(oaiResp)
}
