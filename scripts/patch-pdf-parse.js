// Patch pdf-parse / pdf.js to support modern Node.js (Node 20+) buffer allocations
import fs from 'node:fs';
import path from 'node:path';

const workerPath = path.resolve('node_modules/pdf-parse/lib/pdf.js/v1.10.100/build/pdf.worker.js');

if (fs.existsSync(workerPath)) {
  let content = fs.readFileSync(workerPath, 'utf8');
  let changed = false;

  // Clean any debug logs
  if (content.includes('DATA_DEBUG')) {
    content = content.replace(/console\.log\("DATA_DEBUG:?"[\s\S]*?\);/, '');
    changed = true;
  }

  if (content.includes('DEBUG_CLEAN')) {
    content = content.replace(/console\.log\('DEBUG_CLEAN',[\s\S]*?\);/, '');
    changed = true;
  }

  // Ensure makeSubStream respects this.bytes.byteOffset
  const target = 'makeSubStream: function Stream_makeSubStream(start, length, dict) {\n      return new Stream(this.bytes.buffer, start, length, dict);\n    }';
  const replacement = 'makeSubStream: function Stream_makeSubStream(start, length, dict) {\n      var baseOffset = this.bytes.byteOffset || 0;\n      return new Stream(this.bytes.buffer, baseOffset + start, length, dict);\n    }';

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(workerPath, content, 'utf8');
    console.log('[patch-pdf-parse] Successfully patched pdf-parse worker for modern Node.');
  } else {
    console.log('[patch-pdf-parse] pdf-parse worker already up to date.');
  }
}
