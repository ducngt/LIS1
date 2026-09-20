# Wire-Adapter-DocumentExtractor

Implementation adapter for the `document.text.extract` capability.

Supported source formats in V5: PDF, DOC, DOCX, TXT, Markdown and basic RTF text extraction.
The adapter is infrastructure-facing: Smart Boxes request document text extraction through the capability contract and do not import parser libraries directly.

## Responsibilities
- validate file size and type;
- persist the original uploaded file through the binary-storage path used by the Assembly;
- extract machine-readable text where supported;
- compute SHA-256 provenance metadata;
- return extraction status without inventing missing text.

## Non-responsibilities
- no workflow decision logic;
- no academic judgment;
- no approval/rejection authority;
- no AI inference.
