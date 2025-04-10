// Hotel chain identifiers and their common patterns
export const hotelChainPatterns = {
  'MAR': ['marriott', 'sheraton', 'westin', 'renaissance', 'le meridien', 'autograph', 'courtyard', 'fairfield', 'springhill', 'residence inn'],
  'HYT': ['hyatt', 'grand hyatt', 'park hyatt', 'andaz', 'hyatt regency', 'hyatt place', 'hyatt house'],
  'HIL': ['hilton', 'conrad', 'curio', 'doubletree', 'embassy suites', 'hampton', 'homewood', 'home2', 'tru', 'waldorf'],
  'BWH': ['best western', 'best western plus', 'best western premier'],
  'IHG': ['intercontinental', 'crowne plaza', 'holiday inn', 'holiday inn express', 'indigo', 'avid', 'staybridge', 'candlewood'],
  'ACC': ['accenture', 'accenture hotels', 'accenture resorts'],
  'WYN': ['wynn', 'wynn resorts', 'encore'],
  'MGM': ['mgm', 'mgm grand', 'bellagio', 'aria', 'mandalay bay', 'luxor', 'excalibur'],
  'RAD': ['radisson', 'radisson blu', 'radisson red', 'country inn', 'park plaza', 'park inn'],
  'CHO': ['choice', 'comfort inn', 'comfort suites', 'quality', 'clarion', 'econo lodge', 'rodeway', 'ascend', 'cambria'],
  'MGM': ['mgm', 'mgm grand', 'bellagio', 'aria', 'mandalay bay', 'luxor', 'excalibur'],
  'RAD': ['radisson', 'radisson blu', 'radisson red', 'country inn', 'park plaza', 'park inn'],
  'CHO': ['choice', 'comfort inn', 'comfort suites', 'quality', 'clarion', 'econo lodge', 'rodeway', 'ascend', 'cambria']
};

