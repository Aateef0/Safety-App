import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import traceback
from config import logger, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD

def generate_verification_code():
    return str(random.randint(100000, 999999))

def send_verification_email(email, code):
    try:
        logger.info(f"Verification code for {email}: {code}")
        
        msg = MIMEText(f'Your verification code is: {code}')
        msg['Subject'] = 'Security App - Email Verification'
        msg['From'] = EMAIL_USER
        msg['To'] = email
        
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Email sent successfully to {email}")
        return True
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def send_sos_email(user_name, user_email, contact_name, contact_email, location):
    try:
        logger.info(f"Preparing to send SOS email from {EMAIL_USER} to {contact_email}")
        
        if not EMAIL_USER or EMAIL_USER == 'your-email@gmail.com' or not EMAIL_PASSWORD or EMAIL_PASSWORD == 'your-app-password':
            logger.error("Email configuration is missing or using default values. Check your .env file.")
            return False
            
        if not contact_email or '@' not in contact_email:
            logger.error(f"Invalid recipient email: {contact_email}")
            return False
        
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = contact_email
        msg['Subject'] = f"EMERGENCY SOS ALERT from {user_name}"
        
        maps_link = f"https://www.google.com/maps?q={location['latitude']},{location['longitude']}"
        
        body = f"""
        EMERGENCY ALERT
        
        {user_name} has triggered an SOS alert and needs immediate help!
        
        Their current location: {maps_link}
        
        This is an automated message from the Personal Security App.
        Please try to contact {user_name} immediately or alert emergency services.
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        logger.info(f"Connecting to email server {EMAIL_HOST}:{EMAIL_PORT}")
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        
        logger.info(f"Logging in with user {EMAIL_USER}")
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        
        logger.info(f"Sending email to {contact_email}")
        text = msg.as_string()
        server.sendmail(EMAIL_USER, contact_email, text)
        server.quit()
        
        logger.info(f"SOS email sent successfully to {contact_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send SOS email: {str(e)}")
        logger.error(traceback.format_exc())
        return False