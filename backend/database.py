import mysql.connector
import traceback
from config import db_config, logger

def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        return None

def init_db():
    try:
        conn = get_db_connection()
        if not conn:
            logger.error("Failed to connect to database during initialization")
            return False
            
        cursor = conn.cursor()
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            phone VARCHAR(20) UNIQUE,
            password VARCHAR(255) NOT NULL,
            is_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS verification_codes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(100) NOT NULL,
            code VARCHAR(6) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Database initialization error: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def init_sos_tables():
    try:
        conn = get_db_connection()
        if not conn:
            logger.error("Failed to connect to database during SOS tables initialization")
            return False
            
        cursor = conn.cursor()
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS sos_events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            latitude DECIMAL(10, 8) NOT NULL,
            longitude DECIMAL(11, 8) NOT NULL,
            alert_type VARCHAR(20) DEFAULT 'manual',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        ''')
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS sos_alerts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sos_id INT NOT NULL,
            contact_name VARCHAR(100) NOT NULL,
            contact_phone VARCHAR(20),
            resolved BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sos_id) REFERENCES sos_events(id)
        )
        ''')
        
        try:
            cursor.execute("SELECT alert_type FROM sos_events LIMIT 1")
        except mysql.connector.Error as err:
            if err.errno == 1054:  
                logger.warning("alert_type column doesn't exist in sos_events table. Adding it now.")
                cursor.execute("ALTER TABLE sos_events ADD COLUMN alert_type VARCHAR(20) DEFAULT 'manual'")
                logger.info("Added alert_type column to sos_events table")
        
        try:
            cursor.execute("SELECT resolved FROM sos_alerts LIMIT 1")
        except mysql.connector.Error as err:
            if err.errno == 1054:  
                logger.warning("resolved column doesn't exist in sos_alerts table. Adding it now.")
                cursor.execute("ALTER TABLE sos_alerts ADD COLUMN resolved BOOLEAN DEFAULT FALSE")
                logger.info("Added resolved column to sos_alerts table")
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"SOS tables initialization error: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def init_emergency_contacts_table():
    try:
        conn = get_db_connection()
        if not conn:
            logger.error("Failed to connect to database during emergency contacts table initialization")
            return False
            
        cursor = conn.cursor()
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS emergency_contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            phone VARCHAR(20),
            email VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        ''')
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Emergency contacts table initialization error: {str(e)}")
        logger.error(traceback.format_exc())
        return False