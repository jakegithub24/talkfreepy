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
    username = request.form.get('username')
    password = request.form.get('password')
    email = request.form.get('email')
    if not username or not password:
        return jsonify({'error':'Required'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error':'Exists'}), 400
    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    # If HTML form submit, redirect to landing/login
    if request.content_type and 'application/json' not in request.content_type:
        return redirect(url_for('main.landing'))
    return jsonify({'message':'ok'})

@bp.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        login_user(user)
        if request.content_type and 'application/json' not in request.content_type:
            return redirect(url_for('main.dashboard'))
        return jsonify({'message':'ok'})
    # On HTML form submission, redirect back with error
    if request.content_type and 'application/json' not in request.content_type:
        return render_template('landing.html', error='Invalid credentials')
    return jsonify({'error':'Invalid'}), 401

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
