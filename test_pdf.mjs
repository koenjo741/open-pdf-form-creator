import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';

async function run() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 500]);
  const form = doc.getForm();
  const tf = form.createTextField('test');
  tf.addToPage(page, { x: 50, y: 50, width: 200, height: 100 });
  tf.enableMultiline();
  tf.setText('Hello\nWorld');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  tf.updateAppearances(font);
  
  const bytes = await doc.save();
  fs.writeFileSync('test.pdf', bytes);
  console.log('PDF created');
}
run().catch(console.error);
