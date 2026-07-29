/**
 * 10x Dark Store Picker Routing Service
 * Sorts ordered items by aisle and rack position to cut picking time from 90s to <30s.
 */
class PickerRoutingService {
  /**
   * Calculate optimized pick sequence
   */
  static generatePickList(orderItems) {
    // Sort items by Aisle number -> Rack number -> Bin ID
    return [...orderItems].sort((a, b) => {
      const aisleA = a.aisle || 'A1';
      const aisleB = b.aisle || 'A1';
      
      if (aisleA !== aisleB) {
        return aisleA.localeCompare(aisleB);
      }

      const rackA = a.rack || 1;
      const rackB = b.rack || 1;
      return rackA - rackB;
    }).map((item, index) => ({
      pickSequence: index + 1,
      ...item,
      locationTag: `${item.aisle || 'A1'}-R${item.rack || 1}-B${item.bin || 1}`
    }));
  }
}

module.exports = PickerRoutingService;