// Room type mappings for different hotel chains
export const roomTypeMappings = {
  // Marriott room codes
  'MAR': {
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
    'PEN': 'Penthouse Suite'
  },
  // Hyatt room codes
  'HYT': {
    'STD': 'Standard Room',
    'DLX': 'Deluxe Room',
    'SUP': 'Superior Room',
    'EXE': 'Executive Room',
    'CLB': 'Club Room',
    'SUI': 'Suite',
    'RSI': 'Regency Suite',
    'PSI': 'Presidential Suite',
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
    'STD': 'Standard Room',
    'DLX': 'Deluxe Room',
    'SUP': 'Superior Room',
    'EXE': 'Executive Room',
    'CLB': 'Club Room',
    'SUI': 'Suite',
    'PSI': 'Presidential Suite',
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
    'STD': 'Standard Room',
    'DLX': 'Deluxe Room',
    'SUP': 'Superior Room',
    'EXE': 'Executive Room',
    'SUI': 'Suite',
    'ACC': 'Accessible Room',
    'CON': 'Connecting Room',
    'ADJ': 'Adjoining Room',
    'OCV': 'Ocean View Room',
    'CIV': 'City View Room',
    'GV': 'Garden View Room',
    'POV': 'Pool View Room',
    'FAM': 'Family Room',
    'HNE': 'Honeymoon Suite'
  },
  // IHG room codes
  'IHG': {
    'STD': 'Standard Room',
    'DLX': 'Deluxe Room',
    'SUP': 'Superior Room',
    'EXE': 'Executive Room',
    'CLB': 'Club Room',
    'SUI': 'Suite',
    'PSI': 'Presidential Suite',
    'ACC': 'Accessible Room',
    'CON': 'Connecting Room',
    'ADJ': 'Adjoining Room',
    'OCV': 'Ocean View Room',
    'CIV': 'City View Room',
    'GV': 'Garden View Room',
    'POV': 'Pool View Room',
    'FAM': 'Family Room',
    'HNE': 'Honeymoon Suite',
    'PEN': 'Penthouse Suite',
    'KNG': 'King Room',
    'QN': 'Queen Room',
    'STD2': 'Standard Two Queen Room',
    'DLX2': 'Deluxe Two Queen Room',
    'JSU': 'Junior Suite',
    'RSI': 'Regency Suite',
    'COR': 'Corner Room',
    'HGH': 'High Floor Room',
    'LOW': 'Low Floor Room',
    'SND': 'Standard Non-Smoking Room',
    'SMS': 'Standard Smoking Room'
  },
  // Accenture room codes
  'ACC': {
    'STD': 'Standard Room',
    'DLX': 'Deluxe Room',
    'SUP': 'Superior Room',
    'EXE': 'Executive Room',
    'SUI': 'Suite',
    'PSI': 'Presidential Suite',
    'ACC': 'Accessible Room',
    'OCV': 'Ocean View Room',
    'CIV': 'City View Room',
    'GV': 'Garden View Room',
    'POV': 'Pool View Room',
    'FAM': 'Family Room',
    'HNE': 'Honeymoon Suite',
    'PEN': 'Penthouse Suite',
    'KNG': 'King Room',
    'QN': 'Queen Room',
    'STD2': 'Standard Two Queen Room',
    'DLX2': 'Deluxe Two Queen Room',
    'JSU': 'Junior Suite',
    'RSI': 'Regency Suite',
    'COR': 'Corner Room',
    'HGH': 'High Floor Room',
    'LOW': 'Low Floor Room'
  },
  // Wynn room codes
  'WYN': {
    'STD': 'Standard Room',
    'DLX': 'Deluxe Room',
    'SUP': 'Superior Room',
    'EXE': 'Executive Room',
    'SUI': 'Suite',
    'PSI': 'Presidential Suite',
    'ACC': 'Accessible Room',
    'OCV': 'Ocean View Room',
    'CIV': 'City View Room',
    'GV': 'Garden View Room',
    'POV': 'Pool View Room',
    'FAM': 'Family Room',
    'HNE': 'Honeymoon Suite',
    'PEN': 'Penthouse Suite',
    'KNG': 'King Room',
    'QN': 'Queen Room',
    'STD2': 'Standard Two Queen Room',
    'DLX2': 'Deluxe Two Queen Room',
    'JSU': 'Junior Suite',
    'RSI': 'Regency Suite',
    'COR': 'Corner Room',
    'HGH': 'High Floor Room',
    'LOW': 'Low Floor Room',
    'SND': 'Standard Non-Smoking Room',
    'SMS': 'Standard Smoking Room',
    'VIL': 'Villa',
    'RSD': 'Residence',
    'TWR': 'Tower Room',
    'SAL': 'Salon Suite',
    'PAR': 'Parlor Suite'
  },
  // MGM room codes
  'MGM': {
    'STD': 'Standard Room',
    'DLX': 'Deluxe Room',
    'SUP': 'Superior Room',
    'EXE': 'Executive Room',
    'SUI': 'Suite',
    'PSI': 'Presidential Suite',
    'ACC': 'Accessible Room',
    'OCV': 'Ocean View Room',
    'CIV': 'City View Room',
    'GV': 'Garden View Room',
    'POV': 'Pool View Room',
    'FAM': 'Family Room',
    'HNE': 'Honeymoon Suite',
    'PEN': 'Penthouse Suite',
    'KNG': 'King Room',
    'QN': 'Queen Room',
    'STD2': 'Standard Two Queen Room',
    'DLX2': 'Deluxe Two Queen Room',
    'JSU': 'Junior Suite',
    'RSI': 'Regency Suite',
    'COR': 'Corner Room',
    'HGH': 'High Floor Room',
    'LOW': 'Low Floor Room',
    'SND': 'Standard Non-Smoking Room',
    'SMS': 'Standard Smoking Room',
    'VIL': 'Villa',
    'RSD': 'Residence',
    'TWR': 'Tower Room',
    'SAL': 'Salon Suite',
    'PAR': 'Parlor Suite',
    'SKY': 'Sky Suite',
    'STR': 'Studio Room',
    'LUX': 'Luxury Room',
    'PHT': 'Penthouse',
    'VPS': 'Villa Pool Suite'
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
  } else if (commonRoomTypes[roomCode]) {
    friendlyName = commonRoomTypes[roomCode];
  } else {
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
    ? Object.entries(commonRoomTypes)
    : Object.entries(roomTypeMappings[hotelChain]);
  
  return roomTypes.map(([code, name]) => ({
    code,
    name: getFriendlyRoomName(code, hotelChain, format)
  }));
}; 