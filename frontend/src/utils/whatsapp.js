// wa.me links need the FULL international number, no leading zero, no spaces/dashes/+.
// Most listings store the contact as a local Pakistani number (e.g. "0300-1234567"),
// which WhatsApp will silently reject. This normalizes it to "923001234567".
export const toWhatsAppNumber = (contact) => {
  if (!contact) return "";
  let num = String(contact).replace(/[^\d]/g, ""); // strip spaces, dashes, +, brackets

  if (num.startsWith("0")) {
    num = "92" + num.slice(1); // 0300... -> 92300...
  } else if (!num.startsWith("92")) {
    num = "92" + num; // assume country code was left out entirely
  }

  return num;
};
