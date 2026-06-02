from flask import Flask
from .conn import db, socketio
from .auth import login_manager


def create_app(config=None):
    app = Flask(__name__, static_folder='../static', template_folder='../templates')
    app.config.from_mapping({
        'SECRET_KEY': 'dev-secret',
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///rework_talkfreepy.db',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
    })
    if config:
        app.config.update(config)

    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins='*')
    login_manager.init_app(app)

    # Register blueprints later
    from .routes import bp as main_bp
    app.register_blueprint(main_bp)

    from .middlewares import register_middlewares
    register_middlewares(app)

    return app
