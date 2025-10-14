# Radar Monitoring System

A modern, real-time server monitoring system built with Next.js, TypeScript, and PostgreSQL. Monitor your servers with ping, HTTP, HTTPS, and TCP checks.

## Features

- **Real-time Monitoring**: Live status updates for all your servers
- **Multiple Check Types**: Support for ping, HTTP, HTTPS, and TCP port checks
- **Server Grouping**: Organize servers into Iranian and Global groups
- **Modern Dashboard**: Beautiful, responsive admin interface
- **Historical Data**: Store and view monitoring history
- **Authentication**: Secure admin login system
- **Configurable**: Customizable check intervals, timeouts, and expected responses

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd radar
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Database Configuration
   DATABASE_URL="postgresql://username:password@localhost:5432/radar_monitoring"

   # JWT Secret for authentication
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

   # Next.js Configuration
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-nextauth-secret-change-this-in-production"

   # Monitoring Configuration
   DEFAULT_CHECK_INTERVAL=60
   DEFAULT_TIMEOUT=5000
   ```

4. **Set up PostgreSQL database**
   ```sql
   CREATE DATABASE radar_monitoring;
   ```

5. **Run the application**
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Login Credentials

- **Username**: admin
- **Password**: admin123

⚠️ **Important**: Change the default password in production!

## Usage

### Adding Servers

1. Click the "Add Server" button in the dashboard
2. Fill in the server details:
   - **Server Name**: A descriptive name for your server
   - **IP Address**: The server's IP address or hostname
   - **Request Type**: Choose from ping, HTTP, HTTPS, or TCP
   - **Port**: Required for HTTP/HTTPS/TCP checks
   - **Endpoint**: Optional path for HTTP/HTTPS checks (e.g., `/health`)
   - **Expected Status Code**: For HTTP/HTTPS checks (default: 200)
   - **Check Interval**: How often to check (in seconds)
   - **Timeout**: Maximum wait time (in milliseconds)
   - **Server Group**: Iranian or Global

### Monitoring

- Servers are automatically monitored every 30 seconds
- Status updates appear in real-time on the dashboard
- Historical data is stored for 24 hours
- Servers can be enabled/disabled individually

### Server Status

- **Online**: Server is responding normally
- **Offline**: Server is not responding
- **Timeout**: Server took too long to respond
- **Error**: An error occurred during the check

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify authentication

### Servers
- `GET /api/servers` - Get all servers
- `POST /api/servers` - Create new server
- `GET /api/servers/[id]` - Get specific server
- `PUT /api/servers/[id]` - Update server
- `DELETE /api/servers/[id]` - Delete server

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Monitoring
- `GET /api/monitoring/status` - Get monitoring service status
- `POST /api/monitoring/status` - Start/stop monitoring service

## Development

### Project Structure

```
radar/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication logic
│   ├── database.ts       # Database connection
│   ├── monitoring.ts     # Monitoring functions
│   └── types.ts          # TypeScript types
├── scripts/              # Utility scripts
└── public/               # Static assets
```

### Database Schema

The application uses the following main tables:

- **users**: Admin user accounts
- **servers**: Server configurations
- **monitoring_data**: Historical monitoring results

## Production Deployment

1. **Set up production environment variables**
2. **Configure PostgreSQL for production**
3. **Build the application**: `npm run build`
4. **Start the application**: `npm start`
5. **Set up reverse proxy** (nginx recommended)
6. **Configure SSL certificates**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
