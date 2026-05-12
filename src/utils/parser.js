/**
 * Parsing logic for DLBC WhatsApp Attendance Reports
 */

export const LOCATION_MAPPING = {
  'MAGBON': 'Imagbon',
  'GOD\'S PRESENCE': 'God\'s Presence',
  'PROGRESS': 'Progress',
  'ORIMEDU': 'Orimedu',
  'MUTI': 'Muti',
  'TRANSFORMER': 'Transformer',
  'AJEGUNLE': 'Ajegunle',
  'AGBALUMO': 'Agbalumo',
  'DELIGHTSOME': 'Delightsome',
  'ODUGBOSE': 'Odugbose',
  'TRIUMPHANT': 'Triumphant',
  'LOVE': 'Love',
  'SOLID ROCK': 'Solid Rock',
};

const SERVICE_MAPPING = {
  'MBS': 'Monday Bible Study',
  'MONDAY BIBLE STUDY': 'Monday Bible Study',
  'SWS': 'Sunday Worship Service',
  'SUNDAY WORSHIP SERVICE': 'Sunday Worship Service',
  'SUNDAY SERVICE': 'Sunday Worship Service',
  'SUNDAY': 'Sunday Worship Service',
  'STS': 'Search the Scriptures',
  'SEARCH THE SCRIPTURES': 'Search the Scriptures',
  'TRETS': 'Thursday Revival Service',
  'TRET': 'Thursday Revival Service',
  'THURSDAY REVIVAL HOUR': 'Thursday Revival Service',
  'THURSDAY': 'Thursday Revival Service',
};

