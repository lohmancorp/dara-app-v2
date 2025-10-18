# FreshService MCP Integration Examples

## Overview

The MCP system now includes a dedicated FreshService ticket filtering function that automatically maps human-readable department names and status values to their FreshService IDs using the ticket form fields.

## Edge Function: mcp-freshservice-filter-tickets

### Features
- Automatically fetches ticket form fields for ID mapping
- Converts human-readable department names to IDs
- Converts status names to IDs
- Supports multiple status filters (OR logic)
- Supports custom query parameters
- Handles token resolution (app, team, or user tokens)

### Example Usage

#### Basic Example: Filter by Department and Open Statuses

```typescript
import { MCPClient } from '@/lib/mcpClient';

// Get the FreshService service ID first
const { data: service } = await supabase
  .from('mcp_services')
  .select('id')
  .eq('service_type', 'freshservice')
  .single();

// Filter tickets for a specific department with open statuses
const result = await MCPClient.filterFreshServiceTickets(
  service.id,
  {
    department: 'Engineering', // Can use name or ID
    status: [
      'Open',
      'Pending',
      'In Progress',
      'Waiting on Customer',
      'Waiting on Third Party'
    ]
  }
);

console.log('Tickets:', result.tickets);
console.log('Total:', result.total);
console.log('Query used:', result.query);
```

#### Example with Direct IDs

If you already have the FreshService IDs, you can use them directly:

```typescript
const result = await MCPClient.filterFreshServiceTickets(
  service.id,
  {
    department: '23000080811', // Direct department ID
    status: ['2', '3', '6', '7', '8', '9', '10', '11', '12', '16', '17'] // Direct status IDs
  }
);
```

#### Example with Custom Query

Add additional filter criteria with custom query:

```typescript
const result = await MCPClient.filterFreshServiceTickets(
  service.id,
  {
    department: 'Sales',
    status: ['Open', 'In Progress'],
    customQuery: 'priority:3' // High priority tickets
  }
);

// This generates a query like:
// department_id:12345 AND (status:2 OR status:3) AND priority:3
```

#### Example with Team Token

Use a team's FreshService token instead of personal token:

```typescript
const result = await MCPClient.filterFreshServiceTickets(
  service.id,
  {
    department: 'Engineering',
    status: ['Open']
  },
  'team', // Owner type
  'team-uuid-here' // Team ID
);
```

## FreshService Query Language

The function builds queries using FreshService's query language:

### Department Query
```
department_id:23000080811
```

### Status Query (Single)
```
status:2
```

### Status Query (Multiple - OR)
```
(status:2 OR status:3 OR status:6)
```

### Combined Query (AND)
```
department_id:23000080811 AND (status:2 OR status:3 OR status:6)
```

### Custom Filters
You can add any FreshService query language filters in the `customQuery` field:

- Priority: `priority:1` (Low), `priority:2` (Medium), `priority:3` (High), `priority:4` (Urgent)
- Created date: `created_at:>'2024-01-01'`
- Due date: `due_by:<'2024-12-31'`
- Agent: `agent_id:12345`
- Tags: `tag:'production'`

## Complete Integration Example

### 1. Configure MCP Service (App Admin)

```typescript
import { supabase } from '@/integrations/supabase/client';

// Create FreshService MCP service
const { data: service } = await supabase.functions.invoke('mcp-configure-service', {
  body: {
    action: 'create',
    serviceData: {
      service_name: 'Company FreshService',
      service_type: 'freshservice',
      description: 'Production FreshService instance',
      uses_app_token: false, // Users provide their own tokens
      endpoint_template: 'https://company.freshservice.com',
      rate_limit_per_minute: 100,
      call_delay_ms: 600,
      retry_delay_sec: 60,
      max_retries: 5
    }
  }
});
```

### 2. User Adds Their Token

```typescript
// User adds their FreshService API token
await MCPClient.setToken(
  service.id,
  'user',
  {
    encrypted_token: 'user-api-key-here',
    auth_type: 'basic' // FreshService uses basic auth
  }
);
```

### 3. Filter Tickets

```typescript
// Now user can filter tickets
const tickets = await MCPClient.filterFreshServiceTickets(
  service.id,
  {
    department: 'Engineering',
    status: ['Open', 'In Progress', 'Pending']
  }
);
```

## AI/Chat Integration

The chat/AI can use this to help users find tickets:

```typescript
// User asks: "Show me all open tickets for the Sales department"

// AI determines filters
const filters = {
  department: 'Sales',
  status: ['Open', 'Pending', 'In Progress']
};

// AI calls the function
try {
  const result = await MCPClient.filterFreshServiceTickets(serviceId, filters);
  
  // Display results to user
  console.log(`Found ${result.total} tickets:`);
  result.tickets.forEach(ticket => {
    console.log(`- #${ticket.id}: ${ticket.subject}`);
  });
  
} catch (error) {
  if (error instanceof TokenRequiredError) {
    // Prompt user to add their FreshService token
    console.log('Please add your FreshService API key in settings');
  }
}
```

## Common Status Values

Here are typical FreshService status values (may vary by instance):

- **2**: Open
- **3**: Pending
- **6**: Resolved
- **7**: Closed
- **8**: Waiting on Customer
- **9**: Waiting on Third Party
- **10**: On Hold
- **11**: In Progress
- **12**: Planning
- **16**: Reopened
- **17**: New

## Department Mapping

The function automatically finds departments by name:

```typescript
// These are equivalent if "Engineering" maps to ID 23000080811
{
  department: 'Engineering'
}

{
  department: '23000080811'
}
```

## Error Handling

```typescript
try {
  const result = await MCPClient.filterFreshServiceTickets(serviceId, filters);
} catch (error) {
  if (error instanceof TokenRequiredError) {
    // User needs to configure their token
    console.error('Token required:', error.message);
  } else {
    // Other errors (API error, network error, etc.)
    console.error('Error:', error.message);
  }
}
```

## Response Format

```typescript
{
  success: true,
  query: "department_id:23000080811 AND (status:2 OR status:3)",
  tickets: [
    {
      id: 12345,
      subject: "Ticket subject",
      description: "Ticket description",
      status: 2,
      priority: 2,
      // ... other ticket fields
    }
  ],
  total: 42
}
```
