# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-02-24

### Added
- Initial release of TypeScript client for Uptime Kuma API
- Full support for all monitor types (HTTP, Port, Ping, DNS, Docker, etc.)
- Complete CRUD operations for monitors
- Tag management and monitor tagging
- Notification system support
- Proxy configuration
- Status page management
- Docker host integration
- Maintenance window scheduling
- API key management
- Settings configuration
- Real-time event subscriptions via Socket.IO
- Comprehensive TypeScript type definitions
- Utility functions for common operations
- Full examples and documentation
- Unit tests for utility functions
- Promise-based async/await API
- Error handling and timeout support

### Features
- **Monitors**: Create, read, update, delete monitors of all types
- **Tags**: Organize monitors with tags and values
- **Notifications**: Configure notification channels (Slack, Email, etc.)
- **Proxies**: Set up HTTP/HTTPS/SOCKS proxies for monitors
- **Status Pages**: Create public status pages
- **Docker**: Monitor Docker containers
- **Maintenance**: Schedule maintenance windows
- **API Keys**: Generate and manage API keys
- **Settings**: Configure Uptime Kuma settings
- **Events**: Real-time event streaming

### Technical
- TypeScript 5.3+
- Socket.IO client for real-time communication
- Strict type checking
- ESLint and Prettier configuration
- Jest for testing
- Comprehensive JSDoc comments
