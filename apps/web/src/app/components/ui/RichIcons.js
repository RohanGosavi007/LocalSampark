import React from 'react';
import { Store, Users, Truck, Leaf } from 'lucide-react';

export const StoreIcon = ({ size = 24, className = '' }) => (
  <Store size={size} className={className} />
);

export const CommunityIcon = ({ size = 24, className = '' }) => (
  <Users size={size} className={className} />
);

export const DeliveryIcon = ({ size = 24, className = '' }) => (
  <Truck size={size} className={className} />
);

export const ProduceIcon = ({ size = 24, className = '' }) => (
  <Leaf size={size} className={className} />
);
