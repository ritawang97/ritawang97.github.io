const copyButton = document.getElementById('copy-email');
const copyStatus = document.getElementById('copy-status');
const contactEmail = document.querySelector('.contact-email');

if (copyButton && copyStatus && contactEmail) {
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(contactEmail.textContent.trim());
      copyStatus.textContent = 'Email address copied.';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(contactEmail);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      let copied = false;
      try { copied = document.execCommand('copy'); } catch {}
      copyStatus.textContent = copied
        ? 'Email address copied.'
        : 'Select and copy the email address above.';
    }
  });
}
