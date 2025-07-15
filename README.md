# Safety App - Personal Security Application

## Overview
The Safety App is a comprehensive mobile application designed to enhance personal safety through emergency alerts, location tracking, and automatic fall detection. Built with React Native and Expo, this application allows users to quickly send SOS alerts to emergency contacts with their current location and audio recordings in emergency situations.

## Features
- **User Authentication**: Secure login and registration system
- **SOS Alert System**: One-tap emergency alerts with location sharing
- **Drop/Fall Detection**: Automatic detection of potential falls using device accelerometer
- **Audio Recording**: Captures audio during emergencies to provide context
- **Emergency Contacts Management**: Add and manage emergency contacts
- **Alert History**: View past alerts and their status
- **Location Tracking**: Real-time location tracking during emergencies

## Technical Architecture
The application consists of:
- **Frontend**: React Native with Expo framework
- **Backend**: Flask API with MySQL database
- **Authentication**: Custom email/password authentication with OTP verification
- **Storage**: AsyncStorage for local data, MySQL for server-side storage
- **Sensors**: Accelerometer for drop detection, Location services for GPS coordinates
- **Communication**: Email notifications to emergency contacts

## Project Structure

### Frontend Components
- **Authentication Screens**: Login and registration interfaces
- **Home Screen**: Main SOS trigger and drop detection controls
- **Contacts Management**: Add and manage emergency contacts
- **Alerts History**: View past alerts and their status

### Backend Services
- **User Management**: Registration, authentication, and profile management
- **SOS Processing**: Handle emergency alerts and notifications
- **Contact Management**: Store and retrieve emergency contacts
- **Alert History**: Track and manage alert history

## Installation and Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure backend connection in `app/(tabs)/index.tsx`
4. Start the development server: `npm run dev`
5. Run the backend server: `python backend/app.py`

## Dependencies
- React Native
- Expo
- Flask
- MySQL
- Various Expo modules (Location, Sensors, Audio, etc.)

## Contributors
- Mohammad Aateef Khan

## License
This project is proprietary and confidential.