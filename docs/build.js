const fs = require('fs');
const path = require('path');
const marked = require('marked');

// Configure marked options
marked.setOptions({
  headerIds: true,
  gfm: true
});

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'user_guides_html');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Basic HTML template
function generateHTML(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Ticketing System Documentation</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    nav {
      background-color: #f5f5f5;
      padding: 10px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    nav a {
      margin-right: 15px;
      text-decoration: none;
      color: #0066cc;
    }
    h1, h2, h3, h4 {
      color: #0066cc;
    }
    code {
      background-color: #f5f5f5;
      padding: 2px 5px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
  </style>
</head>
<body>
  <nav>
    <a href="index.html">Home</a>
    <a href="admin_guide.html">Admin Guide</a>
    <a href="user_guide.html">User Guide</a>
  </nav>
  <div class="content">
    ${content}
  </div>
</body>
</html>`;
}

// Process all markdown files in the user_guides directory
const userGuidesDir = path.join(__dirname, 'user_guides');
const files = fs.readdirSync(userGuidesDir);

// Create index page
const indexContent = `
<h1>Ticketing System Documentation</h1>
<p>Welcome to the documentation for the Modern Management Ticketing System.</p>
<h2>Available Documentation</h2>
<ul>
  <li><a href="admin_guide.html">Administrator Guide</a> - Comprehensive guide for system administrators</li>
  <li><a href="user_guide.html">User Guide</a> - Guide for end users of the ticketing system</li>
</ul>
`;

fs.writeFileSync(
  path.join(outputDir, 'index.html'),
  generateHTML('Home', marked.parse(indexContent))
);

// Process each markdown file
files.forEach(file => {
  if (path.extname(file) === '.md') {
    const filePath = path.join(userGuidesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const htmlContent = marked.parse(content);
    
    // Extract title from first heading or use filename
    let title = file.replace('.md', '');
    const titleMatch = content.match(/^# (.*)/m);
    if (titleMatch) {
      title = titleMatch[1];
    }
    
    const outputFilename = file.replace('.md', '.html');
    fs.writeFileSync(
      path.join(outputDir, outputFilename),
      generateHTML(title, htmlContent)
    );
    
    console.log(`Converted ${file} to ${outputFilename}`);
  }
});

console.log('Documentation build complete!'); 