export const parseReports = (rawText) => {
  const upperRaw = rawText.toUpperCase();
  
  // Detect global service from the very first line if possible
  let globalService = null;
  for (const [key, value] of Object.entries(SERVICE_MAPPING)) {
    if (upperRaw.split('\n')[0].includes(key)) {
      globalService = value;
      break;
    }
  }

  // Split by WhatsApp header [DD/MM, HH:MM pm] Name/Number:
  // Using a more inclusive pattern for the sender name to handle emojis and special characters
  const chunks = rawText.split(/\[\d{1,2}\/\d{1,2}, .*?\] .*?:/g).filter(c => c.trim().length > 10);
  
  const allEntries = [];

  chunks.forEach((chunk, chunkIndex) => {
    const upperChunk = chunk.toUpperCase();
    
    // Identify Location
    let location = 'Unknown';
    for (const [key, value] of Object.entries(LOCATION_MAPPING)) {
      if (upperChunk.includes(key.toUpperCase())) {
        location = value;
        break;
      }
    }

    // Identify Service for this chunk
    let chunkService = globalService;
    for (const [key, value] of Object.entries(SERVICE_MAPPING)) {
      if (upperChunk.split('\n')[0].includes(key)) {
        chunkService = value;
        break;
      }
    }

    // Identify Date for this chunk
    const dateMatch = chunk.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
    const chunkDate = dateMatch ? dateMatch[1] : null;

    // Check for sub-sections (Sunday pattern: STS + MESSAGE/SERMON)
    // We look for STS at the start and a second section header like MESSAGE or SERMON
    const hasSTS = upperChunk.includes('STS') || upperChunk.includes('SEARCH THE SCRIPTURES');
    const hasSecondSection = upperChunk.includes('MESSAGE') || upperChunk.includes('SERMON') || (hasSTS && upperChunk.includes('SWS'));

    const sections = [];
    if (hasSTS && hasSecondSection) {
      // Find where the second section starts
      let splitIndex = -1;
      const secondHeaders = ['MESSAGE', 'SERMON', 'SWS'];
      for (const header of secondHeaders) {
        const idx = upperChunk.indexOf(header);
        if (idx !== -1 && idx > (upperChunk.indexOf('STS') || 0)) {
          splitIndex = idx;
          break;
        }
      }

      if (splitIndex !== -1) {
        sections.push({ service: 'Search the Scriptures', text: chunk.substring(0, splitIndex), date: chunkDate });
        sections.push({ service: 'Sunday Worship Service', text: chunk.substring(splitIndex), date: chunkDate });
      } else {
        sections.push({ service: chunkService || 'Sunday Worship Service', text: chunk, date: chunkDate });
      }
    } else {
      // Single section - use explicit keyword or chunk context
      let service = chunkService || 'Monday Bible Study';
      if (hasSTS) service = 'Search the Scriptures';
      else if (hasSecondSection) service = 'Sunday Worship Service';
      
      sections.push({ service, text: chunk, date: chunkDate });
    }

    sections.forEach((section, sectionIndex) => {
      const entry = {
        id: `${chunkIndex}-${sectionIndex}`,
        location,
        service: section.service,
        date: section.date,
        adultBrothers: 0,
        adultSisters: 0,
        youthBrothers: 0,
        youthSisters: 0,
        childrenBoys: 0,
        childrenGirls: 0,
        visitors: 0,
        converts: 0,
        remarks: '',
        total: 0,
        status: 'ready',
        isTotalMismatch: false
      };

      const findValue = (patterns, fallbackIndex = -1) => {
        // First try to find by exact label match (supporting : . = -)
        for (const p of patterns) {
          const regex = new RegExp(`\\b${p}\\s*[:.=\\-~]?\\s*(nil|\\d+)`, 'i');
          const matches = [...section.text.matchAll(new RegExp(regex, 'gi'))];
          
          if (matches.length > 0) {
            const match = (fallbackIndex !== -1 && matches[fallbackIndex]) ? matches[fallbackIndex] : matches[0];
            if (!match) continue; // If fallbackIndex is out of bounds for this specific pattern
            
            const val = match[1].toLowerCase();
            return val === 'nil' ? 0 : parseInt(val, 10);
          }
        }
        return null; // Return null instead of 0 to distinguish "not found" from "found zero"
      };

      entry.adultBrothers = findValue(['AB', 'BR', 'AM', 'ADULT BROTHERS', 'MEN']) || 0;
      entry.adultSisters = findValue(['AS', 'SIS', 'AW', 'ADULT SISTERS', 'WOMEN']) || 0;
      entry.youthBrothers = findValue(['YB', 'YOUTH BROTHERS', 'BOYS']) || 0;
      
      // For Youth Sisters, if someone typed YB twice, we look for the 2nd match of 'YB'
      const ysValue = findValue(['YS', 'YG', 'YOUTH GIRLS', 'GIRLS', 'YG\\.']);
      entry.youthSisters = ysValue !== null ? ysValue : (findValue(['YB'], 1) || 0);

      entry.childrenBoys = findValue(['CB', 'CHB', 'CHILDREN BOYS', 'CB\\.']) || 0;
      
      // For Children Girls, if someone typed CB twice, we look for the 2nd match of 'CB'
      const cgValue = findValue(['CG', 'CHG', 'CS', 'CHILDREN GIRLS', 'CG\\.']);
      entry.childrenGirls = cgValue !== null ? cgValue : (findValue(['CB', 'CHB'], 1) || 0);

      entry.visitors = findValue(['VISITORS', 'VISITOR', 'GUEST', 'GUESTS']) || 0;
      entry.converts = findValue(['CONVERTS', 'CONVERT']) || 0;
      
      const reportedTotal = findValue(['TOTAL', 'TTL', 'GRAND TOTAL', 'TOTAL-', 'TOTAL.']);
      const calculatedTotal = entry.adultBrothers + entry.adultSisters + entry.youthBrothers + entry.youthSisters + entry.childrenBoys + entry.childrenGirls;
      
      entry.total = reportedTotal || calculatedTotal;
      entry.isTotalMismatch = reportedTotal !== 0 && reportedTotal !== calculatedTotal;
      if (entry.location === 'Unknown') entry.status = 'error';

      allEntries.push(entry);
    });
  });

  return allEntries;
};
