import fs from 'fs';

const content = fs.readFileSync('form_source_utf8.html', 'utf8');
const searchStr = "Date of Service";
const index = content.indexOf(searchStr);
if (index >= 0) {
    console.log("Found at index:", index);
    console.log("Context:", content.substring(index - 200, index + 200));
} else {
    console.log("Not found");
}
