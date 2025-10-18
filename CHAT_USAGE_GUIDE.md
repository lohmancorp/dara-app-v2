# Chat Interface Usage Guide

## Overview

The chat interface uses Lovable AI to help you search FreshService tickets with natural language. The AI automatically handles:
- Finding your FreshService connections
- Looking up department/company IDs by name
- Searching tickets with filters
- Formatting results as readable tables

## Prerequisites

1. **FreshService Connection**: You must have an active FreshService connection configured
   - Go to Connections page
   - Add a FreshService connection with your API key

2. **Active Connection**: The connection must be marked as active

## Example Conversations

### Basic Ticket Search

**User:** "Show me all open tickets for Engineering"

**AI will:**
1. Get your FreshService connections
2. Look up "Engineering" department ID
3. Search for tickets with Open, Pending, In Progress, etc. statuses
4. Display results in a table:

| Ticket ID | Subject | Description | Status |
|-----------|---------|-------------|--------|
| 12345 | Server outage | Database connection issue... | Open |
| 12346 | Deploy issue | Production deployment failed... | Pending |

### Specific Status Search

**User:** "List all pending tickets for the Sales department"

**AI will:**
1. Find FreshService connection
2. Look up "Sales" department ID
3. Search specifically for "Pending" status tickets
4. Show formatted table

### Multiple Department Search

**User:** "What tickets are in progress for Marketing?"

**AI will:**
1. Get connection
2. Look up "Marketing" department
3. Search for "In Progress" status
4. Display results

## Natural Language Examples

You can ask in natural language:
- "Show me tickets for [department name]"
- "What open tickets does [company] have?"
- "List pending tickets"
- "Get all in-progress items for [department]"
- "What's waiting on customers in [department]?"

## Status Keywords

The AI understands these status keywords:
- **Open** - New or unassigned tickets
- **Pending** - Waiting for action
- **In Progress** - Currently being worked on
- **Waiting on Customer** - Need customer response
- **Waiting on Third Party** - Need external response
- **On Hold** - Temporarily paused
- **Resolved** - Fixed but not closed
- **Closed** - Completed tickets

If you don't specify a status, the AI searches for all open statuses by default.

## Table Format

Results are always shown in a table with these columns:

1. **Ticket ID** - The FreshService ticket number
2. **Subject** - Ticket title
3. **Description** - Brief excerpt (first 100 characters)
4. **Status** - Current ticket status (human-readable)

## Features

### Streaming Responses
The AI streams responses in real-time, so you see results as they're generated.

### Tool Calling
The AI automatically uses the right tools:
- `get_freshservice_connections` - Finds your connections
- `get_department_id` - Maps department names to IDs
- `search_freshservice_tickets` - Searches with filters

### Error Handling
If something goes wrong, the AI will tell you:
- "Connection not found" - No FreshService connection configured
- "Department not found" - Department name doesn't exist
- List of available departments if the name doesn't match

## Tips

1. **Be specific**: Mention the department/company name clearly
2. **Use status names**: Say "open" or "pending" instead of status codes
3. **Multiple requests**: You can ask follow-up questions in the same conversation
4. **Natural language**: Don't worry about exact phrasing, the AI understands context

## Example Workflow

### Initial Setup
1. Configure FreshService connection with API key
2. Go to Chat page
3. Ask "Show me open tickets for Engineering"

### Follow-up Questions
After getting results, you can ask:
- "What about Sales tickets?"
- "Show me just the pending ones"
- "Which tickets are waiting on customers?"

The AI maintains conversation context and uses your existing connection.

## Technical Details

### Backend
- Uses `google/gemini-2.5-flash` model via Lovable AI Gateway
- Authenticates with your FreshService connection
- Fetches ticket_form_fields to map names to IDs
- Uses FreshService filter API for queries

### Frontend
- Real-time streaming for instant feedback
- Markdown rendering for formatted tables
- Conversation history maintained in UI
- Keyboard shortcuts (Enter to send)

## Troubleshooting

**No results shown:**
- Check that your FreshService connection is active
- Verify the department name exists
- Try using a different status filter

**"Connection not found" error:**
- Go to Connections page
- Add a FreshService connection
- Make sure it's marked as active

**"Department not found" error:**
- The AI will show available departments
- Use the exact name from the list
- Or use the department ID directly

**API errors:**
- Check your FreshService API key is valid
- Verify your FreshService instance is accessible
- Check rate limits haven't been exceeded

## Privacy & Security

- Your API keys are stored securely
- Queries use your authenticated connection
- No ticket data is stored by the chat
- All communication is over HTTPS
