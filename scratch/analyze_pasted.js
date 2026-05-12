import fs from 'fs';

const content = fs.readFileSync('scratch/form_pasted.html', 'utf8');

// Use regex to find data-item-id and the question text
// Questions usually look like: <div class="KMPRIb" jsname="aihgHb">Label</div>
const itemRegex = /data-item-id="(\d+)"/g;
const labelRegex = /<div class="KMPRIb" jsname="aihgHb">([^<]+)<\/div>/g;

let match;
const ids = [];
while ((match = itemRegex.exec(content)) !== null) {
    ids.push(match[1]);
}

const labels = [];
while ((match = labelRegex.exec(content)) !== null) {
    labels.push(match[1]);
}

console.log("Extracted Info:");
for (let i = 0; i < Math.min(ids.length, labels.length); i++) {
    console.log(`Label: "${labels[i]}", ID: ${ids[i]}`);
}
