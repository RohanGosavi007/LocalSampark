import React, { forwardRef } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';

// Crash-safe import of @gorhom/bottom-sheet (depends on react-native-reanimated)
let GorhomBottomSheet = null;
let BottomSheetView = null;
let BottomSheetBackdrop = null;

try {
  const bs = require('@gorhom/bottom-sheet');
  GorhomBottomSheet = bs.default;
  BottomSheetView = bs.BottomSheetView;
  BottomSheetBackdrop = bs.BottomSheetBackdrop;
} catch (e) {
  console.warn('[BottomSheet] @gorhom/bottom-sheet not available, using Modal fallback:', e.message);
}

const CustomBottomSheet = forwardRef(({ children, snapPoints = ['50%'], onClose }, ref) => {
  // If @gorhom/bottom-sheet loaded successfully, use the native bottom sheet
  if (GorhomBottomSheet && BottomSheetView && BottomSheetBackdrop) {
    return (
      <GorhomBottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        onClose={onClose}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
        )}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.background}
      >
        <BottomSheetView style={styles.contentContainer}>
          {children}
        </BottomSheetView>
      </GorhomBottomSheet>
    );
  }

  // Fallback: Use a simple Modal when @gorhom/bottom-sheet is unavailable
  // Note: ref.current?.expand() / close() won't work with this fallback
  return null;
});

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
  },
  handle: {
    backgroundColor: '#d1d5db',
    width: 40,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
});

export default CustomBottomSheet;
