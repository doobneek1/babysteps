
const inputText = document.getElementById('inputText');
const rawHtml = document.getElementById('rawHtml');
const preview = document.getElementById('preview');
let typingTimer = null;
function protectHtml(html) {
  return html
    .replace(/&emsp;/g, '&amp;emsp;')   // protect emsp so it shows as text
    .replace(/<br>/g, '&lt;br&gt;');     // protect <br> so it shows as text
}



function escapeHtml(unsafe) {
  return unsafe.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&#039;");
}

function recolorHtmlByLinkType(htmlString) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  tempDiv.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href') || '';
    const span = document.createElement('span');
    if (href.startsWith('mailto:')) span.style.color = 'red';
    else if (href.startsWith('tel:')) span.style.color = 'green';
    else if (href.startsWith('http')) span.style.color = 'blue';
    span.innerHTML = escapeHtml(link.outerHTML);
    link.replaceWith(span);
  });
  return tempDiv.innerHTML;
}

function highlightHtml(html) {
  return html.replace(/(&lt;a href=&quot;mailto:[^&]+&quot;.*?&lt;\/a&gt;)/gi, '<span style="color:red;">$1</span>')
             .replace(/(&lt;a href=&quot;tel:[^&]+&quot;.*?&lt;\/a&gt;)/gi, '<span style="color:green;">$1</span>')
             .replace(/(&lt;a href=&quot;https?:\/\/[^&]+&quot;.*?&lt;\/a&gt;)/gi, '<span style="color:blue;">$1</span>')
             .replace(/(&lt;br&gt;)/gi, '<span style="color:gray;">$1</span>')
             .replace(/(&lt;\/?[a-z]+.*?&gt;)/gi, '<span style="color:gray;">$1</span>');
}

function formatTimeRange(text) {
  return text.replace(/(\d{1,4}[ap])-(\d{1,4}[ap])/gi, (_, start, end) => {
    const parseTime = (t) => {
      let period = t.includes('a') ? 'AM' : 'PM';
      t = t.replace(/[ap]/i, '');
      let hours = parseInt(t.length > 2 ? t.slice(0, 2) : t[0]);
      let minutes = parseInt(t.length > 2 ? t.slice(2) : 0);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return new Date(0, 0, 0, hours, minutes);
    };
    let startTime = parseTime(start);
    let endTime = parseTime(end);
    let nextDay = endTime < startTime ? "⁺¹" : "";
    return `${startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} — ${endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}${nextDay}`;
  });
}

function formatAge(text) {
  return text.replace(/age\((.+?)\)/gi, (_, ages) => {
    let nums = ages.split(/[-,]/).map(Number);
    return nums.length === 2
      ? `Age requirement: ${nums[0]}-${nums[1]} (until your ${nums[1] + 1}th birthday)`
      : `Age requirement: ${nums[0]}+`;
  });
}

function safeHyperlink(text) {
  return text
    // Custom phone with label
    .replace(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\|\(([^)]+)\)/g, (m, num, label) => {
      let clean = num.replace(/\D/g, '');
      return `<a href="tel:${clean}">${label}</a>`;
    })

    // Custom email with label
    .replace(/([\w\.-]+@[\w\.-]+\.\w+)\|\(([^)]+)\)/g, (m, email, label) => {
      return `<a href="mailto:${email}">${label}</a>`;
    })

    // Custom URL with label
    .replace(/(https?:\/\/[^\s<>\|]+)\|\(([^)]+)\)/g, (m, url, label) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    })

    // Raw email
    .replace(/(?<!href="mailto:)([\w\.-]+@[\w\.-]+\.\w+)/g, (m, email) => {
      return `<a href="mailto:${email}">${email}</a>`;
    })

    // Raw phone with optional extension
    .replace(/(?<!href="tel:)(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})(?:[,xX]\s*(\d+))?/g, (m, num, ext) => {
      let clean = num.replace(/\D/g, '');
      let formatted = `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
      if (ext) {
        return `<a href="tel:${clean},${ext}">${formatted} x${ext}</a>`;
      } else {
        return `<a href="tel:${clean}">${formatted}</a>`;
      }
    })

    // Raw URL
    .replace(/(?<!href=")(https?:\/\/[^\s<>\|)]+)/g, (url) => {
      let display = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${display}</a>`;
    });
}

