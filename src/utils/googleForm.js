/**
 * Google Form Submission Logic
 */

export const submitToGoogleForm = async (data) => {
  // Map our data to Google Form entry IDs
  const FORM_URL = 'https://docs.google.com/forms/u/0/d/e/1FAIpQLSd9fWpZ0QhRkU-X6Y_p3_pZ-6P-Zq-6P-Zq-6P-Zq-6P/formResponse'; // Placeholder - replace with actual URL if needed
  
  const formData = new FormData();
  
  // Format date as YYYY-MM-DD for Google Forms
  const today = new Date().toISOString().split('T')[0];

  formData.append('entry.1066942360', today); // Date of Service
  formData.append('entry.1264956257', data.service); // Service Type
  formData.append('entry.520406787', data.location); // Group/Location
  formData.append('entry.314335920', data.adultBrothers);
  formData.append('entry.464686013', data.adultSisters);
  formData.append('entry.1066551170', data.youthBrothers);
  formData.append('entry.1912506852', data.youthSisters);
  formData.append('entry.1057722128', data.childrenBoys);
  formData.append('entry.811681918', data.childrenGirls);
  formData.append('entry.884305055', data.visitors);
  formData.append('entry.1000887192', data.converts);
  formData.append('entry.669212626', data.remarks || ''); // Any Remark / Report / Challenge

  try {
    // Mode: 'no-cors' is required for Google Forms to avoid CORS errors, 
    // although we won't be able to read the response.
    await fetch(FORM_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    return { success: true, message: 'Submitted successfully (Note: no-cors mode used)' };
  } catch (error) {
    console.error('Submission error:', error);
    return { success: false, message: error.message };
  }
};
