# TalkFreePy

A modern, real-time peer-to-peer video and voice calling web application built with Flask and WebRTC. Connect with users instantly without intermediaries, leveraging the power of WebRTC for secure, direct communication.

---

## 🌟 Features

### Authentication & User Management
- **User Registration**: Create accounts with username, password, and optional email
- **Secure Login**: Password hashing with Werkzeug security utilities
- **Session Management**: Flask-Login powered authentication with persistent sessions
- **Password Reset**: Token-based secure password recovery via email verification
- **Account Deletion**: Full account cleanup including all contacts and associated data

### Contact Management
- **User Search**: Find other users by username with a quick search feature
- **Contact Requests**: Send and receive contact requests with pending/accepted states
- **Contact Acceptance**: Auto-accept reverse requests to streamline contact addition
- **Block/Unblock**: Block users to prevent unwanted incoming calls and contact requests
- **Contact List**: View all accepted contacts with their online and call status

### Real-Time Communication
- **Peer-to-Peer Calls**: Direct WebRTC connections between users for low-latency communication
- **WebRTC Signaling**: Automatic SDP offer/answer exchange and ICE candidate handling via WebSocket
- **Voice & Video**: Full-duplex audio and video streaming directly between peers
- **Online Status**: Real-time user availability tracking and display
- **Call Status**: View which contacts are currently in calls

### User Experience
- **Responsive Dashboard**: Intuitive interface for managing contacts and initiating calls
- **Real-Time Notifications**: Instant notifications for incoming calls and contact requests via SocketIO
- **Call Rejection**: Prevent calls from blocked users or busy contacts
- **Call State Management**: Automatic tracking of active calls and user availability

---

## 🛠 Tech Stack

### Backend
- **Flask**: Lightweight WSGI web framework for Python
- **Flask-SQLAlchemy**: ORM for database operations with SQLite
- **Flask-SocketIO**: WebSocket support for real-time bidirectional communication
- **Flask-Login**: User session and authentication management
- **Werkzeug**: Security utilities for password hashing and validation
- **itsdangerous**: Secure token generation for password reset links

### Frontend
- **HTML5**: Semantic markup and form handling
- **CSS3**: Modern styling and responsive design
- **JavaScript**: WebRTC API, SocketIO client library
- **WebRTC**: Peer-to-peer media streaming

### Database
- **SQLite**: Lightweight, file-based relational database

---

## 📋 Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- A modern web browser with WebRTC support (Chrome, Firefox, Edge, Safari)
- For production: A TURN server for NAT/firewall traversal (optional but recommended)

---

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/talkfreepy.git
cd talkfreepy
```

### 2. Create a Virtual Environment
```bash
# On macOS/Linux
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Initialize the Database
```bash
python app.py
```
This will create the SQLite database (`talkfreepy.db`) on first run.

---

## 🏃 Running the Application

### Development Server
```bash
python app.py
```

The application will be available at `http://localhost:5000`

### With Custom Host/Port
```bash
# Modify the last line of app.py or run:
python -c "from app import app, socketio; socketio.run(app, host='0.0.0.0', port=8080, debug=True)"
```

---

## 📚 Project Structure

```
talkfreepy/
├── app.py                 # Main Flask application and routes
├── requirements.txt       # Python dependencies
├── test.py               # API testing utilities
├── talkfreepy.db         # SQLite database (created at runtime)
├── templates/            # HTML templates
│   ├── landing.html      # Login/registration page
│   ├── dashboard.html    # Main application interface
│   ├── reset_password.html   # Password reset request
│   └── reset_token.html  # Password reset form
└── static/               # Static assets
    ├── css/
    │   └── style.css     # Application styling
    ├── js/
    │   └── script.js     # WebRTC and SocketIO client logic
    └── assets/           # Images and media files
```

---

## 🔑 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Landing page with login/register |
| POST | `/register` | Register a new user |
| POST | `/login` | Authenticate user |
| GET | `/logout` | Logout and clear session |

### User & Contact Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Main application dashboard (requires auth) |
| GET | `/api/search_users?q=<query>` | Search users by username |
| GET | `/api/contacts` | Get list of accepted contacts |
| GET | `/api/pending_requests` | Get incoming contact requests |
| POST | `/api/send_request` | Send a contact request |
| POST | `/api/respond_request` | Accept/reject contact request |
| POST | `/api/block_user` | Block a user |
| POST | `/api/unblock_user` | Unblock a user |

### Account Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/reset_password` | Request password reset |
| GET/POST | `/reset_password/<token>` | Reset password with token |
| POST | `/api/delete_account` | Permanently delete user account |

### Real-Time Events (WebSocket via SocketIO)

