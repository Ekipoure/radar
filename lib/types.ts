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
  status: 'up' | 'down' | 'timeout' | 'error' | 'skipped';
  response_time?: number;
  error_message?: string;
  checked_at: string;
}

export interface ServerWithStatus extends Server {
  current_status?: 'up' | 'down' | 'timeout' | 'error' | 'skipped';
  last_checked?: string;
  response_time?: number;
  error_message?: string;
}

export interface DashboardStats {
  total_servers: number;
  up_servers: number;
  down_servers: number;
  iranian_servers: number;
  global_servers: number;
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
