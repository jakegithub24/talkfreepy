from flask_login import LoginManager

login_manager = LoginManager()
login_manager.login_view = 'main.landing'

@login_manager.user_loader
def load_user(user_id):
    try:
        from .models import User
        return User.query.get(int(user_id))
    except Exception:
        return None

@login_manager.unauthorized_handler
def _unauthorized():
    # Simple unauthorized handler; can be expanded to return JSON for APIs
    from flask import redirect, url_for
    return redirect(url_for('main.landing'))
