import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';

async function run() {
  const bytes = fs.readFileSync('test.pdf');
  const doc = await PDFDocument.load(bytes);
  console.log('PDF loaded successfully');
}
run().catch(console.error);
