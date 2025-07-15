from flask import Blueprint

# Create blueprints for different route categories
auth_bp = Blueprint('auth', __name__)
emergency_bp = Blueprint('emergency', __name__)
sos_bp = Blueprint('sos', __name__)
utils_bp = Blueprint('utils', __name__)

# Import routes to register them with blueprints
from . import auth, emergency, sos, utils

def register_routes(app):
    """Register all route blueprints with the Flask app"""
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(emergency_bp, url_prefix='/api')
    app.register_blueprint(sos_bp, url_prefix='/api')
    app.register_blueprint(utils_bp, url_prefix='/api')