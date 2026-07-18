import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, ROLE_ICONS, ROLE_COLORS, getTabsForRole } from '../utils/permissions';
import { router } from 'expo-router';

export default function RoleSwitcher() {
  const { assignedRoles, activeRole, switchRole } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);

  // If user only has one role, no need to show the switcher
  if (!assignedRoles || assignedRoles.length <= 1) {
    return null;
  }

  const handleRoleSwitch = (role) => {
    switchRole(role);
    setModalVisible(false);
    
    // Force redirect to the new role's home to re-mount tabs properly
    // Adding a slight delay to ensure state updates first
    const tabConfig = getTabsForRole(role);
    setTimeout(() => {
      router.replace(`/${tabConfig.group}/`);
    }, 100);
  };

  return (
    <>
      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: ROLE_COLORS[activeRole] || '#3b82f6' }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabIcon}>{ROLE_ICONS[activeRole] || '👤'}</Text>
      </TouchableOpacity>

      {/* Role Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Switch Profile View</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Select which role dashboard you want to access:</Text>

            <ScrollView style={styles.rolesList} showsVerticalScrollIndicator={false}>
              {assignedRoles.map((role) => {
                const isActive = role === activeRole;
                const color = ROLE_COLORS[role] || '#3b82f6';
                
                return (
                  <TouchableOpacity 
                    key={role} 
                    style={[
                      styles.roleItem, 
                      isActive && styles.roleItemActive,
                      { borderColor: isActive ? color : '#334155' }
                    ]}
                    onPress={() => handleRoleSwitch(role)}
                  >
                    <View style={[styles.roleIconContainer, { backgroundColor: `${color}20` }]}>
                      <Text style={styles.roleIcon}>{ROLE_ICONS[role] || '👤'}</Text>
                    </View>
                    <View style={styles.roleTextContainer}>
                      <Text style={styles.roleName}>{ROLE_LABELS[role] || role}</Text>
                      {isActive && <Text style={[styles.activeTag, { color }]}>Current View</Text>}
                    </View>
                    {!isActive && (
                      <View style={styles.arrowContainer}>
                        <Text style={styles.arrow}>→</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 110 : 85,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#0f172a',
    zIndex: 1000, // Ensure it's above everything
  },
  fabIcon: {
    fontSize: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 24,
  },
  rolesList: {
    maxHeight: 400,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  roleItemActive: {
    backgroundColor: '#f8fafc',
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleIcon: {
    fontSize: 24,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  activeTag: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    color: '#64748b',
    fontWeight: 'bold',
  },
});
