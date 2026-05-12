/**
 * Google Form Submission Logic
 */

export const submitToGoogleForm = async (data) => {
  const FORM_URL = 'https://docs.google.com/forms/u/0/d/e/1FAIpQLSfH59cNzz4EjtwFpJieJ-ZSrenEuhJDSUXpZIAczHIrSLF2Xw/formResponse';

  const params = new URLSearchParams();

  // Use report date if available, otherwise today
  let year, month, day;
  const now = new Date();
  year = now.getFullYear();
  month = String(now.getMonth() + 1).padStart(2, '0');
  day = String(now.getDate()).padStart(2, '0');

  if (data.date) {
    try {
      const parts = data.date.split(/[\/\-\.]/);
      if (parts.length === 3) {
        day = parts[0].trim().padStart(2, '0');
        month = parts[1].trim().padStart(2, '0');
        let yearPart = parts[2].trim();
        if (yearPart.length === 2) {
          year = '20' + yearPart;
        } else if (yearPart.length === 4) {
          year = yearPart;
        }
      }
    } catch (e) {
      console.warn('Failed to parse date:', data.date);
    }
  }

  // Google Forms Date Field Split
  const DATE_ID = '1941210032';
  params.append(`entry.${DATE_ID}_year`, year);
  params.append(`entry.${DATE_ID}_month`, month);
  params.append(`entry.${DATE_ID}_day`, day);

  // Map app service names to EXACT Google Form dropdown choices
  const serviceMap = {
    'Monday Bible Study': 'Monday Bible Study',
    'Search the Scriptures': 'Search the Scriptures',
    'Sunday Worship Service': 'Sunday Worship Service',
    'Thursday Revival Service': 'Thursday Revival Service',
    'HCF': 'HCF',
    'Crusades': 'Crusades',
    "Minister's Conference": "Minister's Conference"
  };

  const finalService = serviceMap[data.service] || data.service;

  // Definitive Mapping for "DLBC TRANSFORMER GROUP ATTENDANCE"
  params.append('entry.554610952', finalService);
  params.append('entry.588458783', data.location);
  params.append('entry.483611869', data.adultBrothers);
  params.append('entry.1344690217', data.adultSisters);
  params.append('entry.555733260', data.youthBrothers);
  params.append('entry.1944720369', data.youthSisters);
  params.append('entry.270209031', data.childrenBoys);
  params.append('entry.268304348', data.childrenGirls);
  params.append('entry.519802581', data.visitors);
  params.append('entry.2116732443', data.converts);
  params.append('entry.416962792', data.remarks || 'None');

  console.log('Submitting to Google Form (Final):', params.toString());

  try {
    await fetch(FORM_URL, {
      method: 'POST',
      body: params.toString(),
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Submission error:', error);
    return { success: false, error: error.message };
  }
};
