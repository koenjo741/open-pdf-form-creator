export function parseDateString(input: string, format: string, locale: string): Date | null {
  let resolvedFormat = format;

  if (!resolvedFormat || resolvedFormat === 'auto') {
    if (input.includes('.')) {
      resolvedFormat = 'DD.MM.YYYY';
    } else if (input.includes('/')) {
      if (locale.startsWith('en') && !locale.startsWith('en-GB')) {
        resolvedFormat = 'MM/DD/YYYY';
      } else {
        resolvedFormat = 'DD/MM/YYYY';
      }
    } else if (input.includes('-')) {
      resolvedFormat = 'YYYY-MM-DD';
    } else {
      if (locale.startsWith('de')) resolvedFormat = 'DD.MM.YYYY';
      else if (locale.startsWith('en')) resolvedFormat = 'MM/DD/YYYY';
      else if (locale.startsWith('fr') || locale.startsWith('es')) resolvedFormat = 'DD/MM/YYYY';
      else resolvedFormat = 'YYYY-MM-DD';
    }
  }

  const parts = input.match(/\d+/g);
  if (!parts || parts.length < 3) return null;

  let year, month, day;
  if (resolvedFormat === 'DD.MM.YYYY' || resolvedFormat === 'DD/MM/YYYY') {
    day = parseInt(parts[0], 10); month = parseInt(parts[1], 10); year = parseInt(parts[2], 10);
  } else if (resolvedFormat === 'MM/DD/YYYY') {
    month = parseInt(parts[0], 10); day = parseInt(parts[1], 10); year = parseInt(parts[2], 10);
  } else if (resolvedFormat === 'YYYY-MM-DD') {
    year = parseInt(parts[0], 10); month = parseInt(parts[1], 10); day = parseInt(parts[2], 10);
  } else {
    return null;
  }

  if (year < 100) {
    year += year > 50 ? 1900 : 2000;
  }

  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

export function isValidIBAN(iban: string) {
  const str = iban.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (str.length < 15 || str.length > 34) return false;
  const reordered = str.substring(4) + str.substring(0, 4);
  const numeric = reordered.split('').map(c => {
    const code = c.charCodeAt(0);
    return code >= 65 && code <= 90 ? (code - 55).toString() : c;
  }).join('');
  let remainder = numeric;
  let block;
  while (remainder.length > 2) {
    block = remainder.slice(0, 9);
    remainder = (parseInt(block, 10) % 97) + remainder.slice(block.length);
  }
  return parseInt(remainder, 10) % 97 === 1;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidURL(url: string) {
  const pattern = new RegExp(
    '^([a-zA-Z]+:\\/\\/)?' + // protocol
    '((([a-zA-Z\\d]([a-zA-Z\\d-]*[a-zA-Z\\d])*)\\.)+[a-zA-Z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*' + // port and path
    '(\\?[;&a-zA-Z\\d%_.~+=-]*)?' + // query string
    '(\\#[-a-zA-Z\\d_]*)?$', 'i'
  );
  return !!pattern.test(url);
}

export function parseNumberStrict(val: string) {
  if (!val) return NaN;
  if (val.includes(',') && (!val.includes('.') || val.indexOf('.') < val.indexOf(','))) {
     return parseFloat(val.replace(/\./g, '').replace(',', '.'));
  }
  return parseFloat(val.replace(/,/g, ''));
}
