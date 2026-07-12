const { PDFDocument, PDFName, PDFString, PDFHexString } = require('pdf-lib');
const fs = require('fs');

async function run() {
  const doc = await PDFDocument.create();
  
  const payload = {
    version: 1,
    app: 'OpenPdfFormCreator',
    fields: Array.from({ length: 500 }).map((_, i) => ({ id: `field_${i}`, x: 100, y: 100, w: 100, h: 100, label: `Label ${i}` }))
  };
  
  const b64 = btoa(encodeURIComponent(JSON.stringify(payload)));
  console.log('b64 length:', b64.length);
  
  doc.catalog.set(PDFName.of('OpenPdfFormCreatorState'), PDFString.of(b64));
  
  const bytes = await doc.save();
  fs.writeFileSync('test.pdf', bytes);
  
  // Now try to load it
  const loaded = await PDFDocument.load(bytes);
  const stateNode = loaded.catalog.get(PDFName.of('OpenPdfFormCreatorState'));
  
  let recoveredB64 = '';
  if (typeof stateNode.decodeText === 'function') {
    recoveredB64 = stateNode.decodeText();
  } else if (stateNode.value) {
    recoveredB64 = stateNode.value;
  }
  
  console.log('recovered matches?', recoveredB64 === b64);
  console.log('recovered length:', recoveredB64.length);
}

run().catch(console.error);
