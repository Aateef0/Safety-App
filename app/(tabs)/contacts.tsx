import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Alert, ActivityIndicator, Modal } from 'react-native';
import { Plus, Trash2, User, Search, X } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


const API_URL = 'http://192.168.1.3:5000/api';


type Contact = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  isEmergencyContact?: boolean;
};


const loadAppUsers = async () => {
  setLoading(true);
  try {
    const response = await axios.get(`${API_URL}/users`);
    if (response.data.success) {
      const users = response.data.users.map((user: any) => ({
        id: `app-${user.id}`,
        name: user.name,
        phone: user.phone ? user.phone.replace(/\s+/g, '') : '',
        email: user.email || '',
        isEmergencyContact: false,
        isAppUser: true,
      }));
      
      setAppUsers(users);
      
 
      const intersection = users.filter(user => 
        deviceContacts.some(contact => 
          user.phone && contact.phone && 
          user.phone.replace(/\s+/g, '') === contact.phone.replace(/\s+/g, '')
        )
      );
      
      setFilteredContacts(intersection);
    }
  } catch (error) {
    console.error('Error loading app users:', error);
  } finally {
    setLoading(false);
  }
};

export default function ContactsScreen() {
  const [emergencyContacts, setEmergencyContacts] = useState<Contact[]>([]);
  const [deviceContacts, setDeviceContacts] = useState<Contact[]>([]);
  const [appUsers, setAppUsers] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState(''); 
  const [showContactPicker, setShowContactPicker] = useState(false);

  useEffect(() => {
    const loadEmergencyContacts = async () => {
      try {
        const savedContacts = await AsyncStorage.getItem('emergencyContacts');
        if (savedContacts) {
          setEmergencyContacts(JSON.parse(savedContacts));
        }
      } catch (error) {
        console.error('Error loading emergency contacts:', error);
      }
    };

    loadEmergencyContacts();
  }, []);

 
  useEffect(() => {
    const saveEmergencyContacts = async () => {
      try {
        await AsyncStorage.setItem('emergencyContacts', JSON.stringify(emergencyContacts));
      } catch (error) {
        console.error('Error saving emergency contacts:', error);
      }
    };

    if (emergencyContacts.length > 0) {
      saveEmergencyContacts();
    }
  }, [emergencyContacts]);

 
  const loadDeviceContacts = async () => {
    setLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name, Contacts.Fields.Emails],
        });
  
        if (data.length > 0) {
          const formattedContacts = data
            .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
            .map(contact => ({
              id: contact.id,
              name: contact.name || 'Unknown',
              phone: contact.phoneNumbers ? contact.phoneNumbers[0].number.replace(/\s+/g, '') : '',
              email: contact.emails && contact.emails.length > 0 ? contact.emails[0].email : '',
              isEmergencyContact: false,
            }));
          setDeviceContacts(formattedContacts);
        }
      } else {
        Alert.alert('Permission Required', 'Please grant contacts permission to use this feature');
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

 
  const loadAppUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/users`);
      if (response.data.success) {
        const users = response.data.users.map((user: any) => ({
          id: `app-${user.id}`,
          name: user.name,
          phone: user.phone ? user.phone.replace(/\s+/g, '') : '',
          email: user.email || '',
          isEmergencyContact: false,
          isAppUser: true,
        }));
        
        setAppUsers(users);
        
       
        
        setFilteredContacts(users);
      }
    } catch (error) {
      console.error('Error loading app users:', error);
    } finally {
      setLoading(false);
    }
  };

 
  useEffect(() => {
    if (showContactPicker) {
      const loadContacts = async () => {
        await loadDeviceContacts();
        await loadAppUsers();
      };
      loadContacts();
    }
  }, [showContactPicker]);
  useEffect(() => {
    if (!showContactPicker) return;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      
      const filteredAppUsers = appUsers.filter(
        contact => 
          contact.name.toLowerCase().includes(query) || 
          (contact.phone && contact.phone.toLowerCase().includes(query)) ||
          (contact.email && contact.email.toLowerCase().includes(query))
      );
      
      const filteredDeviceContacts = deviceContacts.filter(
        contact => 
          contact.name.toLowerCase().includes(query) || 
          (contact.phone && contact.phone.toLowerCase().includes(query)) ||
          (contact.email && contact.email.toLowerCase().includes(query))
      );
      
      const combinedResults = [
        ...filteredAppUsers,
        ...filteredDeviceContacts.filter(dc => 
          !filteredAppUsers.some(au => au.phone === dc.phone)
        )
      ];
      
      setFilteredContacts(combinedResults);
    } else {
      const appUserPhones = appUsers.map(user => user.phone);
      const appUserDeviceContacts = deviceContacts.filter(
        contact => appUserPhones.includes(contact.phone)
      );
      
     
      setFilteredContacts([...appUsers, ...appUserDeviceContacts]);
    }
  }, [searchQuery, deviceContacts, appUsers, showContactPicker]);

 
  const addContact = () => {
    if (newName && newPhone) {
      const newContact = {
        id: Date.now().toString(),
        name: newName,
        phone: newPhone,
        email: newEmail, 
        isEmergencyContact: true,
      };
      setEmergencyContacts([...emergencyContacts, newContact]);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setIsAdding(false);
    } else {
      Alert.alert('Error', 'Please enter both name and phone number');
    }
  };

  const addContactFromList = (contact: Contact) => {
    
    const exists = emergencyContacts.some(c => c.phone === contact.phone);
    if (!exists) {
      const newContact = {
        ...contact,
        isEmergencyContact: true,
      };
      setEmergencyContacts([...emergencyContacts, newContact]);
      setShowContactPicker(false);
    } else {
      Alert.alert('Already Added', 'This contact is already in your emergency contacts');
    }
  };

  const removeContact = (id: string) => {
    setEmergencyContacts(emergencyContacts.filter(contact => contact.id !== id));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Emergency Contacts</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowContactPicker(true)}>
          <Plus size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {isAdding && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            placeholder="Contact Name"
            value={newName}
            onChangeText={setNewName}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={newPhone}
            onChangeText={setNewPhone}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Email (optional)"
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.saveButton} onPress={addContact}>
            <Text style={styles.saveButtonText}>Save Contact</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.contactsList}>
        {emergencyContacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No emergency contacts added yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Tap the + button to add contacts
            </Text>
          </View>
        ) : (
          emergencyContacts.map(contact => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.contactInfo}>
                <User size={24} color="#666" />
                <View style={styles.contactText}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                  {contact.email && (
                    <Text style={styles.contactEmail}>{contact.email}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => removeContact(contact.id)}
                style={styles.deleteButton}>
                <Trash2 size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Contact Picker Modal */}
      <Modal
        visible={showContactPicker}
        animationType="slide"
        transparent={false}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Contact</Text>
            <TouchableOpacity onPress={() => setShowContactPicker(false)}>
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity 
            style={styles.manualEntryButton}
            onPress={() => {
              setShowContactPicker(false);
              setIsAdding(true);
            }}
          >
            <Text style={styles.manualEntryText}>+ Add contact manually</Text>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator size="large" color="#FF3B30" style={styles.loader} />
          ) : (
            <ScrollView style={styles.modalList}>
              {filteredContacts.length > 0 ? (
                <>
                  {/* App Users Section */}
                  <Text style={styles.sectionHeader}>App Users</Text>
                  {filteredContacts
                    .filter(contact => (contact as any).isAppUser)
                    .map(contact => (
                      <TouchableOpacity
                        key={contact.id}
                        style={styles.contactItem}
                        onPress={() => addContactFromList(contact)}
                      >
                        <View style={styles.contactItemInfo}>
                          <User size={20} color="#666" />
                          <View style={styles.contactItemText}>
                            <Text style={styles.contactItemName}>{contact.name}</Text>
                            <Text style={styles.contactItemPhone}>{contact.phone}</Text>
                            {contact.email && (
                              <Text style={styles.contactItemEmail}>{contact.email}</Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.appUserBadge}>
                          <Text style={styles.appUserBadgeText}>App User</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                    
                  {/* Device Contacts Section */}
                  {filteredContacts.some(contact => !(contact as any).isAppUser) && (
                    <>
                      <Text style={styles.sectionHeader}>Device Contacts</Text>
                      {filteredContacts
                        .filter(contact => !(contact as any).isAppUser)
                        .map(contact => (
                          <TouchableOpacity
                            key={contact.id}
                            style={styles.contactItem}
                            onPress={() => addContactFromList(contact)}
                          >
                            <View style={styles.contactItemInfo}>
                              <User size={20} color="#666" />
                              <View style={styles.contactItemText}>
                                <Text style={styles.contactItemName}>{contact.name}</Text>
                                <Text style={styles.contactItemPhone}>{contact.phone}</Text>
                                {contact.email && (
                                  <Text style={styles.contactItemEmail}>{contact.email}</Text>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  <Text style={styles.noResultsText}>No contacts found</Text>
                )}
              </ScrollView>
          )}
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 50 : 30,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  addButton: {
    padding: 8,
  },
  addForm: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  contactsList: {
    flex: 1,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactText: {
    marginLeft: 10,
  },
  contactName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  contactPhone: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginTop: 2,
  },
  contactEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginTop: 2,
  },
  contactItemEmail: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 50 : 30,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  modalList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactItemText: {
    marginLeft: 10,
  },
  contactItemName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  contactItemPhone: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  loader: {
    marginTop: 50,
  },
  noResultsText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  appUserBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  appUserBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  manualEntryButton: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
  },
  manualEntryText: {
    color: '#FF3B30',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
});