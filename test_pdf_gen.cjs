const { PDFDocument, PDFName, PDFString } = require('pdf-lib');
const fs = require('fs');

async function run() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const form = pdfDoc.getForm();
  const tf = form.createTextField('test.email');
  tf.addToPage(page, { x: 50, y: 50, width: 200, height: 50 });

  let validationRegex = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';
  let validationMsg = 'Bitte eine gültige E-Mail-Adresse eingeben';

  const safeRegex = validationRegex.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const errorMsg = validationMsg.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  
  const jsCode = `
var re = new RegExp("${safeRegex}");
if (event.value && !re.test(event.value)) {
  app.alert("${errorMsg}");
  event.rc = false;
}
`;

  console.log("Generated JS:\n", jsCode);

  const jsAction = pdfDoc.context.obj({ Type: 'Action', S: 'JavaScript', JS: PDFString.of(jsCode) });
  
  let aaDict = pdfDoc.context.obj({});
  tf.acroField.dict.set(PDFName.of('AA'), aaDict);
  aaDict.set(PDFName.of('V'), jsAction);

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('test.pdf', pdfBytes);
}

run();
