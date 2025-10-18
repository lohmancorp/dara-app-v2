# MCP Architecture Implementation

## Overview

This implementation integrates the Model Context Protocol (MCP) into Supabase edge functions, providing a standardized way to connect to multiple external services with intelligent token management and role-based access control.

## Multi-Tenant Structure

### Hierarchy
```
App Admin (platform level)
  └─ Account (Organization)
      ├─ Account Admin
      └─ Teams
          ├─ Team Manager
          └─ Users
```

### Roles
- **App Admin**: Platform administrator who configures MCP services, sets rate limits, manages app-provided tokens
- **Account Admin**: Organization administrator who manages account-level settings and members
- **Team Manager**: Team leader who can manage team tokens and members
- **User**: Individual user with their own token settings

## Database Schema

### Core Tables

#### `mcp_services`
Defines available services that can be connected via MCP. Configured by app admins.
- `service_type`: 'freshservice', 'jira', 'confluence', 'gemini', 'openai', etc.
- `uses_app_token`: Whether the app provides a token (users don't need to configure)
- `tools_config`: JSON array of MCP tools available for this service
- `resources_config`: JSON array of MCP resources available for this service
- Rate limiting settings: `rate_limit_per_minute`, `call_delay_ms`, `retry_delay_sec`, `max_retries`

#### `mcp_service_tokens`
App-provided tokens for services (only app admins can manage)
- `service_id`: Reference to `mcp_services`
- `encrypted_token`: The API token/key (encrypted)
- `auth_type`: 'api_key', 'oauth', 'basic'
- `auth_config`: Additional auth configuration (headers, etc.)

#### `connection_tokens`
User/team/account provided tokens for services that don't have app tokens
- `service_id`: Reference to `mcp_services`
- `owner_type`: 'user', 'team', or 'account'
- `owner_id`: UUID of the owner
- `encrypted_token`: The API token/key
- `endpoint`: Optional custom endpoint override

#### `connections`
Updated to support MCP while maintaining backward compatibility for custom connections
- `is_mcp_managed`: Boolean flag indicating if this connection uses MCP
- `mcp_service_id`: Reference to `mcp_services` if MCP managed
- `account_id`, `team_id`: Optional references for shared connections

## Edge Functions

### `mcp-server`
Main MCP server that handles protocol methods and routes requests to appropriate services.

**Supported MCP Methods:**
- `tools/list`: Get available tools for a service
- `tools/call`: Execute a tool
- `resources/list`: Get available resources
- `resources/read`: Read a resource

**Token Resolution Order:**
1. App-provided token (if `uses_app_token = true`)
2. Owner-specific token (team/account if provided)
3. User token (fallback)
4. Return error if no token found (402 TOKEN_REQUIRED)

**Example Request:**
```typescript
const response = await supabase.functions.invoke('mcp-server', {
  body: {
    method: 'tools/call',
    serviceType: 'freshservice',
    params: {
      toolName: 'get_ticket',
      arguments: { ticketId: '12345' }
    },
    ownerType: 'team',
    ownerId: 'team-uuid-here'
  }
});
```

### `mcp-configure-service`
App admin only. Configure MCP services and app-provided tokens.

**Actions:**
- `create`: Create a new MCP service
- `update`: Update service configuration
- `delete`: Remove a service
- `set_token`: Add/update app-provided token for a service
- `remove_token`: Remove app-provided token

**Example: Add FreshService with app token:**
```typescript
await supabase.functions.invoke('mcp-configure-service', {
  body: {
    action: 'create',
    serviceData: {
      service_name: 'FreshService Production',
      service_type: 'freshservice',
      description: 'Company FreshService instance',
      uses_app_token: true,
      endpoint_template: 'https://company.freshservice.com',
      rate_limit_per_minute: 100,
      tools_config: [
        {
          name: 'get_ticket',
          description: 'Retrieve a ticket by ID',
          endpoint: '/api/v2/tickets/{ticketId}',
          method: 'GET',
          inputSchema: {
            type: 'object',
            properties: {
              ticketId: { type: 'string', description: 'Ticket ID' }
            },
            required: ['ticketId']
          }
        }
      ]
    }
  }
});

// Then set the app token
await supabase.functions.invoke('mcp-configure-service', {
  body: {
    action: 'set_token',
    serviceId: 'service-uuid',
    tokenData: {
      encrypted_token: 'your-api-key',
      auth_type: 'api_key',
      auth_config: {
        headerName: 'X-API-Key'
      }
    }
  }
});
```

### `mcp-manage-token`
User/team/account token management. Allows users to add their own tokens for services that don't have app tokens.

**Actions:**
- `set`: Add/update a token
- `remove`: Delete a token
- `get`: Check if token exists (doesn't return actual token)

**Example: User adds their own token:**
```typescript
await supabase.functions.invoke('mcp-manage-token', {
  body: {
    action: 'set',
    serviceId: 'service-uuid',
    ownerType: 'user',
    tokenData: {
      encrypted_token: 'user-api-key',
      auth_type: 'api_key',
      endpoint: 'https://custom.endpoint.com' // optional
    }
  }
});
```

**Example: Team manager adds team token:**
```typescript
await supabase.functions.invoke('mcp-manage-token', {
  body: {
    action: 'set',
    serviceId: 'service-uuid',
    ownerType: 'team',
    ownerId: 'team-uuid',
    tokenData: {
      encrypted_token: 'team-api-key',
      auth_type: 'api_key'
    }
  }
});
```

## Integration with Job Templates

Job templates can reference connections, which can now be MCP-managed or custom connections:

1. **MCP-Managed Connection**: Set `is_mcp_managed = true` and reference `mcp_service_id`
2. **Custom Connection**: Traditional connection with direct configuration (for services not in MCP)

When executing a job, the system:
1. Reads the job template
2. Gets the connection
3. If MCP-managed, uses `mcp-server` to handle the request with automatic token resolution
4. If custom, uses traditional connection logic

## AI Integration with MCP

The chat/AI can now:
1. Query available tools via `tools/list`
2. Check if user needs to provide a token (if service doesn't have app token)
3. Prompt user to add token if needed
4. Execute tools once authenticated

**Example Flow:**
```typescript
// 1. List available tools for a service
const { data: tools } = await supabase.functions.invoke('mcp-server', {
  body: {
    method: 'tools/list',
    serviceType: 'freshservice'
  }
});

// 2. Try to execute a tool
const { data, error } = await supabase.functions.invoke('mcp-server', {
  body: {
    method: 'tools/call',
    serviceType: 'freshservice',
    params: {
      toolName: 'get_ticket',
      arguments: { ticketId: '12345' }
    }
  }
});

// 3. If error is TOKEN_REQUIRED, prompt user
if (error && error.error === 'TOKEN_REQUIRED') {
  // Show dialog: "Please add your FreshService API key"
  // User adds token via mcp-manage-token
  // Retry the tool call
}
```

## Security

### Row Level Security (RLS)
All tables have RLS policies ensuring:
- Users can only access accounts/teams they belong to
- Only app admins can configure MCP services
- Only appropriate roles can manage tokens at each level
- Token data is encrypted

### Token Resolution
The `mcp-server` edge function uses server-side token resolution with the service role key, ensuring tokens are never exposed to the client.

## Migration Path

### For Existing Connections
1. Connections table updated with `is_mcp_managed`, `mcp_service_id`, `account_id`, `team_id`
2. Existing connections remain as custom connections (`is_mcp_managed = false`)
3. Gradually migrate to MCP-managed as services are configured

### For New Services
1. App admin creates MCP service configuration
2. App admin optionally provides token (users don't need to configure)
3. If no app token, users/teams add their own tokens
4. Connections reference the MCP service

## Future Enhancements

- **Prompt Templates**: MCP supports prompt templates for common workflows
- **Sampling**: MCP supports AI model integration for complex queries
- **Caching**: Add caching layer for frequently accessed resources
- **Monitoring**: Track token usage, rate limits, and errors per service
- **Token Rotation**: Automatic token refresh for OAuth services
