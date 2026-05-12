import fs from 'fs';

const content = fs.readFileSync('form_source_utf8.html', 'utf8');
const match = content.match(/var FB_PUBLIC_LOAD_DATA_ = (\[.*?\]);/);
if (match) {
    const data = JSON.parse(match[1]);
    const fields = data[1][1];
    fields.forEach(f => {
        const id = f[0];
        const label = f[1];
        const type = f[3];
        const entryId = f[4] && f[4][0] && f[4][0][0];
        console.log(`Label: "${label}", ID: ${id}, EntryID: entry.${entryId}, Type: ${type}`);
        if (type === 9) {
            console.log("--- FOUND DATE FIELD ---");
            console.log(JSON.stringify(f, null, 2));
        }
    });
} else {
    console.log("FB_PUBLIC_LOAD_DATA_ not found");
}
