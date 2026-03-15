from flask import Flask, render_template, redirect, url_for, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, SignatureExpired
import os
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'supersecretkey'  # Change in production!
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///talkfreepy.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
socketio = SocketIO(app)
login_manager = LoginManager(app)
login_manager.login_view = 'landing'

# Models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    online = db.Column(db.Boolean, default=False)
    in_call = db.Column(db.Boolean, default=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Contact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    contact_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, blocked
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('user_id', 'contact_id', name='unique_contact'),)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Routes
@app.route('/')
def landing():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('landing.html')

@app.route('/register', methods=['POST'])
def register():
    username = request.form.get('username')
    password = request.form.get('password')
    email = request.form.get('email')
    
    # Convert empty string to None to avoid unique constraint violation
    if email == '':
        email = None

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'Registration successful'}), 200

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        login_user(user)
        return jsonify({'message': 'Login successful'}), 200
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('landing'))

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=current_user)

# API endpoints for contacts
@app.route('/api/search_users', methods=['GET'])
@login_required
def search_users():
    query = request.args.get('q', '')
    if not query:
        return jsonify([])
    users = User.query.filter(User.username.contains(query), User.id != current_user.id).limit(10).all()
    return jsonify([{'id': u.id, 'username': u.username} for u in users])

@app.route('/api/send_request', methods=['POST'])
@login_required
def send_request():
    contact_id = request.json.get('contact_id')
    if not contact_id:
        return jsonify({'error': 'Contact ID required'}), 400
    contact_user = User.query.get(contact_id)
    if not contact_user:
        return jsonify({'error': 'User not found'}), 404
    # Check if already a contact or pending
    existing = Contact.query.filter_by(user_id=current_user.id, contact_id=contact_id).first()
    if existing:
        return jsonify({'error': 'Request already sent or contact exists'}), 400
    # Check reverse
    reverse = Contact.query.filter_by(user_id=contact_id, contact_id=current_user.id).first()
    if reverse:
        if reverse.status == 'pending':
            reverse.status = 'accepted'
            db.session.commit()
            return jsonify({'message': 'Request accepted', 'status': 'accepted'}), 200
        else:
            return jsonify({'error': 'Contact exists'}), 400
    # Create new request
    contact = Contact(user_id=current_user.id, contact_id=contact_id, status='pending')
    db.session.add(contact)
    db.session.commit()
    return jsonify({'message': 'Request sent'}), 200

@app.route('/api/contacts', methods=['GET'])
@login_required
def get_contacts():
    contacts_as_user = Contact.query.filter_by(user_id=current_user.id, status='accepted').all()
    contacts_as_contact = Contact.query.filter_by(contact_id=current_user.id, status='accepted').all()
    contact_ids = [c.contact_id for c in contacts_as_user] + [c.user_id for c in contacts_as_contact]
    users = User.query.filter(User.id.in_(contact_ids)).all()
    return jsonify([{'id': u.id, 'username': u.username, 'online': u.online, 'in_call': u.in_call} for u in users])

@app.route('/api/pending_requests', methods=['GET'])
@login_required
def pending_requests():
    requests = Contact.query.filter_by(contact_id=current_user.id, status='pending').all()
    # Return contact id, not user id
    result = [{'id': r.id, 'username': User.query.get(r.user_id).username} for r in requests]
    return jsonify(result)

@app.route('/api/respond_request', methods=['POST'])
@login_required
def respond_request():
    data = request.json
    request_id = data.get('request_id')
    action = data.get('action')
    contact = Contact.query.get(request_id)
    if not contact or contact.contact_id != current_user.id:
        return jsonify({'error': 'Invalid request'}), 404
    if action == 'accept':
        contact.status = 'accepted'
        db.session.commit()
        return jsonify({'message': 'Request accepted'}), 200
    elif action == 'reject':
        db.session.delete(contact)
        db.session.commit()
        return jsonify({'message': 'Request rejected'}), 200
    else:
        return jsonify({'error': 'Invalid action'}), 400

@app.route('/api/block_user', methods=['POST'])
@login_required
def block_user():
    contact_id = request.json.get('contact_id')
    # Find or create block record from current user to contact_id
    contact = Contact.query.filter_by(user_id=current_user.id, contact_id=contact_id).first()
    if contact:
        contact.status = 'blocked'
    else:
        contact = Contact(user_id=current_user.id, contact_id=contact_id, status='blocked')
        db.session.add(contact)
    db.session.commit()
    return jsonify({'message': 'User blocked'}), 200

@app.route('/api/unblock_user', methods=['POST'])
@login_required
def unblock_user():
    contact_id = request.json.get('contact_id')
    contact = Contact.query.filter_by(user_id=current_user.id, contact_id=contact_id, status='blocked').first()
    if contact:
        db.session.delete(contact)
        db.session.commit()
        return jsonify({'message': 'User unblocked'}), 200
    return jsonify({'error': 'Not blocked'}), 400

