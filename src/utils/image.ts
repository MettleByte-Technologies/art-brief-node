// src/utils/image.ts
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function saveBase64Image(base64Data: string, panel: 'top' | 'bottom'): Promise<string> {
  const filename = `${panel}-panel-${uuidv4()}.png`;
  const outputDir = path.join(__dirname, '../../public/designs');

  // Ensure the directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, base64, 'base64');

  return `/designs/${filename}`;
}
