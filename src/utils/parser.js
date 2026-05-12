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
  const chunks = rawText.split(/\[\d{1,2}\/\d{1,2}, .*?\] .*?:/g).filter(c => c.trim().length > 10);
  
  const allEntries = [];

  chunks.forEach((chunk, chunkIndex) => {
    // Identify Date for this chunk (global to sub-reports)
    const dateMatch = chunk.match(/(\d{1,2}[\/\-\.:]\d{1,2}[\/\-\.:]\d{2,4})/);
    const chunkDate = dateMatch ? dateMatch[1] : null;

    // Split chunk into individual reports if multiple exist (e.g. joined by "TOTAL")
    const reportTexts = chunk.match(/[\s\S]*?(?:TOTAL\s*[:.=\-~]?\s*\d+|$)/gi).filter(t => t.trim().length > 10);

    reportTexts.forEach((reportText, reportIndex) => {
      const upperChunk = reportText.toUpperCase();
      
      // Identify Location
      let location = 'Unknown';
      for (const [key, value] of Object.entries(LOCATION_MAPPING)) {
        if (upperChunk.includes(key.toUpperCase())) {
          location = value;
          break;
        }
      }

      // Identify Service for this report
      let reportService = globalService;
      for (const [key, value] of Object.entries(SERVICE_MAPPING)) {
        // Look in the first few lines of the report text
        if (reportText.split('\n').slice(0, 3).join('\n').toUpperCase().includes(key)) {
          reportService = value;
          break;
        }
      }

      // Identify Date for this report
      const reportDateMatch = reportText.match(/(\d{1,2}[\/\-\.:]\d{1,2}[\/\-\.:]\d{2,4})/);
      const reportDate = reportDateMatch ? reportDateMatch[1] : chunkDate;

      // Check for sub-sections (Sunday pattern: STS + MESSAGE/SERMON)
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
          sections.push({ service: 'Search the Scriptures', text: reportText.substring(0, splitIndex), date: reportDate });
          sections.push({ service: 'Sunday Worship Service', text: reportText.substring(splitIndex), date: reportDate });
        } else {
          sections.push({ service: reportService || 'Sunday Worship Service', text: reportText, date: reportDate });
        }
      } else {
        // Single section
        let service = reportService || 'Monday Bible Study';
        if (hasSTS) service = 'Search the Scriptures';
        else if (hasSecondSection) service = 'Sunday Worship Service';
        
        sections.push({ service, text: reportText, date: reportDate });
      }

      sections.forEach((section, sectionIndex) => {
        const entry = {
          id: `${chunkIndex}-${reportIndex}-${sectionIndex}`,
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
          for (const p of patterns) {
            // Allow labels to be followed immediately by digits (e.g. AB4)
            const regexString = `(?:^|[^A-Z])${p.replace('.', '\\.')}\\s*[:.=\\-~]?\\s*(nil|\\d+)`;
            const matches = [...section.text.matchAll(new RegExp(regexString, 'gi'))];
            
            if (matches.length > 0) {
              const match = (fallbackIndex === -1) ? matches[0] : matches[fallbackIndex];
              if (!match) continue;
              
              const val = match[1].toLowerCase();
              return val === 'nil' ? 0 : parseInt(val, 10);
            }
          }
          return null;
        };

        const ab = findValue(['AB', 'BR', 'AM', 'ADULT BROTHERS', 'MEN']);
        const as = findValue(['AS', 'SIS', 'AW', 'ADULT SISTERS', 'WOMEN']);
        const yb = findValue(['YB', 'YOUTH BROTHERS', 'BOYS']);
        const ys = findValue(['YS', 'YG', 'YOUTH GIRLS', 'GIRLS', 'YG\\.']);
        const cb = findValue(['CB', 'CHB', 'CHILDREN BOYS', 'CB\\.']);
        const cg = findValue(['CG', 'CHG', 'CS', 'CHILDREN GIRLS', 'CG\\.']);
        const vis = findValue(['VISITORS', 'VISITOR', 'GUEST', 'GUESTS']);
        const conv = findValue(['CONVERTS', 'CONVERT']);
        const reportedTotal = findValue(['TOTAL', 'TTL', 'GRAND TOTAL', 'TOTAL-', 'TOTAL.']);

        // Skip "ghost" reports that have no data at all (usually artifacts of splitting)
        if (ab === null && as === null && yb === null && ys === null && cb === null && cg === null && reportedTotal === null) {
          return;
        }

        entry.adultBrothers = ab || 0;
        entry.adultSisters = as || 0;
        entry.youthBrothers = yb || 0;
        entry.youthSisters = ys !== null ? ys : (findValue(['YB'], 1) || 0);
        entry.childrenBoys = cb || 0;
        entry.childrenGirls = cg !== null ? cg : (findValue(['CB', 'CHB'], 1) || 0);
        entry.visitors = vis || 0;
        entry.converts = conv || 0;
        
        const calculatedTotal = entry.adultBrothers + entry.adultSisters + entry.youthBrothers + entry.youthSisters + entry.childrenBoys + entry.childrenGirls;
        
        entry.total = reportedTotal || calculatedTotal;
        entry.isTotalMismatch = reportedTotal !== null && reportedTotal !== calculatedTotal;
        if (entry.location === 'Unknown') entry.status = 'error';

        allEntries.push(entry);
      });
    });
  });

  return allEntries;
};
