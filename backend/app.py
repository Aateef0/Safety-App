from flask import Flask
from flask_cors import CORS
import logging

# Import configuration and database initialization
from config import logger
from database import init_db, init_sos_tables, init_emergency_contacts_table
from routes import register_routes

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize database tables
if not init_db():
    logger.error("Failed to initialize database. Check your database configuration.")
    
init_sos_tables()
init_emergency_contacts_table()

# Register all routes
register_routes(app)

# Run the app
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)