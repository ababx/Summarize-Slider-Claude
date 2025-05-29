const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function takeExtensionScreenshot() {
  let browser;
  
  try {
    // Launch Chrome with your extension loaded
    browser = await puppeteer.launch({
      headless: false, // Keep visible so you can see what's happening
      devtools: false,
      args: [
        `--disable-extensions-except=${__dirname}`,
        `--load-extension=${__dirname}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920,1080'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to a good demo site
    console.log('Navigating to demo site...');
    await page.goto('https://techcrunch.com/2024/01/15/openai-gpt-store/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for page to fully load
    await page.waitForTimeout(3000);

    // You'll need to manually activate the extension here
    console.log('Please manually click the extension icon and activate the panel...');
    console.log('Press Enter when the panel is visible and ready for screenshot...');
    
    // Wait for user input
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    // Create screenshots directory
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Take full page screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(screenshotsDir, `extension-demo-${timestamp}.png`);
    
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
      type: 'png'
    });

    console.log(`Screenshot saved to: ${screenshotPath}`);

    // Keep browser open for manual interaction
    console.log('Browser will stay open for 30 seconds for manual interaction...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error taking screenshot:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Also create a function to take targeted screenshots
async function takeTargetedScreenshot(selector, filename) {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${__dirname}`,
        `--load-extension=${__dirname}`,
        '--no-sandbox'
      ]
    });

    const page = await browser.newPage();
    await page.goto('https://example.com');
    
    // Wait for the element
    await page.waitForSelector(selector, { timeout: 10000 });
    
    // Take screenshot of specific element
    const element = await page.$(selector);
    if (element) {
      const screenshotsDir = path.join(__dirname, 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      
      await element.screenshot({ 
        path: path.join(screenshotsDir, `${filename}.png`)
      });
      console.log(`Targeted screenshot saved: ${filename}.png`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args[0] === 'targeted' && args[1] && args[2]) {
  takeTargetedScreenshot(args[1], args[2]);
} else {
  takeExtensionScreenshot();
}