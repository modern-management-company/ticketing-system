const fs = require('fs');
const path = require('path');
const marked = require('marked');

// Set up marked options
marked.setOptions({
  headerIds: true,
  gfm: true
});

// Create user_guides_html directory if it doesn't exist
const htmlDir = path.join(__dirname, 'user_guides_html');
if (!fs.existsSync(htmlDir)) {
  fs.mkdirSync(htmlDir);
}

// Get all markdown files from user_guides directory
const guidesDir = path.join(__dirname, 'user_guides');
const mdFiles = fs.readdirSync(guidesDir).filter(file => file.endsWith('.md'));

// Create HTML header with CSS styling
const htmlHeader = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Modern Management Ticketing System</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      color: #0366d6;
    }
    h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }
    h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }
    h3 { font-size: 1.25em; }
    pre {
      background-color: #f6f8fa;
      border-radius: 3px;
      padding: 16px;
      overflow: auto;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    }
    code {
      background-color: rgba(27, 31, 35, 0.05);
      border-radius: 3px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      padding: 0.2em 0.4em;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    a {
      color: #0366d6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    table th, table td {
      border: 1px solid #dfe2e5;
      padding: 6px 13px;
    }
    table th {
      background-color: #f6f8fa;
      font-weight: 600;
    }
    nav.toc {
      background-color: #f6f8fa;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 5px;
    }
    nav.toc h4 {
      margin-top: 0;
    }
    .back-to-top {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: #0366d6;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <nav class="toc">
    <h4>Documentation Contents</h4>
    <ul>
      ${mdFiles.map(file => {
        const name = file.replace('.md', '');
        const title = name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        return `<li><a href="${name}.html">${title}</a></li>`;
      }).join('\n      ')}
    </ul>
  </nav>
`;

const htmlFooter = `
  <a href="#" class="back-to-top">Back to Top</a>
  <script>
    // Add IDs to all headers for linking
    document.querySelectorAll('h2, h3, h4, h5, h6').forEach(header => {
      if (!header.id) {
        const id = header.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        header.id = id;
      }
    });
    
    // Create TOC for the current page
    const toc = document.createElement('div');
    toc.innerHTML = '<h4>Table of Contents</h4><ul></ul>';
    const tocList = toc.querySelector('ul');
    
    document.querySelectorAll('h2, h3').forEach(header => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + header.id;
      a.textContent = header.textContent;
      li.style.marginLeft = (header.tagName === 'H3' ? '20px' : '0');
      li.appendChild(a);
      tocList.appendChild(li);
    });
    
    // Insert TOC after the nav element
    const nav = document.querySelector('nav.toc');
    nav.after(toc);
  </script>
</body>
</html>`;

// Convert each markdown file to HTML
mdFiles.forEach(file => {
  const filePath = path.join(guidesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const htmlContent = marked.parse(content);
  
  const htmlFileName = file.replace('.md', '.html');
  const htmlFilePath = path.join(htmlDir, htmlFileName);
  
  fs.writeFileSync(htmlFilePath, htmlHeader + htmlContent + htmlFooter);
  
  console.log(`Converted ${file} to ${htmlFileName}`);
});

// Create index.html that redirects to the first guide
const indexPath = path.join(__dirname, 'index.html');
const firstGuide = mdFiles.length > 0 ? mdFiles[0].replace('.md', '.html') : '';

const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=user_guides_html/${firstGuide}">
  <title>Modern Management Ticketing System - Documentation</title>
</head>
<body>
  <p>Redirecting to <a href="user_guides_html/${firstGuide}">documentation</a>...</p>
</body>
</html>`;

fs.writeFileSync(indexPath, indexContent);
console.log('Created index.html with redirect');

console.log('Documentation conversion complete!'); 