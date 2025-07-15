import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ActivityIndicator, Switch } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { TriangleAlert as AlertTriangle, MapPin, Shield } from 'lucide-react-native';
import axios from 'axios';
import { Accelerometer } from 'expo-sensors';
import { Audio } from 'expo-av';

const API_URL = 'http://192.168.1.3:5000/api'; 


const DROP_THRESHOLD = 2.5;

export default function Home() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [user, setUser] = useState(null);
  // Add this with your other state variables
  const [recording, setRecording] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [emergencyContacts, setEmergencyContacts] = useState<Contact[]>([]);
  const [contactCount, setContactCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sosSending, setSosSending] = useState(false);
  const [dropDetectionEnabled, setDropDetectionEnabled] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const lastAcceleration = useRef({ x: 0, y: 0, z: 0 });
  const dropDetected = useRef(false);
  const dropTimeout = useRef(null);

  useEffect(() => {
    checkAuth();
    requestLocationPermission();
    loadEmergencyContacts();
    loadDropDetectionSetting();
    
    return () => {
      unsubscribeAccelerometer();
    };
  }, []);

  useEffect(() => {
    if (dropDetectionEnabled) {
      subscribeAccelerometer();
    } else {
      unsubscribeAccelerometer();
    }
    
 
    saveDropDetectionSetting();
  }, [dropDetectionEnabled]);


  useEffect(() => {
    if (!dropDetectionEnabled) return;
    
    const { x, y, z } = accelerometerData;
    const acceleration = Math.sqrt(x * x + y * y + z * z);
    const delta = Math.abs(acceleration - Math.sqrt(
      lastAcceleration.current.x * lastAcceleration.current.x + 
      lastAcceleration.current.y * lastAcceleration.current.y + 
      lastAcceleration.current.z * lastAcceleration.current.z
    ));
    
 
    lastAcceleration.current = { x, y, z };
  
    if (delta > DROP_THRESHOLD && !dropDetected.current) {
      dropDetected.current = true;
      console.log(`Drop detected! Delta: ${delta.toFixed(2)}g`);
      
  
      Alert.alert(
        'Drop Detected',
        'SOS will be triggered in 5 seconds. Tap Cancel if this was a false alarm.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              console.log('SOS cancelled by user');
              if (dropTimeout.current) {
                clearTimeout(dropTimeout.current);
                dropTimeout.current = null;
              }
              dropDetected.current = false;
            },
          },
        ],
        { cancelable: true }
      );
      
      dropTimeout.current = setTimeout(() => {
        if (dropDetected.current) {
          console.log('Triggering SOS after drop detection timeout');
     
          sendSOSAlertFromDrop();
        }
        dropDetected.current = false;
        dropTimeout.current = null;
      }, 5000);
    }
  }, [accelerometerData]);

  const sendSOSAlertFromDrop = async () => {

    if (!user) {
      Alert.alert('Error', 'User information not available. Please log in again.');
      return;
    }
  
    if (!location) {
      Alert.alert('Error', 'Location information not available. Please wait or try again.');
      return;
    }
  
    if (emergencyContacts.length === 0) {
      Alert.alert('No Emergency Contacts', 'Please add emergency contacts before using SOS.');
      router.push('/contacts');
      return;
    }

    setSosSending(true);
    try {
 
      const recordingStarted = await startRecording();
      let audioUri = null;
      
      if (recordingStarted) {
   
        await new Promise(resolve => setTimeout(resolve, 10000));
        audioUri = await stopRecording();
        console.log('Drop detection recording completed, URI:', audioUri);
      }
      
      const contactsWithEmail = emergencyContacts.filter(contact => contact.email);
      console.log(`Drop detection SOS: Found ${contactsWithEmail.length} contacts with email addresses`);
      
      await sendSOSRequest(audioUri);
      
      const emailsSent = contactsWithEmail.length;
      const totalContacts = emergencyContacts.length;
      
      Alert.alert(
        'Drop Detection SOS Sent',
        `Your emergency alert has been automatically sent to ${totalContacts} contacts due to drop detection.\n${emailsSent} email notifications were sent${audioUri ? ' with audio recording' : ''}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('SOS error:', error);
      Alert.alert('Error', 'Failed to send SOS alert. Please try again.');
      setSosSending(false);
    }
  };

  const loadDropDetectionSetting = async () => {
    try {
      const setting = await AsyncStorage.getItem('dropDetectionEnabled');
      if (setting !== null) {
        setDropDetectionEnabled(setting === 'true');
      }
    } catch (error) {
      console.error('Error loading drop detection setting:', error);
    }
  };

  const saveDropDetectionSetting = async () => {
    try {
      await AsyncStorage.setItem('dropDetectionEnabled', dropDetectionEnabled.toString());
    } catch (error) {
      console.error('Error saving drop detection setting:', error);
    }
  };

  const subscribeAccelerometer = () => {
    Accelerometer.setUpdateInterval(500); // Update every 500ms
    const subscription = Accelerometer.addListener(data => {
      setAccelerometerData(data);
    });
    setSubscription(subscription);
  };

  const unsubscribeAccelerometer = () => {
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }
  };

  const checkAuth = async () => {
    try {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      if (!isLoggedIn) {
        router.replace('/login');
        return;
      }
      
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.replace('/login');
    }
  };

  const loadEmergencyContacts = async () => {
      try {
        const savedContacts = await AsyncStorage.getItem('emergencyContacts');
        if (savedContacts) {
          const contacts = JSON.parse(savedContacts);
          setEmergencyContacts(contacts);
          setContactCount(contacts.length);
          
          // Check if contacts have valid emails
          setTimeout(() => {
            if (contacts.length > 0 && !verifyEmergencyContactEmails(contacts)) {
              Alert.alert(
                'Email Alert Warning',
                'None of your emergency contacts have valid email addresses. They will not receive email alerts during an emergency.',
                [{ text: 'Add Emails', onPress: () => router.push('/contacts') }, 
                 { text: 'Later', style: 'cancel' }]
              );
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Error loading emergency contacts:', error);
      }
    };

  const requestLocationPermission = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    } catch (error) {
      console.error('Location error:', error);
      setErrorMsg('Failed to get location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const triggerSOS = async () => {
    if (!user) {
      Alert.alert('Error', 'User information not available. Please log in again.');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Location information not available. Please wait or try again.');
      return;
    }

    if (emergencyContacts.length === 0) {
      Alert.alert('No Emergency Contacts', 'Please add emergency contacts before using SOS.');
      router.push('/contacts');
      return;
    }

    // Confirm SOS trigger
    Alert.alert(
      'Confirm SOS',
      'Are you sure you want to send an emergency alert to all your contacts?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: sendSOSAlert,
        },
      ]
    );
  };

  const startRecording = async () => {
    try {
  
      if (recording) {
        console.log('Recording already in progress');
        return false;
      }
      
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant microphone permissions to use this feature');
        return false;
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      console.log('Starting recording...');
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();
      setRecording(newRecording);
      console.log('Recording started');
      return true;
    } catch (err) {
      console.error('Recording setup error:', err);
      // Make sure to clean up if there's an error
      if (recording) {
        setRecording(null);
      }
      return false;
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording...');
    if (!recording) {
      console.log('No active recording to stop');
      return null;
    }
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('Recording stopped and stored at', uri);
      // Clean up
      setRecording(null);
      return uri;
    } catch (err) {
      console.error('Error stopping recording:', err);
      // Still clean up even if there's an error
      setRecording(null);
      return null;
    }
  };

  const sendSOSAlert = async () => {
    setSosSending(true);
    try {
    
      const recordingStarted = await startRecording();
      let audioUri = null;
      
      if (recordingStarted) {
  
        await new Promise(resolve => setTimeout(resolve, 15000));
    
        audioUri = await stopRecording();
        console.log('Recording completed, URI:', audioUri);
     
        setAudioUri(audioUri);
      } else {
        console.log('Recording could not be started, continuing with SOS without audio');
      }
  
     
      const contactsWithEmail = emergencyContacts.filter(contact => contact.email);
      const contactsWithoutEmail = emergencyContacts.filter(contact => !contact.email);
      
      if (contactsWithoutEmail.length > 0 && contactsWithEmail.length === 0) {
        Alert.alert(
          'Warning',
          'None of your emergency contacts have email addresses. They will not receive email alerts.',
          [{ text: 'Continue Anyway', onPress: () => sendSOSRequest(audioUri) }, 
           { text: 'Cancel', style: 'cancel', onPress: () => setSosSending(false) }]
        );
      } else {
        await sendSOSRequest(audioUri);
      }
    } catch (error) {
      console.error('SOS error:', error);
      Alert.alert('Error', 'Failed to send SOS alert. Please try again.');
      setSosSending(false);
    }
  };

  const sendSOSRequest = async (audioUri = null) => {
    try {
      const formattedContacts = emergencyContacts.map(contact => ({
        name: contact.name,
        phone: contact.phone,
        email: contact.email || '' 
      }));
      
      const emailAddresses = formattedContacts
        .filter(c => c.email && c.email.includes('@'))
        .map(c => c.email);
      
      console.log('Valid email addresses being sent:', emailAddresses);
      
      const alertType = dropDetected.current ? 'drop' : 'manual';
      
      const userData = user || {};
      const userEmail = userData.email || '';
      
      let requestData;
      
      if (audioUri) {
        console.log('Preparing to send audio recording:', audioUri);
        const formData = new FormData();
        
        formData.append('audio_recording', {
          uri: Platform.OS === 'ios' ? audioUri.replace('file://', '') : audioUri,
          type: 'audio/m4a',
          name: 'sos_recording.m4a'
        });
        
        formData.append('user_id', user.id.toString());
        formData.append('user_email', userEmail);
        formData.append('user_name', userData.name || 'User');
        formData.append('latitude', location.coords.latitude.toString());
        formData.append('longitude', location.coords.longitude.toString());
        formData.append('emergency_contacts', JSON.stringify(formattedContacts));
        formData.append('alert_type', alertType);
        formData.append('send_email', 'true');
        
        requestData = formData;
        
        console.log('Sending SOS request with audio recording and data');
      } else {
        console.log('Sending SOS request with data:', {
          user_id: user.id,
          user_email: userEmail,
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          emergency_contacts: formattedContacts,
          alert_type: alertType
        });
        
        requestData = {
          user_id: user.id,
          user_email: userEmail,
          user_name: userData.name || 'User',
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          emergency_contacts: formattedContacts,
          alert_type: alertType,
          send_email: true
        };
      }
      
      console.log(`Sending request to: ${API_URL}/sos`);
      
      const requestConfig = audioUri ? {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      } : {};
      
      const response = await axios.post(`${API_URL}/sos`, requestData, requestConfig);
  
      console.log('SOS response:', response.data);
      
      if (response.data.success) {
        if (!dropDetected.current) {
          const emailsSent = response.data.emailsSent || 0;
          const totalContacts = emergencyContacts.length;
          
          Alert.alert(
            'SOS Sent',
            `Your emergency alert has been sent to ${totalContacts} contacts.\n${emailsSent} email notifications were sent${audioUri ? ' with audio recording' : ''}.\n\nPlease check your spam/junk folders if you don't see the email.`,
            [{ text: 'OK' }]
          );
        }
        return response.data.emailsSent || 0;
      } else {
        Alert.alert('Error', response.data.message || 'Failed to send SOS alert.');
        return 0;
      }
    } catch (error) {
      console.error('SOS request error:', error);
      
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        Alert.alert('Server Error', `Error code: ${error.response.status}. ${error.response.data?.message || 'Please try again.'}`);
      } else if (error.request) {
        console.error('Error request:', error.request);
        Alert.alert('Network Error', 'No response from server. Check your internet connection and server status.');
      } else {
        Alert.alert('Error', 'Failed to send SOS alert. Please try again.');
      }
      return 0;
    }
    finally {
      setSosSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Shield size={32} color="#FF3B30" />
        <Text style={styles.title}>Personal Security</Text>
      </View>

      <View style={styles.locationContainer}>
        <MapPin size={24} color="#666" />
        <Text style={styles.locationText}>
          {loading ? 'Getting location...' : 
           location ? 'Location tracking active' : 'Requesting location...'}
        </Text>
      </View>

      {errorMsg && (
        <View style={styles.errorContainer}>
          <AlertTriangle size={24} color="#FF3B30" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.sosButton, sosSending && styles.sosButtonDisabled]} 
        onPress={triggerSOS}
        disabled={sosSending}
      >
        {sosSending ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <>
            <Text style={styles.sosButtonText}>SOS</Text>
            <Text style={styles.sosButtonSubtext}>Press for Emergency</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.dropDetectionContainer}>
        <Text style={styles.dropDetectionText}>Drop Detection</Text>
        <Switch
          value={dropDetectionEnabled}
          onValueChange={setDropDetectionEnabled}
          trackColor={{ false: '#767577', true: '#ffcccc' }}
          thumbColor={dropDetectionEnabled ? '#FF3B30' : '#f4f3f4'}
        />
      </View>
      <Text style={styles.dropDetectionDescription}>
        When enabled, SOS will be triggered automatically if your phone is dropped
      </Text>

      <TouchableOpacity 
        style={styles.testEmailButton}
        onPress={testEmailDelivery}
      >
        <Text style={styles.testEmailText}>Test Email Delivery</Text>
      </TouchableOpacity>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{contactCount}</Text>
          <Text style={styles.statLabel}>Emergency Contacts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>24/7</Text>
          <Text style={styles.statLabel}>Active Monitoring</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 50 : 30,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginLeft: 10,
    color: '#333',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  locationText: {
    marginLeft: 10,
    fontFamily: 'Inter-Regular',
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    marginLeft: 10,
    fontFamily: 'Inter-Regular',
    color: '#FF3B30',
    fontSize: 16,
  },
  sosButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 100,
    width: 200,
    height: 200,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
    elevation: 5,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sosButtonDisabled: {
    backgroundColor: '#ff8c86',
  },
  sosButtonText: {
    color: '#fff',
    fontSize: 48,
    fontFamily: 'Inter-Bold',
  },
  sosButtonSubtext: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginTop: 5,
  },
  dropDetectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 5,
  },
  dropDetectionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
  },
  dropDetectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  statCard: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
});

