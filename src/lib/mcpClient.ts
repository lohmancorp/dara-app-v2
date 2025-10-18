import { supabase } from "@/integrations/supabase/client";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export class MCPClient {
  /**
   * List available tools for a service
   */
  static async listTools(serviceType: string): Promise<MCPTool[]> {
    const { data, error } = await supabase.functions.invoke('mcp-server', {
      body: {
        method: 'tools/list',
        serviceType
      }
    });

    if (error) throw error;
    return data.tools || [];
  }

  /**
   * Call a tool
   */
  static async callTool(
    serviceType: string,
    toolName: string,
    args: any,
    ownerType?: 'user' | 'team' | 'account',
    ownerId?: string
  ) {
    const { data, error } = await supabase.functions.invoke('mcp-server', {
      body: {
        method: 'tools/call',
        serviceType,
        params: {
          toolName,
          arguments: args
        },
        ownerType,
        ownerId
      }
    });

    if (error) {
      if (error.error === 'TOKEN_REQUIRED') {
        throw new TokenRequiredError(error.message, error.serviceType, error.usesAppToken);
      }
      throw error;
    }

    return data;
  }

  /**
   * Filter FreshService tickets by department and status
   */
  static async filterFreshServiceTickets(
    serviceId: string,
    filters: {
      department?: string;
      status?: string[];
      customQuery?: string;
    },
    ownerType?: 'user' | 'team' | 'account',
    ownerId?: string
  ) {
    const { data, error } = await supabase.functions.invoke('mcp-freshservice-filter-tickets', {
      body: {
        serviceId,
        filters,
        ownerType,
        ownerId
      }
    });

    if (error) {
      if (error.error === 'TOKEN_REQUIRED') {
        throw new TokenRequiredError(error.message, 'freshservice', false);
      }
      throw error;
    }

    return data;
  }

  /**
   * List available resources for a service
   */
  static async listResources(serviceType: string): Promise<MCPResource[]> {
    const { data, error } = await supabase.functions.invoke('mcp-server', {
      body: {
        method: 'resources/list',
        serviceType
      }
    });

    if (error) throw error;
    return data.resources || [];
  }

  /**
   * Read a resource
   */
  static async readResource(
    serviceType: string,
    uri: string,
    ownerType?: 'user' | 'team' | 'account',
    ownerId?: string
  ) {
    const { data, error } = await supabase.functions.invoke('mcp-server', {
      body: {
        method: 'resources/read',
        serviceType,
        params: { uri },
        ownerType,
        ownerId
      }
    });

    if (error) {
      if (error.error === 'TOKEN_REQUIRED') {
        throw new TokenRequiredError(error.message, error.serviceType, error.usesAppToken);
      }
      throw error;
    }

    return data;
  }

  /**
   * Manage connection tokens
   */
  static async setToken(
    serviceId: string,
    ownerType: 'user' | 'team' | 'account',
    tokenData: {
      encrypted_token: string;
      auth_type: string;
      auth_config?: any;
      endpoint?: string;
    },
    ownerId?: string
  ) {
    const { data, error } = await supabase.functions.invoke('mcp-manage-token', {
      body: {
        action: 'set',
        serviceId,
        ownerType,
        ownerId,
        tokenData
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * Remove a connection token
   */
  static async removeToken(
    serviceId: string,
    ownerType: 'user' | 'team' | 'account',
    ownerId?: string
  ) {
    const { data, error } = await supabase.functions.invoke('mcp-manage-token', {
      body: {
        action: 'remove',
        serviceId,
        ownerType,
        ownerId
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * Check if a token exists
   */
  static async hasToken(
    serviceId: string,
    ownerType: 'user' | 'team' | 'account',
    ownerId?: string
  ): Promise<boolean> {
    const { data, error } = await supabase.functions.invoke('mcp-manage-token', {
      body: {
        action: 'get',
        serviceId,
        ownerType,
        ownerId
      }
    });

    if (error) return false;
    return data.hasToken || false;
  }
}

export class TokenRequiredError extends Error {
  constructor(
    message: string,
    public serviceType: string,
    public usesAppToken: boolean
  ) {
    super(message);
    this.name = 'TokenRequiredError';
  }
}
