-- Populate Gemini MCP service tools and resources configuration
UPDATE public.mcp_services
SET 
  tools_config = '[
    {
      "name": "generate_content",
      "description": "Generate text content using Gemini models",
      "endpoint": "/v1beta/models/{model}:generateContent",
      "method": "POST",
      "inputSchema": {
        "type": "object",
        "properties": {
          "model": {
            "type": "string",
            "description": "Model to use (e.g., gemini-2.0-flash-exp, gemini-1.5-pro)",
            "default": "gemini-2.0-flash-exp"
          },
          "contents": {
            "type": "array",
            "description": "Array of content parts to generate from",
            "items": {
              "type": "object",
              "properties": {
                "role": {
                  "type": "string",
                  "enum": ["user", "model"]
                },
                "parts": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "text": {
                        "type": "string"
                      }
                    }
                  }
                }
              }
            }
          },
          "generationConfig": {
            "type": "object",
            "description": "Configuration for generation",
            "properties": {
              "temperature": {
                "type": "number",
                "minimum": 0,
                "maximum": 2
              },
              "maxOutputTokens": {
                "type": "integer"
              },
              "topP": {
                "type": "number"
              },
              "topK": {
                "type": "integer"
              }
            }
          }
        },
        "required": ["contents"]
      }
    },
    {
      "name": "stream_generate_content",
      "description": "Stream text content generation using Gemini models",
      "endpoint": "/v1beta/models/{model}:streamGenerateContent?alt=sse",
      "method": "POST",
      "inputSchema": {
        "type": "object",
        "properties": {
          "model": {
            "type": "string",
            "description": "Model to use (e.g., gemini-2.0-flash-exp, gemini-1.5-pro)",
            "default": "gemini-2.0-flash-exp"
          },
          "contents": {
            "type": "array",
            "description": "Array of content parts to generate from"
          },
          "generationConfig": {
            "type": "object",
            "description": "Configuration for generation"
          }
        },
        "required": ["contents"]
      }
    },
    {
      "name": "count_tokens",
      "description": "Count tokens in the provided content",
      "endpoint": "/v1beta/models/{model}:countTokens",
      "method": "POST",
      "inputSchema": {
        "type": "object",
        "properties": {
          "model": {
            "type": "string",
            "description": "Model to use for token counting",
            "default": "gemini-2.0-flash-exp"
          },
          "contents": {
            "type": "array",
            "description": "Content to count tokens for"
          }
        },
        "required": ["contents"]
      }
    },
    {
      "name": "embed_content",
      "description": "Generate embeddings for the provided content",
      "endpoint": "/v1beta/models/{model}:embedContent",
      "method": "POST",
      "inputSchema": {
        "type": "object",
        "properties": {
          "model": {
            "type": "string",
            "description": "Embedding model to use (e.g., text-embedding-004)",
            "default": "text-embedding-004"
          },
          "content": {
            "type": "object",
            "description": "Content to generate embeddings for"
          }
        },
        "required": ["content"]
      }
    }
  ]'::jsonb,
  resources_config = '[
    {
      "name": "Gemini 2.0 Flash Experimental",
      "description": "Latest experimental Gemini model with fast responses",
      "uriTemplate": "model://gemini-2.0-flash-exp",
      "endpoint": "/v1beta/models/gemini-2.0-flash-exp",
      "mimeType": "application/json"
    },
    {
      "name": "Gemini 1.5 Pro",
      "description": "Most capable Gemini model for complex tasks",
      "uriTemplate": "model://gemini-1.5-pro",
      "endpoint": "/v1beta/models/gemini-1.5-pro",
      "mimeType": "application/json"
    },
    {
      "name": "Gemini 1.5 Flash",
      "description": "Fast and efficient Gemini model",
      "uriTemplate": "model://gemini-1.5-flash",
      "endpoint": "/v1beta/models/gemini-1.5-flash",
      "mimeType": "application/json"
    },
    {
      "name": "Text Embedding Model",
      "description": "Text embedding model for semantic search",
      "uriTemplate": "model://text-embedding-004",
      "endpoint": "/v1beta/models/text-embedding-004",
      "mimeType": "application/json"
    }
  ]'::jsonb,
  updated_at = now()
WHERE service_type = 'gemini';