#!/usr/bin/env python
"""
Test script to verify rework_app auth works correctly
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.conn import db
from app.models import User

# Create app and initialize DB
app = create_app()

with app.app_context():
    # Create tables
    db.create_all()
    print("✓ Database initialized")
    
    # Test 1: Create a user
    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    db.session.add(user)
    db.session.commit()
    print("✓ User created: testuser")
    
    # Test 2: Verify password hashing
    test_user = User.query.filter_by(username='testuser').first()
    if test_user.check_password('password123'):
        print("✓ Password check passed")
    else:
        print("✗ Password check failed!")
        sys.exit(1)
    
    # Test 3: Verify wrong password fails
    if not test_user.check_password('wrongpassword'):
        print("✓ Wrong password rejected")
    else:
        print("✗ Wrong password incorrectly accepted!")
        sys.exit(1)
    
    # Test 4: Try to create duplicate username
    dup_user = User(username='testuser', email='dup@example.com')
    dup_user.set_password('pass456')
    try:
        db.session.add(dup_user)
        db.session.commit()
        print("✗ Duplicate username was not prevented!")
        sys.exit(1)
    except:
        db.session.rollback()
        print("✓ Duplicate username prevented")
    
    print("\n✓ All tests passed! Auth system is working correctly.")
