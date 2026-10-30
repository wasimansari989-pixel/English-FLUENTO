/**
 * Text normalization utilities for bilingual English / Hindi search.
 */

export function normalizeEnglish(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeHindi(text: string): string {
  if (!text) return '';
  return text
    // Replace punctuation
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"।]/g, ' ')
    // Normalize common OCR matra / spelling alternates
    .replace(/आित/g, 'आदत')
    .replace(/चादहए/g, 'चाहिए')
    .replace(/दक/g, 'कि')
    .replace(/िे/g, 'दे')
    .replace(/िो/g, 'दो')
    .replace(/हाँ/g, 'हूँ')
    .replace(/होोंगे/g, 'होंगे')
    .replace(/बहत/g, 'बहुत')
    .replace(/पसोंि/g, 'पसंद')
    .replace(/दचोंता/g, 'चिंता')
    .replace(/इोंग्लिश/g, 'इंग्लिश')
    .replace(/हए/g, 'हुए')
    .replace(/हई/g, 'हुई')
    .replace(/अोंिर/g, 'अंदर')
    .replace(/बोंि/g, 'बंद')
    .replace(/ग्लख/g, 'खि')
    .replace(/दज/g, 'जि')
    .replace(/\s+/g, ' ')
    .trim();
}