// Add this function that was referenced but missing
const verifyEmergencyContactEmails = (contacts) => {
  if (!contacts || contacts.length === 0) {
    return false;
  }
  
  const contactsWithValidEmail = contacts.filter(
    contact => contact.email && contact.email.includes('@') && contact.email.includes('.')
  );
  
  console.log(`Verified contacts: ${contactsWithValidEmail.length} out of ${contacts.length} have valid emails`);
  console.log('Email addresses:', contactsWithValidEmail.map(c => c.email).join(', '));
  
  return contactsWithValidEmail.length > 0;
};

// Add this function after verifyEmergencyContactEmails
  const testEmailDelivery = async () => {
    if (!user) {
      Alert.alert('Error', 'User information not available');
      return;
    }
    
    try {
      const testEmail = user.email; // Use the user's own email for testing
      
      if (!testEmail || !testEmail.includes('@')) {
        Alert.alert('Invalid Email', 'Your account does not have a valid email address');
        return;
      }
      
      Alert.alert(
        'Test Email',
        `Would you like to send a test email to ${testEmail}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Send Test', 
            onPress: async () => {
              try {
                setSosSending(true);
                console.log(`Sending test email to: ${testEmail}`);
                
                const response = await axios.post(`${API_URL}/test-email`, {
                  user_id: user.id,
                  email: testEmail,
                  name: user.name || 'User',
                  subject: 'Personal Security App - Test Email',
                  message: 'This is a test email from your Personal Security App to verify email delivery is working correctly.'
                });
                
                console.log('Test email response:', response.data);
                
                if (response.data.success) {
                  Alert.alert(
                    'Test Email Sent',
                    'A test email has been sent. Please check your inbox and spam folders. If you still don\'t receive it, there might be an issue with the email server configuration.'
                  );
                } else {
                  Alert.alert('Error', response.data.message || 'Failed to send test email');
                }
              } catch (error) {
                console.error('Test email error:', error);
                if (error.response) {
                  console.error('Error response data:', error.response.data);
                  console.error('Error response status:', error.response.status);
                  Alert.alert('Server Error', `Error code: ${error.response.status}. ${error.response.data?.message || 'Please try again.'}`);
                } else if (error.request) {
                  console.error('Error request:', error.request);
                  Alert.alert('Network Error', 'No response from server. Check your internet connection and server status.');
                } else {
                  Alert.alert('Error', 'Failed to send test email. Check server logs for details.');
                }
              } finally {
                setSosSending(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Test email setup error:', error);
      Alert.alert('Error', 'Failed to set up test email');
    }
  };
