import { getDocument } from "pdfjs-dist";
import * as fs from "fs";

async function read() {
  const data = new Uint8Array(fs.readFileSync("test_out.pdf"));
  const doc = await getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent();
  
  for (const item of textContent.items) {
    console.log(item.str, item.transform[4], item.transform[5]);
  }
}

read().catch(console.error);
