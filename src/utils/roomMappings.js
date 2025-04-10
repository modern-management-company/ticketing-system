// Hotel chain identifiers and their common patterns
export const hotelChainPatterns = {
  'MAR': [
    'marriott',
    'sheraton',
    'westin',
    'renaissance',
    'le meridien',
    'autograph',
    'courtyard',
    'fairfield',
    'springhill',
    'residence inn',
    'towneplace',
    'element',
    'aloft',
    'moxy',
    'protea',
    'ac hotels',
    'st. regis',
    'luxury collection',
    'w hotels',
    'design hotels',
    'tribute portfolio',
    'gaylord hotels'
  ],
  'HIL': [
    'hilton',
    'conrad',
    'curio',
    'doubletree',
    'embassy suites',
    'hampton',
    'homewood',
    'home2',
    'tru',
    'waldorf',
    'canopy',
    'signia',
    'tempo',
    'lxb',
    'motto',
    'spark',
    'tapestry',
    'voco'
  ],
  'BWH': [
    'best western',
    'best western plus',
    'best western premier',
    'glō',
    'aiden',
    'sadie',
    'vīb',
    'executive residency',
    'bw signature collection',
    'bw collection'
  ]
};

// Room type mappings for different hotel chains
export const roomTypeMappings = {
  // Marriott room codes
  'MAR': {
    'STDO': 'Standard Room',
    'TOBR': 'Two Bedroom Suite',
    'ONBR': 'One Bedroom Suite',
    'STU': 'Studio',
    'DLX': 'Deluxe Room',
    'SUI': 'Suite',
    'JSU': 'Junior Suite',
    'EXE': 'Executive Room',
    'CLB': 'Club Room',
    'ACC': 'Accessible Room',
    'CON': 'Connecting Room',
    'ADJ': 'Adjoining Room',
    'OCV': 'Ocean View Room',
    'CIV': 'City View Room',
    'GV': 'Garden View Room',
    'POV': 'Pool View Room',
    'FAM': 'Family Room',
    'HNE': 'Honeymoon Suite',
    'PEN': 'Penthouse Suite'
  },
  // Hilton room codes
  'HIL': {
    'STDO': 'Standard Room',
    'TOBR': 'Two Bedroom Suite',
    'ONBR': 'One Bedroom Suite',
    'STU': 'Studio',
    'DLX': 'Deluxe Room',
    'SUI': 'Suite',
    'JSU': 'Junior Suite',
    'EXE': 'Executive Room',
    'CLB': 'Club Room',
    'ACC': 'Accessible Room',
    'CON': 'Connecting Room',
    'ADJ': 'Adjoining Room',
    'OCV': 'Ocean View Room',
    'CIV': 'City View Room',
    'GV': 'Garden View Room',
    'POV': 'Pool View Room',
    'FAM': 'Family Room',
    'HNE': 'Honeymoon Suite',
    'PEN': 'Penthouse Suite'
  },
  // Best Western room codes
  'BWH': {
    'STDO': 'Standard Room',
    'TOBR': 'Two Bedroom Suite',
    'ONBR': 'One Bedroom Suite',
    'STU': 'Studio',
    'DLX': 'Deluxe Room',
    'SUI': 'Suite',
    'JSU': 'Junior Suite',
    'EXE': 'Executive Room',
    'ACC': 'Accessible Room',
    'CON': 'Connecting Room',
    'ADJ': 'Adjoining Room',
    'OCV': 'Ocean View Room',
    'CIV': 'City View Room',
    'GV': 'Garden View Room',
    'POV': 'Pool View Room',
    'FAM': 'Family Room',
    'HNE': 'Honeymoon Suite',
    // Ramada specific room types
    'NQQ1': 'Standard Two Queen Room',
    'NQQ2': 'Deluxe Two Queen Room',
    'NQQ3': 'Premium Two Queen Room',
    'NQQ4': 'Executive Two Queen Room',
    'NQQ5': 'Suite Two Queen Room',
    'NQQ6': 'Accessible Two Queen Room',
    'NQQ7': 'Connecting Two Queen Room',
    'NQQ8': 'Adjoining Two Queen Room',
    'NQQ9': 'Family Two Queen Room',
    'NQQ10': 'Honeymoon Two Queen Room',
    'NQQ11': 'Penthouse Two Queen Room',
    'NQQ12': 'Presidential Two Queen Room',
    'NQQ13': 'Royal Two Queen Room',
    'NQQ14': 'Luxury Two Queen Room',
    'NQQ15': 'Grand Two Queen Room'
  }
};

