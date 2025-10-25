export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Server {
  id: number;
  name: string;
  ip_address: string;
  port?: number;
  request_type: 'ping' | 'http' | 'https' | 'tcp';
  endpoint?: string;
  expected_status_code?: number;
  check_interval: number;
  timeout: number;
  server_group: 'iranian' | 'global';
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonitoringData {
  id: number;
  server_id: number;
  source_ip?: string;
  status: 'up' | 'down' | 'timeout' | 'error' | 'skipped';
  response_time?: number;
  error_message?: string;
  checked_at: string;
}

export interface ServerWithStatus extends Server {
  current_status?: 'up' | 'down' | 'timeout' | 'error' | 'skipped' | 'active' | 'inactive' | 'unknown';
  last_checked?: string;
  response_time?: number;
  error_message?: string;
}

export interface Agent {
  id: number;
  name: string;
  server_ip: string;
  username: string;
  repo_url: string;
  status: 'deployed' | 'deploying' | 'failed' | 'stopped';
  deployed_at: string;
  last_checked?: string;
  port: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalServers: number;
  totalAgents: number;
  totalChecks: number;
  upCount: number;
  downCount: number;
  timeoutCount: number;
  errorCount: number;
  uptimePercentage: number;
}

export interface CreateServerData {
  name: string;
  ip_address: string;
  port?: number;
  request_type: 'ping' | 'http' | 'https' | 'tcp';
  endpoint?: string;
  expected_status_code?: number;
  check_interval: number;
  timeout: number;
  server_group: 'iranian' | 'global';
  color: string;
}

export interface UpdateServerData extends Partial<CreateServerData> {
  is_active?: boolean;
}

export interface Agent {
  id: number;
  name: string;
  server_ip: string;
  username: string;
  repo_url: string;
  status: 'deployed' | 'deploying' | 'failed' | 'stopped';
  deployed_at: string;
  last_checked?: string;
  port: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentData {
  name: string;
  server_ip: string;
  username: string;
  repo_url: string;
  port?: number;
}

export interface UpdateAgentData extends Partial<CreateAgentData> {
  status?: 'deployed' | 'deploying' | 'failed' | 'stopped';
  is_active?: boolean;
}

export interface DeployedServer {
  id: number;
  name: string;
  server_ip: string;
  username: string;
  repo_url: string;
  status: 'deployed' | 'deploying' | 'failed' | 'stopped';
  deployed_at: string;
  last_checked?: string;
  port: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDeployedServerData {
  name: string;
  server_ip: string;
  username: string;
  repo_url: string;
  port?: number;
}

export interface UpdateDeployedServerData extends Partial<CreateDeployedServerData> {
  status?: 'deployed' | 'deploying' | 'failed' | 'stopped';
  is_active?: boolean;
}
