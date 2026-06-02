from flask import Blueprint, render_template, request, jsonify, current_app, redirect, url_for
from .conn import db, socketio
from .models import User, Contact
from flask_login import login_user, logout_user, login_required, current_user
from itsdangerous import URLSafeTimedSerializer, SignatureExpired

bp = Blueprint('main', __name__)

@bp.route('/')
def landing():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return render_template('landing.html')

@bp.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=current_user)

@bp.route('/register', methods=['POST'])
def register():
    username = request.form.get('username', '').strip()
    password = request.form.get('password', '').strip()
    email = request.form.get('email', '').strip() or None
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    
    if len(password) < 4:
        return jsonify({'error': 'Password must be at least 4 characters'}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'This username is already taken'}), 400
    
    if email and User.query.filter_by(email=email).first():
        return jsonify({'error': 'This email is already registered'}), 400
    
    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'Account created successfully! Please log in.'}), 201

@bp.route('/login', methods=['POST'])
def login():
    username = request.form.get('username', '').strip()
    password = request.form.get('password', '').strip()
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    user = User.query.filter_by(username=username).first()
    
    if not user:
        return jsonify({'error': 'Invalid username or password'}), 401
    
    if not user.check_password(password):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    login_user(user)
    return jsonify({'message': 'Login successful', 'redirect': '/dashboard'}), 200

@bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.landing'))

# Minimal API example
@bp.route('/api/contacts')
@login_required
def api_contacts():
    contacts = Contact.query.filter_by(user_id=current_user.id, status='accepted').all()
    result = []
    for c in contacts:
        user = User.query.get(c.contact_id)
        if user:
            result.append({
                'id': user.id,
                'username': user.username,
                'online': user.online,
                'in_call': user.in_call
            })
    return jsonify(result)
