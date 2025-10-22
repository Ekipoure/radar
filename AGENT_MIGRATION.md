# Agent Migration Documentation

## Overview

The deploy section has been renamed to "Agent" throughout the application. This change reflects the concept that when a repository is deployed to a server, it creates an "agent" that runs on that server.

## Changes Made

### 1. Database Schema
- **New Table**: `agents` table created with the same structure as `deployed_servers`
- **Backward Compatibility**: `deployed_servers` table kept for existing data
- **Indexes**: Added performance indexes for the agents table

### 2. API Endpoints
- **New Endpoints**: 
  - `GET /api/agents` - List all agents
  - `POST /api/agents` - Create new agent
  - `PUT /api/agents/[id]` - Update agent
  - `DELETE /api/agents/[id]` - Delete agent
- **Updated Deploy Endpoint**: `/api/deploy` now saves deployment info to agents table
- **Authentication**: All agent endpoints require authentication

### 3. Frontend Components
- **New Component**: `AgentTable.tsx` - Dedicated table for displaying agents
- **Updated Components**:
  - `Dashboard.tsx` - Added agents tab and data fetching
  - `DeployModal.tsx` - Added agent name field and updated terminology
  - `Header.tsx` - Changed "Deploy" button to "Deploy Agent"

### 4. Types and Interfaces
- **New Types**: `Agent`, `CreateAgentData`, `UpdateAgentData`
- **Updated Types**: `DeployResult` now includes agent data

## Database Migration

### Automatic Migration
The application will automatically create the agents table when it starts up.

### Manual Migration (Optional)
To migrate existing deployed_servers data to the agents table:

```bash
node scripts/migrate-to-agents.js
```

This script will:
1. Check if the agents table exists
2. Copy all data from deployed_servers to agents
3. Handle conflicts gracefully
4. Report migration statistics

## Usage

### Deploying an Agent
1. Click "Deploy Agent" in the header
2. Fill in the agent name (required)
3. Provide server details and repository information
4. The deployment will be saved to the agents table upon success

### Managing Agents
1. Switch to the "ایجنت‌ها" (Agents) tab in the dashboard
2. View all deployed agents
3. Edit, enable/disable, or delete agents as needed

## Terminology Changes

| Old Term | New Term | Context |
|----------|----------|---------|
| Deploy | Deploy Agent | Button text and modal title |
| Deployed Servers | Agents | Table and section names |
| دیپلوی | ایجنت‌ها | Persian tab name |

## Backward Compatibility

- The `deployed_servers` table and API endpoints remain functional
- Existing data is preserved
- No breaking changes to existing functionality
- Migration script available for data transfer

## Benefits

1. **Clearer Concept**: "Agent" better represents the deployed application running on a server
2. **Better Organization**: Separate table for agent-specific data
3. **Enhanced Features**: Agent-specific functionality can be added independently
4. **Scalability**: Better structure for future agent management features

## Technical Details

### Database Schema
```sql
CREATE TABLE agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  server_ip VARCHAR(45) NOT NULL,
  username VARCHAR(100) NOT NULL,
  repo_url VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'deployed' CHECK (status IN ('deployed', 'deploying', 'failed', 'stopped')),
  deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_checked TIMESTAMP,
  port INTEGER DEFAULT 3000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Response Format
```json
{
  "agents": [
    {
      "id": 1,
      "name": "My Production Agent",
      "server_ip": "192.168.1.100",
      "username": "root",
      "repo_url": "https://github.com/user/repo.git",
      "status": "deployed",
      "deployed_at": "2024-01-01T00:00:00Z",
      "port": 3000,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```
