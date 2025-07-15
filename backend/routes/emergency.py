from flask import request, jsonify
import traceback
from . import emergency_bp
from database import get_db_connection
from config import logger

@emergency_bp.route('/emergency-contacts', methods=['GET'])
def get_emergency_contacts():
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'message': 'User ID is required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
            
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT id, name, phone, email, created_at FROM emergency_contacts WHERE user_id = %s ORDER BY name",
            (user_id,)
        )
        
        contacts = cursor.fetchall()
        
        for contact in contacts:
            if 'created_at' in contact and contact['created_at']:
                contact['created_at'] = contact['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        
        return jsonify({
            'success': True,
            'contacts': contacts
        }), 200
        
    except Exception as e:
        logger.error(f"Get emergency contacts error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Failed to get emergency contacts: {str(e)}'}), 500
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

@emergency_bp.route('/emergency-contacts', methods=['POST'])
def add_emergency_contact():
    try:
        data = request.json
        user_id = data.get('user_id')
        name = data.get('name')
        phone = data.get('phone')
        email = data.get('email')
        
        if not user_id or not name:
            return jsonify({'success': False, 'message': 'User ID and name are required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
            
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO emergency_contacts (user_id, name, phone, email) VALUES (%s, %s, %s, %s)",
            (user_id, name, phone, email)
        )
        
        contact_id = cursor.lastrowid
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Emergency contact added successfully',
            'contact_id': contact_id
        }), 201
        
    except Exception as e:
        logger.error(f"Add emergency contact error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Failed to add emergency contact: {str(e)}'}), 500
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

@emergency_bp.route('/emergency-contacts/<int:contact_id>', methods=['DELETE'])
def delete_emergency_contact(contact_id):
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'message': 'User ID is required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
            
        cursor = conn.cursor()
        
        cursor.execute(
            "DELETE FROM emergency_contacts WHERE id = %s AND user_id = %s",
            (contact_id, user_id)
        )
        
        if cursor.rowcount == 0:
            return jsonify({'success': False, 'message': 'Contact not found or not authorized to delete'}), 404
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Emergency contact deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Delete emergency contact error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Failed to delete emergency contact: {str(e)}'}), 500
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

@emergency_bp.route('/emergency-contacts/count', methods=['GET'])
def get_emergency_contacts_count():
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'message': 'User ID is required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
            
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT COUNT(*) FROM emergency_contacts WHERE user_id = %s",
            (user_id,)
        )
        
        count = cursor.fetchone()[0]
        
        return jsonify({
            'success': True,
            'count': count
        }), 200
        
    except Exception as e:
        logger.error(f"Get emergency contacts count error: {str(e)}")
        return jsonify({'success': False, 'message': f'Failed to get count: {str(e)}'}), 500
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()