/**
 * Google Form Submission Logic
 */

const FORM_URL = 'https://docs.google.com/forms/u/0/d/e/1FAIpQLSc175sQvhZfGn4qAhmUJcdZpoFFbP9jGYhcKttKRXojtXmGwg/formResponse';

const ENTRY_IDS = {
  service: 'entry.467758931',
  location: 'entry.741411716',
  adultBrothers: 'entry.478883843',
  adultSisters: 'entry.45083845',
  youthBrothers: 'entry.1530054388',
  youthSisters: 'entry.937445977',
  childrenBoys: 'entry.720300104',
  childrenGirls: 'entry.1545904191',
  total: 'entry.781553486',
  visitors: 'entry.1967540146',
  remarks: 'entry.1442137858',
  converts: 'entry.515306414',
};

export const submitToGoogleForm = async (data) => {
  const formData = new URLSearchParams();
  
  Object.entries(ENTRY_IDS).forEach(([key, entryId]) => {
    formData.append(entryId, data[key] || (key === 'remarks' ? '' : '0'));
  });

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
