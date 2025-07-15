from flask import request, jsonify
import mysql.connector
import traceback
from . import auth_bp
from database import get_db_connection
from utils import generate_verification_code, send_verification_email
from config import logger

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        logger.info(f"Registration request received: {data}")
        
        name = data.get('name')
        email = data.get('email')
        phone = data.get('phone')
        password = data.get('password')
        
        if not all([name, email, password]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
            
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({'success': False, 'message': 'Email already registered'}), 400
        
        if phone:
            try:
                cursor.execute("SELECT * FROM users WHERE phone = %s", (phone,))
                if cursor.fetchone():
                    return jsonify({'success': False, 'message': 'Phone number already registered'}), 400
            except mysql.connector.Error as err:
                if err.errno == 1054:  
                    logger.warning("Phone column doesn't exist in users table. Skipping phone check.")
                    
                    try:
                        cursor.execute("ALTER TABLE users ADD COLUMN phone VARCHAR(20) UNIQUE")
                        conn.commit()
                        logger.info("Added phone column to users table")
                    except Exception as e:
                        logger.error(f"Failed to add phone column: {str(e)}")
                else:
                    raise
        
        cursor.execute(
            "INSERT INTO users (name, email, phone, password) VALUES (%s, %s, %s, %s)",
            (name, email, phone, password)  
        )
        
        verification_code = generate_verification_code()
        
        cursor.execute(
            "INSERT INTO verification_codes (email, code) VALUES (%s, %s)",
            (email, verification_code)
        )
        
        conn.commit()
        
        email_sent = send_verification_email(email, verification_code)
        
        return jsonify({
            'success': True, 
            'message': 'Registration successful! Please verify your email.',
            'email_sent': email_sent,
            'verification_code': verification_code  
        }), 201
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Registration failed: {str(e)}'}), 500
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    try:
        data = request.json
        email = data.get('email')
        code = data.get('code')
        
        if not all([email, code]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
            
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT * FROM verification_codes WHERE email = %s AND code = %s ORDER BY created_at DESC LIMIT 1",
            (email, code)
        )
        
        verification = cursor.fetchone()
        if not verification:
            return jsonify({'success': False, 'message': 'Invalid verification code'}), 400
        
        try:
            cursor.execute("UPDATE users SET is_verified = TRUE WHERE email = %s", (email,))
        except mysql.connector.Error as err:
            if err.errno == 1054:  
                logger.warning("is_verified column doesn't exist in users table. Adding it now.")
                try:
                    cursor.execute("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE")
                    conn.commit()
                    logger.info("Added is_verified column to users table")
                    
                    cursor.execute("UPDATE users SET is_verified = TRUE WHERE email = %s", (email,))
                except Exception as e:
                    logger.error(f"Failed to add is_verified column: {str(e)}")
                    return jsonify({'success': False, 'message': f'Failed to update user verification status: {str(e)}'}), 500
            else:
                raise
        
        cursor.execute("DELETE FROM verification_codes WHERE email = %s AND code = %s", (email, code))
        
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Email verified successfully!'}), 200
        
    except Exception as e:
        logger.error(f"Verification error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Verification failed: {str(e)}'}), 500
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        logger.info(f"Login request received: {data}")
        
        email = data.get('email')
        password = data.get('password')
        
        if not all([email, password]):
            return jsonify({'success': False, 'message': 'Missing email or password'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
            
        cursor = conn.cursor(dictionary=True)  
        
        cursor.execute("SELECT id, name, email, is_verified FROM users WHERE email = %s AND password = %s", 
                      (email, password))
        
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
        
        if not user.get('is_verified'):
            return jsonify({'success': False, 'message': 'Please verify your email before logging in'}), 403
        
        if 'password' in user:
            del user['password']
        
        return jsonify({
            'success': True, 
            'message': 'Login successful',
            'user': user
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Login failed: {str(e)}'}), 500
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

@auth_bp.route('/users', methods=['GET'])
def get_users():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
            
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT id, name, email, phone FROM users WHERE is_verified = TRUE")
        users = cursor.fetchall()
        
        return jsonify({
            'success': True, 
            'users': users
        }), 200
        
    except Exception as e:
        logger.error(f"Get users error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Failed to get users: {str(e)}'}), 500
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()