**Emitted by Client:**
- `connect` - Establish connection
- `call_user` - Initiate a call
- `accept_call` - Accept incoming call
- `reject_call` - Reject incoming call
- `end_call` - Terminate active call
- `webrtc_offer` - Send SDP offer
- `webrtc_answer` - Send SDP answer
- `webrtc_ice` - Forward ICE candidate
- `set_in_call` - Mark user as in call
- `set_not_in_call` - Mark user as not in call

**Emitted by Server:**
- `incoming_call` - Notify user of incoming call
- `call_accepted` - Notify caller that callee accepted
- `call_rejected` - Notify caller of rejection
- `call_error` - Notify of call errors
- `call_ended` - Notify call has ended
- `webrtc_offer` - Relay SDP offer
- `webrtc_answer` - Relay SDP answer
- `webrtc_ice` - Relay ICE candidate

---

## 🔒 Security Considerations

### Current Implementation
- ✅ Password hashing with Werkzeug
- ✅ Secure token generation for password resets
- ✅ Session-based authentication with Flask-Login
- ✅ Block list to prevent unwanted contacts
- ✅ Unique username and email constraints

### Production Recommendations
- ⚠️ **Change SECRET_KEY**: Replace `'supersecretkey'` with a strong, random value
- ⚠️ **Enable HTTPS**: Use SSL/TLS certificates for encrypted communication
- ⚠️ **CORS Configuration**: Add CORS headers for cross-origin requests
- ⚠️ **Rate Limiting**: Implement rate limiting on authentication endpoints
- ⚠️ **TURN Server**: Deploy a TURN server for NAT traversal in restricted networks
- ⚠️ **Database Security**: Use environment variables for database credentials
- ⚠️ **Email Verification**: Implement email confirmation for account registration
- ⚠️ **Input Validation**: Add comprehensive input validation and sanitization

---

## 📖 Usage Guide

### Registering an Account
1. Navigate to `http://localhost:5000`
2. Click "Register" and fill in the form
3. Enter a username, password, and optional email
4. Click "Create Account"

### Logging In
1. Enter your username and password
2. Click "Login"
3. You'll be redirected to the dashboard

### Making a Call
1. Go to the dashboard
2. Use the search bar to find other users
3. Send a contact request to the desired user
4. Once accepted, they'll appear in your contacts list
5. Click on a contact to initiate a call
6. Wait for them to accept
7. Video/audio will stream once WebRTC connection is established

### Managing Contacts
- **Search**: Use the search bar to find users
- **Request**: Send a contact request
- **Accept**: Accept pending requests in the notifications panel
- **Block**: Block users to prevent incoming calls
- **Remove**: Delete contacts from your list

---

## 🧪 Testing

The project includes a test suite for API endpoints. Run tests with:

```bash
# Make sure the app is running in another terminal
python test.py
```

This will test:
- User registration
- User login
- User search
- Contact request sending
- Contact list retrieval
- User logout

---

## 🐛 Troubleshooting

### Issue: "User already exists" on registration
**Solution**: Check that the username hasn't been registered. Try a different username.

### Issue: WebRTC connection fails
**Solution**: 
- Ensure both users are connected to the internet
- Check browser console for WebRTC errors
- Deploy a TURN server for firewall/NAT traversal
- Verify firewall settings allow WebRTC traffic

### Issue: Calls don't connect between users on different networks
**Solution**: TURN server configuration is likely needed. Add TURN server configuration to your WebRTC initialization:
```javascript
const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
  ]
});
```

### Issue: Database errors
**Solution**: Delete `talkfreepy.db` and restart the app to reinitialize the database.

---

## 🚀 Deployment

### Heroku Deployment
1. Create a `Procfile`:
   ```
   web: gunicorn --worker-class eventlet -w 1 app:app
   ```

2. Create `runtime.txt`:
   ```
   python-3.9.13
   ```

3. Deploy:
   ```bash
   git push heroku main
   ```

### Docker Deployment
Create a `Dockerfile`:
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

Build and run:
```bash
docker build -t talkfreepy .
docker run -p 5000:5000 talkfreepy
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section above

---

## 🎯 Roadmap

- [ ] End-to-end encryption for calls
- [ ] Screen sharing capability
- [ ] Call recording and replay
- [ ] Group calls support
- [ ] Message history and persistence
- [ ] User profiles with avatars
- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] Call history and analytics
- [ ] User presence indicators

---

## ⭐ Acknowledgments

- Built with [Flask](https://flask.palletsprojects.com/)
- Real-time communication powered by [Socket.IO](https://socket.io/)
- Peer-to-peer media streaming via [WebRTC](https://webrtc.org/)
- Security utilities from [Werkzeug](https://werkzeug.palletsprojects.com/)

---

**Made with ❤️ for free and open-source communication**
