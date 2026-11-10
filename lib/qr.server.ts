import QRCode from 'qrcode';

/**
 * QR code as an SVG string, made on the server by the `qrcode` package (MIT). No third-party QR
 * service is called, so no outside party learns which cards exist. Error correction M survives a
 * scuffed card.
 */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#1B1A17', light: '#FFFFFF' } });
}
