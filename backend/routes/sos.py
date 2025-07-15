from flask import request, jsonify
import mysql.connector
import traceback
from . import sos_bp
from database import get_db_connection
from utils import send_sos_email
from config import logger

@sos_bp.route('/sos', methods=['POST'])
def trigger_sos():
    try:
        data = request.json
        logger.info(f"SOS request received: {data}")
        
        user_id = data.get('user_id')
        location = data.get('location')
        emergency_contacts = data.get('emergency_contacts', [])
        alert_type = data.get('alert_type', 'manual')  
        
        if not user_id:
            return jsonify({'success': False, 'message': 'User ID is required'}), 400
            
        if not location:
            return jsonify({'success': False, 'message': 'Location data is required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
            
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT name, email, phone FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        if not emergency_contacts:
            logger.info("No emergency contacts provided in request, fetching from database")
            cursor.execute(
                "SELECT name, phone, email FROM emergency_contacts WHERE user_id = %s",
                (user_id,)
            )
            emergency_contacts = cursor.fetchall()
            
            if not emergency_contacts:
                logger.warning(f"No emergency contacts found for user {user_id}")
                
                emergency_contacts = [{
                    'name': user['name'],
                    'phone': user['phone'] or '',
                    'email': user['email'] or ''
                }]
        
        try:
            cursor.execute(
                "INSERT INTO sos_events (user_id, latitude, longitude, alert_type) VALUES (%s, %s, %s, %s)",
                (user_id, location.get('latitude'), location.get('longitude'), alert_type)
            )
        except mysql.connector.Error as err:
            if err.errno == 1054:  
                logger.warning("alert_type column doesn't exist in sos_events table. Adding it now.")
                cursor.execute("ALTER TABLE sos_events ADD COLUMN alert_type VARCHAR(20) DEFAULT 'manual'")
                conn.commit()
                
                cursor.execute(
                    "INSERT INTO sos_events (user_id, latitude, longitude, alert_type) VALUES (%s, %s, %s, %s)",
                    (user_id, location.get('latitude'), location.get('longitude'), alert_type)
                )
            else:
                raise
        
        sos_id = cursor.lastrowid
        conn.commit()
        
        alerts_sent = 0
        emails_sent = 0
        
        logger.info(f"Emergency contacts: {emergency_contacts}")
        
        for contact in emergency_contacts:
            cursor.execute(
                "INSERT INTO sos_alerts (sos_id, contact_name, contact_phone) VALUES (%s, %s, %s)",
                (sos_id, contact['name'], contact.get('phone', ''))
            )
            alerts_sent += 1
            
            contact_email = contact.get('email')
            if contact_email:
                logger.info(f"Attempting to send SOS email to {contact_email}")
                if send_sos_email(user['name'], user['email'], contact['name'], contact_email, location):
                    emails_sent += 1
                    logger.info(f"Successfully sent SOS email to {contact_email}")
                else:
                    logger.error(f"Failed to send SOS email to {contact_email}")
        
        conn.commit()
        
        return jsonify({
            'success': True, 
            'message': f'SOS triggered successfully. Alerts sent to {alerts_sent} contacts, {emails_sent} emails sent.',
            'emailsSent': emails_sent
        }), 200
        
    except Exception as e:
        logger.error(f"SOS error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Failed to trigger SOS: {str(e)}'}), 500
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

@sos_bp.route('/alerts/history', methods=['GET'])
def get_alert_history():
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'message': 'User ID is required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
            
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT sa.id, se.id as sos_id, sa.contact_name, sa.contact_phone, 
                   u.name as sender_name, se.latitude, se.longitude, 
                   sa.created_at, se.alert_type as type,
                   CASE WHEN sa.resolved = TRUE THEN 'resolved' ELSE 'active' END as status
            FROM sos_alerts sa
            JOIN sos_events se ON sa.sos_id = se.id
            JOIN users u ON se.user_id = u.id
            WHERE sa.contact_phone IN (
                SELECT phone FROM users WHERE id = %s
            )
            ORDER BY sa.created_at DESC
        """, (user_id,))
        
        alerts = cursor.fetchall()
        
        for alert in alerts:
            if 'created_at' in alert and alert['created_at']:
                alert['created_at'] = alert['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        
        return jsonify({
            'success': True,
            'alerts': alerts
        }), 200
        
    except Exception as e:
        logger.error(f"Get alert history error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Failed to get alert history: {str(e)}'}), 500
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

@sos_bp.route('/alerts/resolve', methods=['POST'])
def resolve_alert():
    try:
        data = request.json
        alert_id = data.get('alert_id')
        
        if not alert_id:
            return jsonify({'success': False, 'message': 'Alert ID is required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
            
        cursor = conn.cursor()
        
        try:
            cursor.execute("UPDATE sos_alerts SET resolved = TRUE WHERE id = %s", (alert_id,))
        except mysql.connector.Error as err:
            if err.errno == 1054:  
                logger.warning("resolved column doesn't exist in sos_alerts table. Adding it now.")
                cursor.execute("ALTER TABLE sos_alerts ADD COLUMN resolved BOOLEAN DEFAULT FALSE")
                conn.commit()
                
                cursor.execute("UPDATE sos_alerts SET resolved = TRUE WHERE id = %s", (alert_id,))
            else:
                raise
        
        if cursor.rowcount == 0:
            return jsonify({'success': False, 'message': 'Alert not found'}), 404
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Alert resolved successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Resolve alert error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Failed to resolve alert: {str(e)}'}), 500
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()