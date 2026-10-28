// Isolated rendering regression. No user profile, service or model requests.
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow } = require('electron');

const [page, profile] = process.argv.slice(2);
app.setPath('userData', profile);
app.commandLine.appendSwitch('disable-background-networking');
app.on('window-all-closed', () => {});

app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  try {
    await window.loadURL(pathToFileURL(page).href);
    const report = await window.webContents.executeJavaScript(`(async () => {
      const latex = ${JSON.stringify('\\rho=\\begin{pmatrix}\\frac{1}{2}&0\\\\0&\\frac{1}{2}\\end{pmatrix}')};
      const element = { latex, html: '<span>stale cache</span>', width: 1000, height: 1000 };
      const measure = FormulaLayout.formulaFontSize;
      const full = await measure(element, 4/3);
      const wider = await measure({ ...element, width: 2000, height: 2000 }, 4/3);
      const narrow = await measure({ ...element, width: 40 }, 4/3);
      const short = await measure({ ...element, height: 20 }, 4/3);
      const scaledViewport = await measure(element, 8/3);
      const encodedStyle = 'font-family: &quot;Microsoft YaHei&quot;; font-size: 30.7px; color: rgb(30, 58, 95);';
      const styles = TextExport.exportCssProperties(encodedStyle);
      const quotedFont = TextExport.pptxFontFace(styles['font-family']);
      const special = TextExport.exportCssProperties('font-family: &quot;A;B &amp; C&quot;, sans-serif;');
      const specialFont = TextExport.pptxFontFace(special['font-family']);
      return { full, wider, narrow, short, scaledViewport, residualMeasureNodes: document.querySelectorAll('.slide-renderer-prose').length, quotedFont, fontSize: styles['font-size'], specialFont };
    })()`);
    assert.ok(report.full > 10 && report.full < 20, 'matrix has the classroom base size rather than being enlarged to fill its frame');
    assert.equal(report.full, report.wider, 'enlarging an already fitting frame does not enlarge the formula');
    assert.ok(report.narrow > 0 && report.narrow < report.full, 'horizontal fit prevents wide formulas overflowing');
    assert.ok(report.short > 0 && report.short < report.full, 'vertical fit handles multi-row formulas');
    assert.ok(Math.abs(report.scaledViewport * 2 - report.full) <= 0.01, 'viewport pixels are converted to PowerPoint points');
    assert.equal(report.residualMeasureNodes, 0);
    assert.equal(report.quotedFont, 'Microsoft YaHei', 'HTML entity semicolons must not split the CSS font declaration');
    assert.equal(report.fontSize, '30.7px');
    assert.equal(report.specialFont, 'A;B & C', 'CSS quoting and fallback syntax must preserve one valid typeface');
    console.log(JSON.stringify(report));
    app.exit(0);
  } finally { window.destroy(); }
}).catch((error) => { console.error(error.stack); app.exit(1); });
