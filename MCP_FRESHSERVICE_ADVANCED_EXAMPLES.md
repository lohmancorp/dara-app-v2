# Advanced FreshService Filtering Examples

This guide shows how to use the enhanced MCP FreshService filtering capabilities to search tickets with complex criteria.

## Quick Reference: Filter Options

```typescript
{
  department?: string;              // Department name or ID
  status?: string[];                // Include these statuses (OR logic)
  excludeStatus?: string[];         // Exclude these statuses (AND logic)
  priority?: string[];              // Filter by priority (OR logic)
  assignee?: string;                // Filter by assignee ID
  requester?: string;               // Filter by requester ID
  createdAfter?: string;            // ISO date string
  createdBefore?: string;           // ISO date string
  updatedAfter?: string;            // ISO date string
  updatedBefore?: string;           // ISO date string
  customFields?: Record<string, string>;  // Custom field filters
  customQuery?: string;             // Raw FreshService query syntax
}
```

## Scenario 1: All Unresolved Tickets

Show all tickets with statuses: 6, 2, 3, 7, 8, 9, 10, 11, 17, 12, or 16

```typescript
import { MCPClient } from "@/lib/mcpClient";

const unresolvedTickets = await MCPClient.filterFreshServiceTickets(
  'your-service-id',
  {
    status: ['6', '2', '3', '7', '8', '9', '10', '11', '17', '12', '16']
  }
);

console.log(`Found ${unresolvedTickets.total} unresolved tickets`);
console.log(unresolvedTickets.tickets);
```

### Alternative: Exclude Closed/Resolved Statuses

```typescript
// If you know the closed/resolved status IDs (e.g., 4, 5)
const unresolvedTickets = await MCPClient.filterFreshServiceTickets(
  'your-service-id',
  {
    excludeStatus: ['4', '5']  // Exclude Resolved and Closed
  }
);
```

## Scenario 2: Tickets Waiting on Customer

Show tickets with statuses: 15, 3, 7, or 16

```typescript
const waitingOnCustomer = await MCPClient.filterFreshServiceTickets(
  'your-service-id',
  {
    status: ['15', '3', '7', '16']
  }
);

console.log(`${waitingOnCustomer.total} tickets waiting on customer`);
```

## Scenario 3: Tickets Created in Last Month

```typescript
// Calculate date 1 month ago
const oneMonthAgo = new Date();
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
const dateFilter = oneMonthAgo.toISOString();

const recentTickets = await MCPClient.filterFreshServiceTickets(
  'your-service-id',
  {
    createdAfter: dateFilter
  }
);

console.log(`${recentTickets.total} tickets created in the last month`);
```

## Advanced Filtering Examples

### By Assignee (Agent)

```typescript
const myTickets = await MCPClient.filterFreshServiceTickets(
  'your-service-id',
  {
    assignee: '12345',  // Agent ID
    status: ['2', '3']  // Open and Pending
  }
);
```

### By Priority

```typescript
const urgentTickets = await MCPClient.filterFreshServiceTickets(
  'your-service-id',
  {
    priority: ['4', '3'],  // Urgent and High priority
    excludeStatus: ['4', '5']  // Not closed
  }
);
```

### By Department and Date Range

```typescript
const departmentTickets = await MCPClient.filterFreshServiceTickets(
  'your-service-id',
  {
    department: 'IT Support',
    createdAfter: '2024-01-01T00:00:00Z',
    createdBefore: '2024-12-31T23:59:59Z'
  }
);
```

### Using Custom Fields

FreshService allows custom fields. You can filter by them:

```typescript
const ticketsByModule = await MCPClient.filterFreshServiceTickets(
  'your-service-id',
  {
    customFields: {
      'module': 'Billing',           // Custom field: module
      'customer_intent': 'Refund'    // Custom field: what customer wanted
    },
    status: ['2', '3']
  }
);
```

### Complex Combined Filters

```typescript
// Unresolved tickets for specific department, created in last 2 weeks
const twoWeeksAgo = new Date();
twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

const complexFilter = await MCPClient.filterFreshServiceTickets(
  'your-service-id',
  {
    department: 'Customer Support',
    status: ['6', '2', '3', '7', '8', '9', '10', '11', '17', '12', '16'],
    createdAfter: twoWeeksAgo.toISOString(),
    priority: ['3', '4'],  // High and Urgent only
    assignee: 'agent-id-here'
  }
);
```

### Using Raw FreshService Query Syntax

For advanced queries not covered by the structured filters:

```typescript
const advancedQuery = await MCPClient.filterFreshServiceTickets(
  'your-service-id',
  {
    customQuery: "(status:2 OR status:3) AND priority:>2 AND tag:'important'"
  }
);
```

## Common FreshService Status IDs

| Status ID | Status Name |
|-----------|-------------|
| 2 | Open |
| 3 | Pending |
| 4 | Resolved |
| 5 | Closed |
| 6 | Waiting on Customer |
| 7 | Waiting on Third Party |
| 8 | In Progress |
| 9 | On Hold |
| 10 | Scheduled |
| 11 | Awaiting Approval |
| 12 | Reopened |
| 15 | Waiting for Customer Response |
| 16 | Customer Response Received |
| 17 | Escalated |

## Common Priority IDs

| Priority ID | Priority Name |
|-------------|---------------|
| 1 | Low |
| 2 | Medium |
| 3 | High |
| 4 | Urgent |

## Date Formatting Tips

```typescript
// Last 7 days
const last7Days = new Date();
last7Days.setDate(last7Days.getDate() - 7);

// Last 30 days
const last30Days = new Date();
last30Days.setDate(last30Days.getDate() - 30);

// Last 3 months
const last3Months = new Date();
last3Months.setMonth(last3Months.getMonth() - 3);

// Use ISO format for filters
const filter = {
  createdAfter: last30Days.toISOString()
};
```

## Error Handling

```typescript
try {
  const tickets = await MCPClient.filterFreshServiceTickets(
    serviceId,
    filters
  );
  
  console.log(`Found ${tickets.total} tickets`);
  
} catch (error) {
  if (error instanceof TokenRequiredError) {
    console.error('Please configure your FreshService API token');
  } else {
    console.error('Error filtering tickets:', error);
  }
}
```

## Performance Tips

1. **Use specific filters**: The more specific your filters, the faster the query
2. **Date ranges**: Always use date ranges when possible to limit results
3. **Pagination**: The function automatically handles pagination (100 tickets per page)
4. **Rate limits**: The function respects FreshService rate limits with automatic delays

## Getting Field IDs

To find custom field names or status IDs in your FreshService instance:

```typescript
// The edge function automatically fetches ticket_form_fields
// and maps human-readable names to IDs

// You can use either:
status: ['Open', 'Pending']  // Human-readable names
// OR
status: ['2', '3']  // Direct status IDs
```
