# Digital Signature Bridge Contract — V5.5.1

RIS gọi bridge thông qua HTTPS. Private key không được trả về RIS.

## POST /sign
Request:
```json
{
  "capability": "digital.signature.sign",
  "payload": {
    "instanceId": "...",
    "templateId": "...",
    "templateVersion": "1.0.0",
    "documentVersion": 1,
    "values": {}
  },
  "certificateFingerprint": "SHA256...",
  "certificateSerial": "..."
}
```

Response tối thiểu:
```json
{
  "algorithm": "...",
  "signature": "base64...",
  "payloadHash": "SHA256...",
  "verificationStatus": "SIGNED_BY_EXTERNAL_PKI",
  "trustLevel": "PKI_EXTERNAL",
  "timestamp": "..."
}
```

## POST /verify
Request gồm `payload` và bản ghi `signature` do RIS lưu.

Response:
```json
{
  "ok": true,
  "status": "VALID",
  "chainStatus": "VALID",
  "revocationStatus": "GOOD",
  "timestampStatus": "VALID"
}
```

## Trách nhiệm bắt buộc của bridge production
- Chọn đúng chứng thư/private key theo fingerprint/serial.
- Không xuất private key.
- Thực hiện ký bằng USB Token/HSM/remote signing tương ứng.
- Kiểm tra certificate chain đến trust anchor được cấu hình.
- Kiểm tra thời hạn, key usage/EKU phù hợp.
- Kiểm tra thu hồi qua OCSP/CRL khi hạ tầng hỗ trợ.
- Xử lý timestamp nếu chính sách yêu cầu.
- Trả về trạng thái kiểm tra có thể audit được.
