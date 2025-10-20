-- Insert missing MCP service configurations for all connection types
-- Only insert if the service_type doesn't already exist
INSERT INTO public.mcp_services (
  service_name,
  service_type,
  description,
  uses_app_token,
  call_delay_ms,
  max_retries,
  retry_delay_sec,
  rate_limit_per_minute,
  rate_limit_per_hour
)
SELECT 'Jira', 'jira', 'Project tracking and agile development platform', false, 600, 5, 60, 60, 3600
WHERE NOT EXISTS (SELECT 1 FROM public.mcp_services WHERE service_type = 'jira')

UNION ALL

SELECT 'Confluence', 'confluence', 'Team collaboration and documentation workspace', false, 600, 5, 60, 60, 3600
WHERE NOT EXISTS (SELECT 1 FROM public.mcp_services WHERE service_type = 'confluence')

UNION ALL

SELECT 'OpenAI', 'openai', 'ChatGPT and advanced language models', false, 600, 5, 60, 60, 3600
WHERE NOT EXISTS (SELECT 1 FROM public.mcp_services WHERE service_type = 'openai')

UNION ALL

SELECT 'Google Alerts', 'google_alerts', 'Automated monitoring and notifications for web content', false, 600, 5, 60, 60, 3600
WHERE NOT EXISTS (SELECT 1 FROM public.mcp_services WHERE service_type = 'google_alerts');