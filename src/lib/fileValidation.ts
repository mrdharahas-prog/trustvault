export interface FileValidationResult {
  valid: boolean;
  mimeType: string;
  error?: string;
}

export async function validateMagicBytes(file: File): Promise<FileValidationResult> {
  const buffer = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // PDF: %PDF- (25 50 44 46 2D)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { valid: true, mimeType: 'application/pdf' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0D &&
    bytes[5] === 0x0A &&
    bytes[6] === 0x1A &&
    bytes[7] === 0x0A
  ) {
    return { valid: true, mimeType: 'image/png' };
  }

  // JPEG / JPG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { valid: true, mimeType: 'image/jpeg' };
  }

  return {
    valid: false,
    mimeType: file.type || 'unknown',
    error: 'Spoofed or unsupported binary header. Failed magic-byte inspection (expected authentic PDF, PNG, or JPEG header bytes).'
  };
}