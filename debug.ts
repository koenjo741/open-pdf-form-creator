import { renderTiptapLayerToPDF } from "./src/utils/generators/renderTiptapLayer";
import { PDFDocument, StandardFonts } from "pdf-lib";
import * as fs from "fs";

async function test() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  
  const content = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "ALEPH ________" }
        ]
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "ALPHA ________" }
        ]
      }
    ]
  };

  const font = await doc.embedFont(StandardFonts.Helvetica);
  renderTiptapLayerToPDF(page, content as any, font, font);
  
  const bytes = await doc.save();
  fs.writeFileSync("test_out.pdf", bytes);
  console.log("Done");
}

test().catch(console.error);
