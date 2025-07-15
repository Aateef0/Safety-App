import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator, Alert } from 'react-native';
import { Bell, BellOff, Clock, MapPin } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Linking } from 'react-native';


const API_URL = 'http://192.168.1.3:5000i'; 

type Alert = {
  id: string;
  sos_id: string;
  sender_name: string;
  type: string;
  message?: string;
  latitude: number;
  longitude: number;
  created_at: string;
  time_ago: string;
  status: 'active' | 'resolved';
};

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeCount, setActiveCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/alerts/history?user_id=${user.id}`);
      
      if (response.data.success) {
        const alertsData = response.data.alerts.map(alert => ({
          ...alert,
          message: `${alert.sender_name} sent an ${alert.type === 'drop' ? 'automatic drop detection' : 'SOS'} alert`,
          id: alert.id.toString()
        }));
        
        setAlerts(alertsData);
        

        const active = alertsData.filter(alert => alert.status === 'active').length;
        const resolved = alertsData.filter(alert => alert.status === 'resolved').length;
        
        setActiveCount(active);
        setResolvedCount(resolved);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      Alert.alert('Error', 'Failed to load alert history');
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      const response = await axios.post(`${API_URL}/alerts/resolve`, {
        alert_id: alertId
      });
      
      if (response.data.success) {
       
        setAlerts(prevAlerts => 
          prevAlerts.map(alert => 
            alert.id === alertId 
              ? { ...alert, status: 'resolved' } 
              : alert
          )
        );
        
       
        setActiveCount(prev => prev - 1);
        setResolvedCount(prev => prev + 1);
        
        Alert.alert('Success', 'Alert has been resolved');
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      Alert.alert('Error', 'Failed to resolve alert');
    }
  };

  const openLocation = (latitude, longitude) => {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF3B30" />
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alert History</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active Alerts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{resolvedCount}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      <ScrollView style={styles.alertsList}>
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <BellOff size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No alerts to display</Text>
          </View>
        ) : (
          alerts.map(alert => (
            <View
              key={alert.id}
              style={[
                styles.alertCard,
                alert.status === 'active' ? styles.activeAlert : styles.resolvedAlert,
              ]}>
              <View style={styles.alertHeader}>
                {alert.status === 'active' ? (
                  <Bell size={24} color="#FF3B30" />
                ) : (
                  <BellOff size={24} color="#666" />
                )}
                <View style={styles.alertInfo}>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <View style={styles.alertTypeContainer}>
                    <Text style={[
                      styles.alertType, 
                      alert.type === 'drop' ? styles.dropAlertType : styles.manualAlertType
                    ]}>
                      {alert.type === 'drop' ? 'Drop Detection' : 'Manual SOS'}
                    </Text>
                  </View>
                  <View style={styles.timestampContainer}>
                    <Clock size={14} color="#666" />
                    <Text style={styles.timestamp}>{alert.time_ago}</Text>
                  </View>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.locationButton}
                onPress={() => openLocation(alert.latitude, alert.longitude)}
              >
                <MapPin size={14} color="#fff" />
                <Text style={styles.locationButtonText}>View Location</Text>
              </TouchableOpacity>
              
              {alert.status === 'active' && (
                <TouchableOpacity 
                  style={styles.resolveButton}
                  onPress={() => resolveAlert(alert.id)}
                >
                  <Text style={styles.resolveButtonText}>Resolve</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    marginTop: Platform.OS === 'ios' ? 50 : 30,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
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
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  alertsList: {
    flex: 1,
  },
  alertCard: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  activeAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  resolvedAlert: {
    opacity: 0.7,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertInfo: {
    marginLeft: 10,
    flex: 1,
  },
  alertMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  locationButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  resolveButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  resolveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  alertTypeContainer: {
    marginTop: 5,
  },
  alertType: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  dropAlertType: {
    backgroundColor: '#FFE5CC',
    color: '#FF8000',
  },
  manualAlertType: {
    backgroundColor: '#E6F2FF',
    color: '#0066CC',
  },
});