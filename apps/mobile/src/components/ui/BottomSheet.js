import React, { forwardRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';

const CustomBottomSheet = forwardRef(({ children, snapPoints = ['50%'], onClose }, ref) => {
  return (
    <BottomSheet
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
    </BottomSheet>
  );
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