// Common room type mappings (fallback)
export const commonRoomTypes = {
  'SGL': 'Single Room',
  'DBL': 'Double Room',
  'TWN': 'Twin Room',
  'SUP': 'Superior Room',
  'DLX': 'Deluxe Room',
  'JSU': 'Junior Suite',
  'SUI': 'Suite',
  'PSU': 'Presidential Suite',
  'ACC': 'Accessible Room',
  'CON': 'Connecting Room',
  'ADJ': 'Adjoining Room',
  'OCV': 'Ocean View Room',
  'CIV': 'City View Room',
  'GV': 'Garden View Room',
  'POV': 'Pool View Room',
  'EXE': 'Executive Room',
  'CLB': 'Club Room',
  'FAM': 'Family Room',
  'HNE': 'Honeymoon Suite',
  'PEN': 'Penthouse Suite',
  'STD': 'Standard Room',
  'RSI': 'Regency Suite',
  'PSI': 'Presidential Suite'
};

// Function to determine hotel chain from property name or data
export const determineHotelChain = (propertyName, propertyData = {}) => {
  if (!propertyName) return 'MAR'; // Default to Marriott
  
  const name = propertyName.toLowerCase();
  
  // Check each chain's patterns
  for (const [chain, patterns] of Object.entries(hotelChainPatterns)) {
    if (patterns.some(pattern => name.includes(pattern))) {
      return chain;
    }
  }
  
  // Check property data for chain indicators
  if (propertyData.chain_code) {
    return propertyData.chain_code.toUpperCase();
  }
  
  if (propertyData.brand) {
    const brand = propertyData.brand.toLowerCase();
    for (const [chain, patterns] of Object.entries(hotelChainPatterns)) {
      if (patterns.some(pattern => brand.includes(pattern))) {
        return chain;
      }
    }
  }
  
  return 'MAR'; // Default to Marriott if no match found
};

// Function to get friendly room name with custom formatting
export const getFriendlyRoomName = (roomCode, hotelChain = null, format = 'full') => {
  if (!roomCode) return 'Unknown Room Type';
  
  let friendlyName = '';
  
  // Try hotel chain specific mapping first
  if (hotelChain && roomTypeMappings[hotelChain] && roomTypeMappings[hotelChain][roomCode]) {
    friendlyName = roomTypeMappings[hotelChain][roomCode];
  } else {
    // Try to find in any chain's mappings
    for (const chain of Object.keys(roomTypeMappings)) {
      if (roomTypeMappings[chain][roomCode]) {
        friendlyName = roomTypeMappings[chain][roomCode];
        break;
      }
    }
  }
  
  if (!friendlyName) {
    return roomCode;
  }
  
  // Apply formatting
  switch (format) {
    case 'short':
      return friendlyName.split(' ')[0]; // Just the first word
    case 'code':
      return `${roomCode} (${friendlyName})`;
    case 'full':
    default:
      return friendlyName;
  }
};

// Function to get all room types for a specific hotel chain with formatting options
export const getHotelRoomTypes = (hotelChain, format = 'full') => {
  const roomTypes = !hotelChain || !roomTypeMappings[hotelChain] 
    ? Object.entries(roomTypeMappings['MAR']) // Default to Marriott if no chain specified
    : Object.entries(roomTypeMappings[hotelChain]);
  
  return roomTypes.map(([code, name]) => ({
    code,
    name: getFriendlyRoomName(code, hotelChain, format)
  }));
}; 