import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf']);
const NATIVE_AI_EXTENSIONS = new Set(['.pdf']);

export function documentCapabilities() {
  return {
    acceptedExtensions: [...SUPPORTED_EXTENSIONS],
    maxFileBytes: MAX_FILE_BYTES,
    extraction: {
      pdf: ['pdfjs-dist', 'pdf-parse', 'native-AI-fallback'],
      docx: ['mammoth', 'word-extractor'],
      doc: ['word-extractor'],
      text: ['native']
    },
    nativeAI: { extensions: [...NATIVE_AI_EXTENSIONS] }
  };
}

export async function saveAndExtractDocument({ uploadsDir, file, prefix = 'doc' }) {
  if (!file?.base64) throw new Error('Chưa chọn tệp tài liệu.');
  const raw = Buffer.from(String(file.base64), 'base64');
  if (!raw.length) throw new Error('Tệp rỗng.');
  if (raw.length > MAX_FILE_BYTES) throw new Error('Tệp vượt quá 25 MB.');
  const originalName = safeName(file.name || 'document.bin');
  const ext = path.extname(originalName).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) throw new Error('Định dạng chưa hỗ trợ. Chấp nhận PDF, DOC, DOCX, TXT, MD, RTF.');
  fs.mkdirSync(uploadsDir, { recursive: true });
  const id = crypto.randomBytes(8).toString('hex');
  const storedName = `${Date.now()}_${prefix}_${id}_${originalName}`;
  const filePath = path.join(uploadsDir, storedName);
  fs.writeFileSync(filePath, raw);

  let extractedText = '';
  let extractionStatus = 'EXTRACTED';
  let extractionMessage = '';
  let extractionEngine = '';
  try {
    const out = await extractText(filePath, raw, ext);
    extractedText = normalizeText(out.text).slice(0, 750000);
    extractionEngine = out.engine || '';
    if (!extractedText) {
      extractionStatus = NATIVE_AI_EXTENSIONS.has(ext) ? 'AI_NATIVE_READY' : 'NO_TEXT';
      extractionMessage = NATIVE_AI_EXTENSIONS.has(ext)
        ? 'Không tìm thấy lớp văn bản; tệp PDF vẫn có thể được gửi trực tiếp cho AI đa phương thức để đọc/OCR.'
        : 'Không trích xuất được văn bản máy đọc từ tệp.';
    }
  } catch (err) {
    extractionStatus = NATIVE_AI_EXTENSIONS.has(ext) ? 'AI_NATIVE_READY' : 'FAILED';
    extractionMessage = NATIVE_AI_EXTENSIONS.has(ext)
      ? `Bộ trích xuất văn bản lỗi (${err?.message || 'không xác định'}); PDF vẫn có thể gửi trực tiếp cho AI đa phương thức.`
      : (err?.message || 'Không thể trích xuất văn bản.');
  }

  return {
    originalName,
    storedName,
    fileUrl: `/uploads/${storedName}`,
    size: raw.length,
    mimeType: String(file.type || mimeFromExt(ext)),
    extension: ext,
    checksumSha256: crypto.createHash('sha256').update(raw).digest('hex'),
    extractedText,
    extractionStatus,
    extractionMessage,
    extractionEngine,
    nativeAiReadable: NATIVE_AI_EXTENSIONS.has(ext),
    analysisReady: !!extractedText || NATIVE_AI_EXTENSIONS.has(ext)
  };
}

export async function saveAndExtractDocuments({ uploadsDir, files = [], prefix = 'doc' }) {
  const out = [];
  for (const file of Array.isArray(files) ? files : []) {
    if (!file?.base64) continue;
    out.push(await saveAndExtractDocument({ uploadsDir, file, prefix }));
  }
  return out;
}

export function storedDocumentToAIFile(uploadsDir, document) {
  const inferredExt = String(document?.extension || path.extname(document?.originalName || document?.fileUrl || '')).toLowerCase();
  if (!document?.fileUrl || !(document?.nativeAiReadable || NATIVE_AI_EXTENSIONS.has(inferredExt))) return null;
  const fileName = safeName(String(document.fileUrl).replace(/^\/uploads\//, ''));
  const filePath = path.resolve(uploadsDir, fileName);
  const root = path.resolve(uploadsDir) + path.sep;
  if (!filePath.startsWith(root) || !fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath);
  return {
    name: document.originalName || fileName,
    mimeType: document.mimeType || mimeFromExt(path.extname(fileName).toLowerCase()),
    base64: raw.toString('base64'),
    size: raw.length,
    checksumSha256: document.checksumSha256 || crypto.createHash('sha256').update(raw).digest('hex')
  };
}

export function uploadedDocumentToAIFile(file) {
  if (!file?.base64) return null;
  const ext = path.extname(String(file.name || '')).toLowerCase();
  if (!NATIVE_AI_EXTENSIONS.has(ext)) return null;
  return {
    name: safeName(file.name || 'document.pdf'),
    mimeType: String(file.type || mimeFromExt(ext)),
    base64: String(file.base64),
    size: Buffer.from(String(file.base64), 'base64').length
  };
}

async function extractText(filePath, raw, ext) {
  if (ext === '.txt' || ext === '.md' || ext === '.rtf') return { text: raw.toString('utf8'), engine: 'native' };
  if (ext === '.pdf') return extractPdf(raw);
  if (ext === '.docx') {
    try {
      const mod = await import('mammoth');
      const mammoth = mod.default || mod;
      const result = await mammoth.extractRawText({ buffer: raw });
      if (String(result?.value || '').trim()) return { text: result.value, engine: 'mammoth' };
    } catch {}
    return extractWord(filePath);
  }
  if (ext === '.doc') return extractWord(filePath);
  return { text: '', engine: '' };
}

async function extractPdf(raw) {
  let firstError = null;
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(raw), disableWorker: true, useSystemFonts: true });
    const pdf = await loadingTask.promise;
    const chunks = [];
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      chunks.push(tc.items.map(x => x.str || '').join(' '));
      page.cleanup?.();
    }
    await pdf.destroy?.();
    const text = chunks.join('\n\n');
    if (text.trim()) return { text, engine: 'pdfjs-dist' };
  } catch (e) { firstError = e; }

  try {
    const mod = await import('pdf-parse');
    if (mod.PDFParse) {
      const parser = new mod.PDFParse({ data: raw });
      try {
        const result = await parser.getText();
        return { text: result?.text || '', engine: 'pdf-parse' };
      } finally {
        if (typeof parser.destroy === 'function') await parser.destroy();
      }
    }
    const pdfParse = mod.default || mod;
    const result = await pdfParse(raw);
    return { text: result?.text || '', engine: 'pdf-parse' };
  } catch (e) {
    throw firstError || e;
  }
}

async function extractWord(filePath) {
  const mod = await import('word-extractor');
  const WordExtractor = mod.default || mod;
  const extractor = new WordExtractor();
  const result = await extractor.extract(filePath);
  return { text: typeof result?.getBody === 'function' ? result.getBody() : '', engine: 'word-extractor' };
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function safeName(name) {
  return path.basename(String(name)).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 140);
}

function mimeFromExt(ext) {
  return ({
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.rtf': 'application/rtf'
  })[ext] || 'application/octet-stream';
}
