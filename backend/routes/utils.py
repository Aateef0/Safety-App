from flask import request, jsonify
import traceback
from . import utils_bp
from database import get_db_connection
from utils import send_verification_email
from config import logger, EMAIL_USER

@utils_bp.route('/test-db', methods=['GET'])
def test_db():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
            
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        
        return jsonify({
            'success': True, 
            'message': 'Database connection successful',
            'result': result
        }), 200
        
    except Exception as e:
        logger.error(f"Test DB error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Test failed: {str(e)}'}), 500
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

@utils_bp.route('/test-email', methods=['POST'])
def test_email():
    try:
        data = request.json
        email = data.get('email')
        
        if not email:
            return jsonify({'success': False, 'message': 'Email is required'}), 400
            
        code = "123456"  # Test code
        
        email_sent = send_verification_email(email, code)
        
        if email_sent:
            return jsonify({
                'success': True, 
                'message': f'Test email sent successfully to {email}',
                'sender': EMAIL_USER
            }), 200
        else:
            return jsonify({'success': False, 'message': 'Failed to send test email'}), 500
        
    except Exception as e:
        logger.error(f"Test email error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Test failed: {str(e)}'}), 500