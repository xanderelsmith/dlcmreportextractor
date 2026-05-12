import fs from 'fs';

const content = fs.readFileSync('form_source_utf8.html', 'utf8');
const match = content.match(/var FB_PUBLIC_LOAD_DATA_ = (\[.*?\]);/);
if (match) {
    const data = JSON.parse(match[1]);
    const findLabel = (obj) => {
        if (typeof obj === 'string') {
            if (obj.toLowerCase().includes('service')) console.log('Found string:', obj);
        } else if (Array.isArray(obj)) {
            obj.forEach(findLabel);
        } else if (obj !== null && typeof obj === 'object') {
            Object.values(obj).forEach(findLabel);
        }
    };
    findLabel(data);
}
