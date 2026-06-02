# Auth Testing Checklist

## ✓ What Should Work Now

### Registration
- [ ] Register with new username → "Account created successfully!"
- [ ] Try duplicate username → "This username is already taken"
- [ ] Try username < 3 chars → "Username must be at least 3 characters"
- [ ] Try password < 4 chars → "Password must be at least 4 characters"
- [ ] Register with email (optional) → Works
- [ ] Register without email → Works

### Login
- [ ] Login with correct credentials → Redirects to /dashboard
- [ ] Login with wrong password → "Invalid username or password"
- [ ] Login with nonexistent user → "Invalid username or password"
- [ ] Login with empty username → "Username and password are required"
- [ ] Login with empty password → "Username and password are required"

### Dashboard
- [ ] After login, see dashboard with welcome message
- [ ] See "Your Contacts" section (empty initially)
- [ ] See "Status" section with "Online" badge
- [ ] Click "Logout" button → Redirects to landing page

### UI/UX
- [ ] Errors show as red alerts at top of form
- [ ] Success shows as green alert
- [ ] Buttons show loading state ("Creating…", "Logging in…")
- [ ] Buttons disable during submission
- [ ] "Back to login" link works from register form
- [ ] "Create one" link works from login form
- [ ] Forms can be submitted with Enter key

## Test Credentials

Use these to test after first registration:
- Username: `testuser`
- Password: `test1234`

Or create your own during registration.

## Database Location

- File: `/home/parrot/Storage/GithubRepo/talkfreepy2/rework_app/instance/rework_talkfreepy.db`
- If you want to reset: Delete this file, restart app (new DB created)

## Common Issues & Fixes

### "User exists" after registration
- **Cause**: Trying to register same username twice
- **Fix**: Use different username
- **Expected**: "This username is already taken" error

### "Invalid credentials" on correct password
- **Cause**: Old database with plaintext passwords
- **Fix**: Delete `instance/rework_talkfreepy.db` and restart
- **Run**: `rm instance/rework_talkfreepy.db && python run.py`

### Can't log in after registration
- **Cause**: Session not established
- **Fix**: Page should redirect automatically, if not try refresh
- **Check**: Browser console for errors (F12 → Console tab)

### Form alerts disappear too quickly
- **Success** alerts auto-dismiss after 3 seconds (by design)
- **Error** alerts persist until form is corrected

## Password Hashing Verification

Passwords are hashed using **Werkzeug PBKDF2**:
- Plaintext NEVER stored in database
- Password checked via `user.check_password(plain_text)`
- Hashes are salted and cannot be reversed

Verify with:
```bash
python test_auth.py
```
