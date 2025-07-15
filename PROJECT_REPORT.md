# Safety App - Comprehensive Project Report

## 1. Introduction

The Safety App is a mobile application designed to provide users with a personal security solution that can be activated in emergency situations. The app allows users to send SOS alerts to their emergency contacts with their current location and audio recordings. It also features automatic fall detection using the device's accelerometer, making it particularly useful for elderly users or those with medical conditions.

## 2. System Architecture

### 2.1 Frontend Architecture
The frontend is built using React Native with Expo, providing a cross-platform solution that works on both iOS and Android devices. The application uses a tab-based navigation system with authentication flows and various screens for different functionalities.

### 2.2 Backend Architecture
The backend is built using Flask, a Python web framework, with MySQL as the database. The backend handles user authentication, stores emergency contacts, processes SOS alerts, and sends email notifications to emergency contacts.

### 2.3 Communication Flow
1. User triggers an SOS alert (manually or via fall detection)
2. App captures location and audio recording
3. Data is sent to the backend server
4. Server processes the alert and stores it in the database
5. Server sends notifications to emergency contacts
6. Emergency contacts receive emails with location link and audio recording

## 3. Key Components

### 3.1 Frontend Components

#### 3.1.1 Authentication System (`app/(auth)/login.tsx` and `app/(auth)/register.tsx`)
The authentication system handles user registration and login. It includes email validation, password confirmation, and secure storage of authentication tokens. The registration process includes OTP verification for added security.

#### 3.1.2 Home Screen (`app/(tabs)/index.tsx`)
The home screen is the main interface where users can trigger SOS alerts. It displays the user's current location status and provides a prominent SOS button. It also includes controls for enabling/disabling fall detection.

#### 3.1.3 Contacts Management (`app/(tabs)/contacts.tsx`)
This screen allows users to manage their emergency contacts. Users can add contacts from their device's contact list or manually enter contact details. The system validates email addresses to ensure notifications can be sent.

#### 3.1.4 Alerts History (`app/(tabs)/alerts.tsx`)
The alerts history screen displays past SOS alerts, their status (active or resolved), and allows users to view details or resolve active alerts.

#### 3.1.5 Navigation System (`app/_layout.tsx` and `app/(tabs)/_layout.tsx`)
The navigation system provides a seamless user experience with tab-based navigation and proper authentication flow handling.

### 3.2 Backend Components

#### 3.2.1 User Management (`backend/app.py` - User Routes)
Handles user registration, authentication, profile management, and password recovery. It includes email verification and secure password storage.

#### 3.2.2 SOS Alert Processing (`backend/app.py` - SOS Routes)
Processes incoming SOS alerts, stores them in the database, and sends notifications to emergency contacts. It handles location data and audio recordings.

#### 3.2.3 Contact Management (`backend/app.py` - Contact Routes)
Manages emergency contacts for users, including adding, updating, and removing contacts.

#### 3.2.4 Alert History Management (`backend/app.py` - Alert Routes)
Tracks and manages alert history, allowing users to view past alerts and resolve active ones.

## 4. Key Features

### 4.1 SOS Alert System
The SOS alert system allows users to quickly send emergency alerts to their contacts. When triggered, it:
- Captures the user's current location
- Records audio for context (15 seconds)
- Sends the data to the server
- Notifies emergency contacts via email with location link and audio recording

### 4.2 Fall Detection
The fall detection system uses the device's accelerometer to detect potential falls. It:
- Continuously monitors acceleration changes
- Detects sudden changes that might indicate a fall
- Shows a countdown alert allowing users to cancel false alarms
- Automatically triggers an SOS alert if not canceled

### 4.3 Audio Recording
The audio recording feature captures ambient sound during emergencies to provide context. It:
- Requests microphone permissions
- Records audio for a set duration (15 seconds for manual SOS, 10 seconds for fall detection)
- Sends the recording to the server for inclusion in emergency notifications

### 4.4 Location Tracking
The location tracking system provides accurate location data during emergencies. It:
- Requests location permissions
- Captures precise GPS coordinates
- Includes the location in SOS alerts
- Provides a map link in emergency notifications

### 4.5 Emergency Contacts Management
The contacts management system allows users to maintain a list of emergency contacts. It:
- Allows adding contacts from the device's contact list
- Supports manual entry of contact details
- Validates email addresses for notification purposes
- Warns users if contacts don't have valid email addresses

## 5. Technical Implementation Details

### 5.1 Authentication Flow
1. User enters credentials (login) or registration details
2. Data is validated client-side
3. Request is sent to the server
4. Server validates credentials or creates a new user
5. Authentication token is returned and stored in AsyncStorage
6. User is redirected to the main application

### 5.2 SOS Alert Flow
1. User triggers SOS (manual button or fall detection)
2. App starts recording audio
3. App captures current location
4. Data is packaged and sent to the server
5. Server processes the alert and stores it
6. Server sends notifications to emergency contacts
7. User receives confirmation of sent alerts

### 5.3 Fall Detection Algorithm
1. Accelerometer data is continuously monitored
2. Sudden changes in acceleration are detected
3. If change exceeds threshold, potential fall is detected
4. User is shown a countdown alert with option to cancel
5. If not canceled, SOS alert is automatically triggered

### 5.4 Data Storage
1. User data and authentication tokens stored in AsyncStorage
2. Emergency contacts stored in AsyncStorage and synced with server
3. Alert history retrieved from server
4. Audio recordings temporarily stored on device before upload

## 6. Security Considerations

### 6.1 Authentication Security
- Passwords are securely hashed before storage
- Authentication tokens used for session management
- OTP verification for registration

### 6.2 Data Privacy
- Location data only captured when needed
- Audio recordings only made during emergencies
- User consent required for all permissions

### 6.3 Permission Management
- Explicit permission requests for location, contacts, and microphone
- Clear explanations of why permissions are needed
- Graceful handling when permissions are denied

## 7. Future Enhancements

### 7.1 Real-time Location Sharing
Implement continuous location sharing during emergencies to provide real-time tracking for emergency contacts.

### 7.2 In-app Communication
Add in-app messaging or calling features to allow direct communication between users and emergency contacts.

### 7.3 Integration with Emergency Services
Integrate with local emergency services APIs to automatically notify police, ambulance, or fire services.

### 7.4 Offline Mode
Implement offline functionality to queue alerts when internet connection is unavailable.

### 7.5 Wearable Integration
Add support for smartwatch integration to enable more convenient SOS triggering and fall detection.

## 8. Conclusion

The Safety App provides a comprehensive personal security solution with features designed to help users in emergency situations. Through its intuitive interface, automatic fall detection, and robust notification system, it offers peace of mind to users and their loved ones. The application demonstrates effective use of mobile device capabilities including sensors, location services, and audio recording to create a practical safety tool.