const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class ExtensionScreenshotTool {
  constructor() {
    this.browser = null;
    this.page = null;
    this.extensionId = null;
  }

  async init() {
    // Launch browser with extension loaded
    this.browser = await puppeteer.launch({
      headless: false, // Keep visible for debugging
      devtools: true,
      args: [
        '--disable-extensions-except=.',
        '--load-extension=.',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    // Get extension ID
    const targets = await this.browser.targets();
    const extensionTarget = targets.find(target => 
      target.type() === 'service_worker' && target.url().includes('chrome-extension://')
    );
    
    if (extensionTarget) {
      this.extensionId = extensionTarget.url().split('/')[2];
      console.log('Extension ID:', this.extensionId);
    }

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  async takeExtensionPanelScreenshot(url = 'https://techcrunch.com', filename = 'extension-panel') {
    if (!this.page) {
      throw new Error('Browser not initialized. Call init() first.');
    }

    try {
      // Navigate to a webpage
      console.log(`Navigating to ${url}...`);
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      await this.page.waitForTimeout(2000);

      // Inject content script manually (since extension loading might be tricky)
      await this.page.evaluate(() => {
        // Create a simple panel for demonstration
        if (!document.getElementById('summarizer-panel')) {
          const panel = document.createElement('div');
          panel.id = 'summarizer-panel';
          panel.innerHTML = `
            <div style="
              position: fixed;
              top: 20px;
              right: 20px;
              width: 560px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
              z-index: 10000;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
              <div style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
                <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 4px 0; color: #111827;">Summarize Slider</h1>
                <div style="font-size: 14px; color: #6b7280; margin: 0;">Gemini Flash 2.5</div>
              </div>
              <div style="padding: 30px;">
                <div style="margin-bottom: 24px;">
                  <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 2px;">ELI5 SUMMARY</div>
                  <div style="font-size: 14px; color: #6b7280;">Gemini Flash 2.5</div>
                </div>
                <div style="margin-bottom: 24px;">
                  <input type="range" min="0" max="2" value="0" style="width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; appearance: none;">
                </div>
                <button style="
                  background-color: #111827;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 8px;
                  font-size: 16px;
                  font-weight: 500;
                  cursor: pointer;
                  width: 100%;
                  position: relative;
                ">
                  Summarize
                  <span style="position: absolute; right: 24px; font-size: 12px; opacity: 0.6;">0/25 Monthly</span>
                </button>
              </div>
            </div>
          `;
          document.body.appendChild(panel);
        }
      });

      await this.page.waitForTimeout(1000);

      // Take screenshot
      const screenshotPath = path.join(__dirname, 'screenshots', `${filename}.png`);
      
      // Ensure screenshots directory exists
      const screenshotsDir = path.join(__dirname, 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      await this.page.screenshot({
        path: screenshotPath,
        type: 'png',
        fullPage: false
      });

      console.log(`Screenshot saved: ${screenshotPath}`);
      return screenshotPath;

    } catch (error) {
      console.error('Error taking screenshot:', error);
      throw error;
    }
  }

  async takeExtensionPopupScreenshot(filename = 'extension-popup') {
    // Take screenshot of just the extension panel area
    const panelElement = await this.page.$('#summarizer-panel');
    if (panelElement) {
      const screenshotPath = path.join(__dirname, 'screenshots', `${filename}.png`);
      await panelElement.screenshot({ path: screenshotPath });
      console.log(`Panel screenshot saved: ${screenshotPath}`);
      return screenshotPath;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Usage examples
async function main() {
  const tool = new ExtensionScreenshotTool();
  
  try {
    await tool.init();
    
    // Take screenshots on different sites
    const sites = [
      { url: 'https://techcrunch.com', name: 'techcrunch' },
      { url: 'https://www.wsj.com', name: 'wsj' },
      { url: 'https://www.nytimes.com', name: 'nytimes' }
    ];

    for (const site of sites) {
      try {
        await tool.takeExtensionPanelScreenshot(site.url, `panel-${site.name}`);
        await tool.takeExtensionPopupScreenshot(`popup-${site.name}`);
        await tool.page.waitForTimeout(2000); // Wait between screenshots
      } catch (error) {
        console.error(`Error with ${site.name}:`, error.message);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await tool.close();
  }
}

// Export for use as module
module.exports = ExtensionScreenshotTool;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}