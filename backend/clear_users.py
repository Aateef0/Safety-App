import mysql.connector
import os
from dotenv import load_dotenv
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Database configuration
db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'security_app')
}

def clear_users():
    conn = None
    cursor = None
    try:
        # Connect to the database
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        # Disable foreign key checks temporarily
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        
        # Delete all SOS alerts first
        try:
            cursor.execute("DELETE FROM sos_alerts")
            logger.info(f"Deleted {cursor.rowcount} SOS alerts")
        except mysql.connector.Error as e:
            logger.warning(f"Error deleting SOS alerts: {str(e)}")
        
        # Delete all SOS events
        try:
            cursor.execute("DELETE FROM sos_events")
            logger.info(f"Deleted {cursor.rowcount} SOS events")
        except mysql.connector.Error as e:
            logger.warning(f"Error deleting SOS events: {str(e)}")
        
        # Delete all verification codes
        cursor.execute("DELETE FROM verification_codes")
        logger.info(f"Deleted {cursor.rowcount} verification codes")
        
        # Delete all users
        cursor.execute("DELETE FROM users")
        logger.info(f"Deleted {cursor.rowcount} users")
        
        # Re-enable foreign key checks
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        
        # Commit the changes
        conn.commit()
        
        print("All users and related data have been cleared from the database.")
        
    except Exception as e:
        logger.error(f"Error clearing users: {str(e)}")
        print(f"Error: {str(e)}")
        
        # Make sure to re-enable foreign key checks even if an error occurs
        if cursor:
            try:
                cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            except:
                pass
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    confirm = input("Are you sure you want to delete ALL users and related data from the database? (yes/no): ")
    if confirm.lower() == 'yes':
        clear_users()
    else:
        print("Operation cancelled.")