# Password reset
@app.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
    if request.method == 'POST':
        email = request.form.get('email')
        user = User.query.filter_by(email=email).first()
        if user:
            s = URLSafeTimedSerializer(app.config['SECRET_KEY'])
            token = s.dumps(user.email, salt='password-reset')
            # In a real app, send email. Here we redirect to token entry page.
            return redirect(url_for('reset_token', token=token))
        else:
            return render_template('reset_password.html', error='Email not found')
    return render_template('reset_password.html')

@app.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_token(token):
    s = URLSafeTimedSerializer(app.config['SECRET_KEY'])
    try:
        email = s.loads(token, salt='password-reset', max_age=3600)
    except SignatureExpired:
        return render_template('reset_password.html', error='Token expired')
    if request.method == 'POST':
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        if user:
            user.set_password(password)
            db.session.commit()
            return redirect(url_for('landing'))
    return render_template('reset_token.html', token=token)

# Delete account
@app.route('/api/delete_account', methods=['POST'])
@login_required
def delete_account():
    Contact.query.filter((Contact.user_id == current_user.id) | (Contact.contact_id == current_user.id)).delete()
    db.session.delete(current_user)
    db.session.commit()
    logout_user()
    return jsonify({'message': 'Account deleted'}), 200

# SocketIO events
@socketio.on('connect')
def handle_connect():
    if current_user.is_authenticated:
        join_room(str(current_user.id))
        current_user.online = True
        db.session.commit()
    else:
        return False

@socketio.on('disconnect')
def handle_disconnect():
    if current_user.is_authenticated:
        leave_room(str(current_user.id))
        current_user.online = False
        current_user.in_call = False
        db.session.commit()

@socketio.on('call_user')
def handle_call(data):
    callee_id = data.get('user_id')
    if not callee_id:
        emit('call_error', {'message': 'No user specified'})
        return
    callee = User.query.get(callee_id)
    if not callee:
        emit('call_error', {'message': 'User not found'})
        return
    # Check if blocked
    blocked = Contact.query.filter_by(user_id=callee_id, contact_id=current_user.id, status='blocked').first()
    if blocked:
        emit('call_rejected', {'reason': 'You are blocked by user'})
        return
    if not callee.online:
        emit('call_rejected', {'reason': 'User is offline'})
        return
    if callee.in_call:
        emit('call_rejected', {'reason': 'User is on another call'})
        return
    # Notify callee
    socketio.emit('incoming_call', {
        'caller_id': current_user.id,
        'caller_name': current_user.username
    }, room=str(callee_id))

# WebRTC signaling forwarding events
@socketio.on('webrtc_offer')
def webrtc_offer(data):
    """Forward an SDP offer from caller to target user."""
    target_id = data.get('target_id')
    sdp = data.get('sdp')
    if not target_id or not sdp:
        return
    # Forward offer to callee
    socketio.emit('webrtc_offer', {'sdp': sdp, 'from': current_user.id}, room=str(target_id))

@socketio.on('webrtc_answer')
def webrtc_answer(data):
    """Forward an SDP answer from callee back to caller."""
    target_id = data.get('target_id')
    sdp = data.get('sdp')
    if not target_id or not sdp:
        return
    # Forward answer to caller
    socketio.emit('webrtc_answer', {'sdp': sdp, 'from': current_user.id}, room=str(target_id))

@socketio.on('webrtc_ice')
def webrtc_ice(data):
    """Forward ICE candidate to the peer."""
    target_id = data.get('target_id')
    candidate = data.get('candidate')
    if not target_id or not candidate:
        return
    # Forward ICE candidate to peer
    socketio.emit('webrtc_ice', {'candidate': candidate, 'from': current_user.id}, room=str(target_id))

@socketio.on('accept_call')
def handle_accept(data):
    caller_id = data.get('caller_id')
    # Notify caller that callee accepted (SDP answer will follow via signaling)
    socketio.emit('call_accepted', {
        'callee_id': current_user.id,
        'callee_name': current_user.username
    }, room=str(caller_id))
    # Do NOT set in_call here; set after WebRTC connection is established (client-side)

@socketio.on('set_in_call')
def set_in_call(data):
    # Called by client after WebRTC connection is established
    user_id = data.get('user_id')
    user = User.query.get(user_id)
    if user:
        user.in_call = True
        db.session.commit()

@socketio.on('set_not_in_call')
def set_not_in_call(data):
    # Called by client after call ends
    user_id = data.get('user_id')
    user = User.query.get(user_id)
    if user:
        user.in_call = False
        db.session.commit()

@socketio.on('reject_call')
def handle_reject(data):
    caller_id = data.get('caller_id')
    socketio.emit('call_rejected', {'reason': 'Call rejected'}, room=str(caller_id))

@socketio.on('end_call')
def handle_end(data):
    other_user_id = data.get('other_user_id')
    if other_user_id:
        socketio.emit('call_ended', {}, room=str(other_user_id))
        other = User.query.get(other_user_id)
        if other:
            other.in_call = False
    current_user.in_call = False
    db.session.commit()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True)
