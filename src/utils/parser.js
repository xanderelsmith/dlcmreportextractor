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
  'TRETS': 'Thursday Revival and Evangelism Training Service',
  'TRET': 'Thursday Revival and Evangelism Training Service',
  'THURSDAY REVIVAL HOUR': 'Thursday Revival and Evangelism Training Service',
  'THURSDAY': 'Thursday Revival and Evangelism Training Service',
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
        sections.push({ service: 'Search the Scriptures', text: chunk.substring(0, splitIndex) });
        sections.push({ service: 'Sunday Worship Service', text: chunk.substring(splitIndex) });
      } else {
        sections.push({ service: globalService || 'Sunday Worship Service', text: chunk });
      }
    } else {
      // Single section - use explicit keyword or global context
      let service = globalService || 'Monday Bible Study';
      if (hasSTS) service = 'Search the Scriptures';
      else if (hasSecondSection) service = 'Sunday Worship Service';
      
      sections.push({ service, text: chunk });
    }

    sections.forEach((section, sectionIndex) => {
      const entry = {
        id: `${chunkIndex}-${sectionIndex}`,
        location,
        service: section.service,
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

      const findValue = (patterns) => {
        for (const p of patterns) {
          const regex = new RegExp(`${p}\\s*[:.-]?\\s*(nil|\\d+)`, 'i');
          const match = section.text.match(regex);
          if (match) {
            const val = match[1].toLowerCase();
            return val === 'nil' ? 0 : parseInt(val, 10);
          }
        }
        return 0;
      };

      entry.adultBrothers = findValue(['AB', 'BR', 'AM', 'ADULT BROTHERS', 'MEN']);
      entry.adultSisters = findValue(['AS', 'SIS', 'AW', 'ADULT SISTERS', 'WOMEN']);
      entry.youthBrothers = findValue(['YB', 'YOUTH BROTHERS', 'BOYS']);
      entry.youthSisters = findValue(['YS', 'YG', 'YOUTH GIRLS', 'GIRLS', 'YG\\.']);
      entry.childrenBoys = findValue(['CB', 'CHB', 'CHILDREN BOYS', 'CB\\.']);
      entry.childrenGirls = findValue(['CG', 'CHG', 'CS', 'CHILDREN GIRLS', 'CG\\.']);
      
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