function processText(input) {
  let lines = input.split('\n');
  let output = [];

  lines.forEach((line, index) => {
    line = line.trim();
    if (!line) return;

    if (line.startsWith('-')) {
      // Line starts with dash: indent it
      line = line.replace(/^-\s*/, '');
      output.push((index !== 0 ? '\n' : '')+'<br>&emsp;— ' + line);
    } else {
      // Regular bullet point
      output.push((index !== 0 ? '\n' : '') + '• ' + line);
    }
  });

  return output.join('');
}






function inputHandler() {
  const raw = inputText.innerText.trim();
  let processedOutput = processText(raw);

  processedOutput = formatTimeRange(processedOutput);  // ← fix times
  processedOutput = formatAge(processedOutput);        // ← fix ages
  const hyperlinked = safeHyperlink(processedOutput);  // ← finally make links

  preview.innerHTML = hyperlinked;                     // ← Show hyperlinks live
  colorPreviewLinks();                                 // ← Color them in preview

  const protectedOutput = protectHtml(hyperlinked);    // ← Protect for HTML view
  rawHtml.innerHTML = recolorHtmlByLinkType(protectedOutput);

  colorInputText();                                    // ← Recolor input box
}



function colorPreviewLinks() {
  preview.querySelectorAll('a').forEach(link => {
    if (link.href.startsWith('mailto:')) link.style.color = '#d93025';
    else if (link.href.startsWith('tel:')) link.style.color = '#188038';
    else if (link.href.startsWith('http')) link.style.color = '#1a73e8';
  });
}

function colorInputText() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const cursorPosition = range.endOffset;

  const text = inputText.innerText;
  const colored = text
    .replace(/([\w.-]+@[\w.-]+\.\w+)/g, '<span style="color:#d93025;">$1</span>')
    .replace(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,})/g, '<span style="color:#188038;">$1</span>')
    .replace(/(https?:\/\/[^\s<>\|]+)/g, '<span style="color:#1a73e8;">$1</span>');

  inputText.innerHTML = colored;

  // Restore cursor safely at the end
  const newRange = document.createRange();
  const lastTextNode = inputText;
  newRange.selectNodeContents(lastTextNode);
  newRange.collapse(false);

  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(newRange);
}

inputText.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const br = document.createElement('br');
    range.insertNode(br);
    range.setStartAfter(br);
    range.setEndAfter(br);
    selection.removeAllRanges();
    selection.addRange(range);
  }
});

inputText.addEventListener('paste', (e) => {
  e.preventDefault();
  const clipboard = e.clipboardData || window.clipboardData;
  const htmlData = clipboard.getData('text/html');
  const plainTextData = clipboard.getData('text/plain');
  let cleanText = plainTextData;

  if (htmlData) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlData;
    const links = tempDiv.querySelectorAll('a');
    if (links.length) {
      cleanText = Array.from(links).map(link => link.innerText.trim()).join(' ');
    } else {
      cleanText = tempDiv.innerText.trim();
    }
  }
  cleanText = cleanText.replace(/.*?">/g, '').replace(/<\/?[^>]+(>|$)/g, '');

  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(cleanText));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);

  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    inputHandler();
  }, 100);
});

// Copy Button
document.getElementById('copyButton').addEventListener('click', () => {
  const textToCopy = rawHtml.innerText;
  navigator.clipboard.writeText(textToCopy).then(() => {
    const button = document.getElementById('copyButton');
    button.innerText = 'Copied!';
    setTimeout(() => {
      button.innerText = 'Copy HTML';
    }, 1500);
  });
});
document.getElementById('forceUpdateButton').addEventListener('click', () => {
  inputHandler(); // NOW it fully recolors the input
  const button = document.getElementById('forceUpdateButton');
  button.style.backgroundColor = '#d0f0c0'; // Light green flash
  setTimeout(() => {
    button.style.backgroundColor = '';
  }, 300);
});
// Add default example when page loads
window.addEventListener('DOMContentLoaded', () => {
  inputText.innerText = `-Food, clothing, shelter, and more at example.org\n
(212) 555-1234\n
https://example.org|(Visit us!)\n
age(14-24)\n
9a-5p, 10p-6a
email@email.com`;

  // Programmatically "activate" the field
  inputText.focus();   // Focus the field
  inputText.blur();    // Then blur it to trigger listeners

  // Trigger inputHandler manually
  inputHandler();

  // Optional: click "Update Now" button
  setTimeout(() => {
    document.getElementById('forceUpdateButton').click();
  }, 200); // shorter delay now is fine
});
