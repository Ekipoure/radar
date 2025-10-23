# Agent-Based Monitoring System

## Overview

The monitoring system has been updated to support agent-based monitoring where deployed agents (source servers) monitor destination servers and send their data back to the main server.

## Key Changes

### 1. Database Schema Updates

- Added `source_ip` column to `monitoring_data` table to track which agent performed each monitoring check
- Updated `MonitoringData` interface to include `source_ip` field

### 2. New Components

- **AgentChart**: New chart component that displays monitoring data grouped by source agent
- **Agent-based API**: New endpoints for agents to send monitoring data

### 3. Main Page Updates

- Added chart type selector: "چارت‌های ایجنت" (Agent Charts) vs "چارت‌های سرور" (Server Charts)
- Agent charts show monitoring data from each agent to all destination servers
- Each chart represents one agent and shows its monitoring of all servers
- Color coding: Green bars for successful checks, red/yellow/purple for failures
- Beautiful tooltips show detailed information on hover

### 4. API Endpoints

- `GET /api/agents/monitoring` - Get agents with their monitoring data
- `GET /api/agents/monitoring?source_ip=X` - Get monitoring data for specific agent
- `POST /api/agents/monitoring/send` - Endpoint for agents to send monitoring data

## How It Works

### Agent Deployment
1. Agents are deployed on source servers using the existing deployment system
2. Each agent has a unique IP address (`server_ip` in agents table)
3. Agents run monitoring scripts that check destination servers

### Data Flow
1. Agent performs monitoring check on destination server
2. Agent sends results to main server via `/api/agents/monitoring/send`
3. Main server stores data with `source_ip` field
4. Charts display data grouped by agent (source) showing all destination servers

### Chart Display
- Each chart represents one agent
- Chart shows monitoring data from that agent to all destination servers
- Bars are colored by server status (using server's color for up, status colors for down)
- Tooltips show server name, status, response time, and error details

## Usage

### Viewing Agent Charts
1. Go to main page (http://localhost:3000)
2. Select "چارت‌های ایجنت" (Agent Charts)
3. Each chart shows one agent's monitoring of all servers
4. Hover over bars to see detailed information

### Agent Data Simulation
Run the simulation script to test the system:
```bash
node simulate-agent-data.js
```

## Technical Details

### Database Schema
```sql
-- monitoring_data table now includes source_ip
CREATE TABLE monitoring_data (
  id SERIAL PRIMARY KEY,
  server_id INTEGER REFERENCES servers(id),
  source_ip VARCHAR(45),  -- NEW: Agent IP that performed the check
  status VARCHAR(20) NOT NULL,
  response_time INTEGER,
  error_message TEXT,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Agent Data Format
```json
{
  "server_id": 1,
  "source_ip": "192.168.1.100",
  "status": "up",
  "response_time": 45,
  "error_message": null
}
```

## Benefits

1. **Distributed Monitoring**: Multiple agents can monitor the same servers from different locations
2. **Network Perspective**: See how servers perform from different network locations
3. **Redundancy**: If one agent fails, others continue monitoring
4. **Geographic Coverage**: Deploy agents in different regions for global monitoring
5. **Clear Visualization**: Easy to see which agent detected issues and when

## Future Enhancements

- Real-time agent status monitoring
- Agent health checks
- Geographic mapping of agents
- Alert system for agent failures
- Historical comparison between agents
