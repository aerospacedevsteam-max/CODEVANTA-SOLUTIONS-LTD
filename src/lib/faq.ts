export interface FaqEntry {
  q: string;
  a: string;
  group: 'Buying' | 'Downloads' | 'Licensing' | 'Support';
}

export const faqs: FaqEntry[] = [
  {
    group: 'Buying',
    q: 'What exactly do I receive when I buy a product?',
    a: 'A ZIP archive containing the files listed in the product’s “What’s included” section — for example HTML, CSS and JavaScript files, spreadsheets, documentation and the licence. Nothing physical is shipped.',
  },
  {
    group: 'Buying',
    q: 'Do I need an account to buy?',
    a: 'You can browse and build a cart as a guest. To check out you sign in or create a free account, because your purchases and downloads are stored securely against your account.',
  },
  {
    group: 'Buying',
    q: 'Which payment methods do you accept?',
    a: 'Payments are handled on our payment provider’s secure hosted checkout; we never see or store your card details. The methods available are shown at checkout. While online payment is not yet available, checkout completes your order without taking payment and your files appear in your account straight away.',
  },
  {
    group: 'Buying',
    q: 'Why are some products marked “In development”?',
    a: 'We only sell a product once its files have been created and checked. Products marked “In development” are visible so you can see what is coming, but they cannot be purchased yet.',
  },
  {
    group: 'Downloads',
    q: 'How do I download my files after paying?',
    a: 'Once your payment is confirmed by the payment provider, the product appears under Account → Downloads. Each download link is generated on request and expires after a short time, so always start downloads from your account.',
  },
  {
    group: 'Downloads',
    q: 'Is there a limit on downloads?',
    a: 'Each purchase includes a generous number of downloads (shown next to the product in your account) to prevent link sharing. If you reach the limit, contact support and we will help.',
  },
  {
    group: 'Downloads',
    q: 'My payment went through but I cannot see my download.',
    a: 'Payment confirmation usually takes a few seconds but can occasionally take longer. Refresh your Downloads page after a minute. If it still does not appear, raise a support request with your order number.',
  },
  {
    group: 'Licensing',
    q: 'Can I use the templates for client projects?',
    a: 'Yes. The standard licence lets you build unlimited end products for yourself or your clients. You may not resell or redistribute the files themselves as templates or kits. See the Digital Product Licence for full terms.',
  },
  {
    group: 'Licensing',
    q: 'Can I modify the files?',
    a: 'Yes — you can edit, adapt and combine the files in your own end products.',
  },
  {
    group: 'Support',
    q: 'What if a file does not work as described?',
    a: 'Contact support with your order number and a description of the problem. If we cannot fix a genuine defect, you may be eligible for a refund under our Refund & Cancellation Policy.',
  },
  {
    group: 'Support',
    q: 'Do you offer customisation services?',
    a: 'Product support covers questions about the files as supplied. For custom work, send us an enquiry through the contact page.',
  },
];
