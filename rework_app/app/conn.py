from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO

# Singletons to be initialized by create_app
db = SQLAlchemy()
socketio = SocketIO()
