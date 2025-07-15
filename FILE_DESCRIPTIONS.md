# Safety App - Detailed File Descriptions

## Frontend Files

### 1. `app/_layout.tsx`
This file serves as the root layout component for the entire application. It handles font loading using Google Fonts (Inter family), manages the splash screen display during initial loading, and sets up the main navigation structure with Stack navigation. The file defines two main navigation stacks - one for authentication screens and another for the main application tabs. It also configures the status bar appearance for the application. This component is crucial as it's the first component rendered when the app starts.

### 2. `app/(auth)/login.tsx`
The login screen component handles user authentication by providing a form for email and password input. It includes client-side validation for email format, makes API requests to the backend for authentication, and stores user session data in AsyncStorage upon successful login. The component features a clean UI with icon integration from Lucide React Native, loading indicators during authentication, and error handling for failed login attempts. It also provides navigation to the registration screen for new users.

### 3. `app/(auth)/register.tsx`
This file implements the user registration functionality with a multi-step process including form input and OTP verification. It collects user information (name, email, phone, password), performs comprehensive validation including email format and password matching, and communicates with the backend for account creation. The component includes a separate OTP verification screen that appears after initial registration to verify the user's email address. It features proper error handling and loading states to provide feedback during the registration process.

### 4. `app/(tabs)/_layout.tsx`
This file defines the tab-based navigation structure for the main application screens. It configures the bottom tab bar appearance including colors, icons, and labels for each tab. The component sets up four main tabs: Home (main SOS screen), Contacts (emergency contacts management), Alerts (alert history), and Settings (user preferences). Each tab is associated with a specific icon from Lucide React Native and has customized appearance for active and inactive states.

### 5. `app/(tabs)/index.tsx`
The home screen is the central component of the application, handling the core SOS functionality and fall detection. It manages multiple states including user location, emergency contacts, and accelerometer data. The file implements several key features: manual SOS triggering with confirmation, automatic fall detection using accelerometer data, and communication with the backend to send alerts. It also handles permission requests for location and provides visual feedback during the SOS process.

### 6. `app/(tabs)/contacts.tsx`
This component manages the user's emergency contacts, allowing them to add, view, and delete contacts who will receive SOS alerts. It interfaces with the device's contact list using Expo Contacts, provides search functionality to filter contacts, and validates contact information including email addresses. The file implements a modal interface for adding new contacts, displays the current list of emergency contacts with delete options, and synchronizes contact data with both local storage and the backend server to ensure persistence across sessions.

### 7. `app/(tabs)/alerts.tsx`
The alerts screen displays the history of SOS alerts triggered by the user, showing both active and resolved alerts. It fetches alert data from the backend, calculates relative time for each alert (e.g., "2 hours ago"), and allows users to view alert details including location. The component provides functionality to resolve active alerts, open location coordinates in map applications, and refresh the alert list. It implements proper loading states and error handling for network requests.

### 8. `app/+not-found.tsx`
This file provides a fallback screen that is displayed when users navigate to a route that doesn't exist in the application. It shows a simple error message indicating that the screen doesn't exist and provides a link to return to the home screen. The component uses the Stack navigation component to set a custom header title and implements basic styling for the error message and navigation link.

## Backend Files

### 9. `backend/app.py`
This is the main backend server file implemented using Flask. It handles all API endpoints for the application including user authentication, emergency contact management, SOS alert processing, and alert history. The file establishes database connections using MySQL, implements email sending functionality for notifications, and processes incoming data including location coordinates and audio recordings. It includes comprehensive error handling, logging, and security measures such as password hashing and input validation.

### 10. `backend/clear_users.py`
A utility script designed for development and testing purposes that provides functionality to clear user data from the database. It connects to the MySQL database using the same configuration as the main application, executes SQL queries to delete user records, and includes proper error handling and logging. This script is particularly useful during development to reset the database to a clean state for testing registration and authentication flows.

## Configuration Files

### 11. `app.json`
The Expo configuration file that defines various application settings including name, version, orientation, and plugin configurations. It specifies the app's display name as "Safety App", configures platform-specific settings for iOS and Android, and sets up required plugins including location services, sensors, audio recording, and contacts. This file is essential for the Expo build process and determines how the app behaves on different platforms.

### 12. `package.json`
This file lists all npm dependencies and scripts for the project. It includes React Native core dependencies, Expo modules (location, sensors, audio, contacts), UI libraries, and development tools. The file defines various scripts for development, building, and running the application on different platforms. It serves as the central configuration for the Node.js ecosystem and package management for the project.

### 13. `tsconfig.json`
The TypeScript configuration file that specifies compiler options and included files for the project. It extends the base Expo TypeScript configuration, enables strict type checking, configures path aliases for imports, and specifies which file types should be included in the compilation process. This file ensures type safety throughout the application and provides better developer experience through TypeScript's features.

### 14. `eas.json`
The Expo Application Services configuration file that defines build profiles for different environments (development, preview, production). It specifies build types for Android (APK vs. app bundle), distribution methods, and minimum CLI version requirements. This file is used when building the application for distribution through Expo's build service.

### 15. `.prettierrc`
A configuration file for the Prettier code formatter that defines code style preferences for the project. It specifies formatting rules such as tab width, quote style, and bracket spacing to ensure consistent code formatting across the project. This helps maintain code quality and readability throughout the codebase.

### 16. `.gitignore`
This file specifies which files and directories should be excluded from version control. It includes standard patterns for Node.js projects (node_modules), Expo-specific directories (.expo, dist, web-build), build artifacts, environment files, and platform-specific files. This ensures that only necessary source code is committed to the repository while excluding generated files, dependencies, and sensitive information.