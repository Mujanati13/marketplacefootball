# Football Marketplace Server

A comprehensive REST API server for the Football Marketplace platform built with Express.js, Socket.IO, and MySQL.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control (RBAC)
- **User Management**: Support for customers, players, coaches, and admins
- **Marketplace**: Create and manage player/coach listings
- **Request System**: Request system for hiring coaches or buying player services
- **Meeting Management**: Admin-managed meeting scheduling and tracking
- **Real-time Chat**: Socket.IO powered chat system with conversation management
- **File Uploads**: Secure file upload system for profiles, listings, and messages
- **Admin Panel**: Comprehensive admin interface using AdminJS
- **Audit Logging**: Complete audit trail for all system actions

## Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Installation

1. Clone the repository and navigate to the server directory:
```bash
cd Server
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` file with your configuration.

4. Create MySQL database:
```sql
CREATE DATABASE football_marketplace;
```

5. Run database migrations:
```bash
npm run migrate
```

6. (Optional) Seed sample data:
```bash
npm run seed
```

## Running the Server

Development mode with auto-restart:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `POST /api/auth/change-password` - Change password

### Users
- `GET /api/users` - Get all users (admin)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `PATCH /api/users/:id/deactivate` - Deactivate user (admin)
- `DELETE /api/users/:id` - Delete user (admin)

### Profiles
- `POST /api/profiles` - Create profile
- `GET /api/profiles/user/:userId` - Get profile by user ID
- `GET /api/profiles/me` - Get my profile
- `PUT /api/profiles/:id` - Update profile
- `GET /api/profiles/search` - Search profiles
- `DELETE /api/profiles/:id` - Delete profile

### Listings
- `POST /api/listings` - Create listing
- `GET /api/listings` - Get marketplace listings
- `GET /api/listings/:id` - Get listing by ID
- `GET /api/listings/my/listings` - Get my listings
- `PUT /api/listings/:id` - Update listing
- `PATCH /api/listings/:id/status` - Update listing status
- `DELETE /api/listings/:id` - Delete listing

### Requests
- `POST /api/requests` - Create request
- `GET /api/requests` - Get all requests (admin)
- `GET /api/requests/my/sent` - Get my sent requests
- `GET /api/requests/my/received` - Get my received requests
- `GET /api/requests/:id` - Get request by ID
- `PATCH /api/requests/:id/status` - Update request status (admin)
- `PATCH /api/requests/:id/cancel` - Cancel request

### Meetings
- `POST /api/meetings` - Create meeting (admin)
- `GET /api/meetings` - Get all meetings (admin)
- `GET /api/meetings/my/meetings` - Get my meetings
- `GET /api/meetings/:id` - Get meeting by ID
- `PUT /api/meetings/:id` - Update meeting (admin)
- `PATCH /api/meetings/:id/cancel` - Cancel meeting (admin)
- `PATCH /api/meetings/:id/complete` - Complete meeting (admin)

### Chat
- `GET /api/chat/conversations` - Get my conversations
- `GET /api/chat/conversations/:id` - Get conversation by ID
- `GET /api/chat/conversations/:id/messages` - Get messages in conversation
- `POST /api/chat/conversations/:id/messages` - Send message
- `POST /api/chat/conversations` - Create conversation (admin)
- `GET /api/chat/unread-count` - Get unread message count

### Uploads
- `POST /api/uploads/single/:type` - Upload single file
- `POST /api/uploads/multiple/:type` - Upload multiple files
- `DELETE /api/uploads/:filename` - Delete file
- `GET /api/uploads/info/:filename` - Get file info

### Admin Panel
Access the admin panel at `/admin` with admin credentials.

## Socket.IO Events

### Client to Server
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room
- `send_message` - Send message
- `mark_read` - Mark messages as read
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `get_online_users` - Get online users in conversation

### Server to Client
- `new_message` - New message received
- `new_message_notification` - New message notification
- `user_typing` - User typing status
- `messages_read` - Messages marked as read
- `online_users` - Online users list
- `new_request` - New request notification
- `request_status_updated` - Request status changed
- `meeting_scheduled` - Meeting scheduled
- `meeting_updated` - Meeting updated
- `meeting_cancelled` - Meeting cancelled

## Database Schema

The system uses MySQL with the following main tables:
- `users` - User accounts and basic info
- `profiles` - Extended profiles for players/coaches
- `listings` - Marketplace listings
- `requests` - Hire/buy requests
- `meetings` - Scheduled meetings
- `conversations` - Chat conversations
- `conversation_participants` - Conversation participants
- `messages` - Chat messages
- `audit_logs` - System audit trail

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- Rate limiting
- File upload validation
- SQL injection protection
- XSS protection with helmet
- CORS configuration

## Sample Users (after seeding)

- **Admin**: admin@footballmarketplace.com / admin123
- **Coach**: john.coach@example.com / coach123
- **Player**: alex.player@example.com / player123
- **Customer**: mike.customer@example.com / customer123

## Environment Variables

See `.env.example` for all required environment variables.

## License

Private - Football Marketplace Project
