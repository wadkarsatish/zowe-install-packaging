/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2018, 2019
 */

const path = require('path');
const expect = require('chai').expect;
const debug = require('debug')('zowe-sanity-test:e2e:api-catalog');
const addContext = require('mochawesome/addContext');
const testName = path.basename(__filename, path.extname(__filename));

const {
  MVD_IFRAME_APP_CONTENT,
  saveScreenshot,
  getDefaultDriver,
  waitUntilElement,
  loginMVD,
  launchApp,
  locateApp,
  waitUntilIframe,
  getElementText,
  switchToIframeAppContext,
  saveScreenshotWithIframeAppContext,
} = require('./utils');
let driver;

const APP_TO_TEST = 'API Catalog';

describe(`test ${APP_TO_TEST}`, function() {
  before('verify environment variable and load login page', async function() {
    expect(process.env.ZOWE_EXTERNAL_HOST, 'ZOWE_EXTERNAL_HOST is empty').to.not.be.empty;
    expect(process.env.SSH_USER, 'SSH_USER is not defined').to.not.be.empty;
    expect(process.env.SSH_PASSWD, 'SSH_PASSWD is not defined').to.not.be.empty;
    expect(process.env.ZOWE_ZLUX_HTTPS_PORT, 'ZOWE_ZLUX_HTTPS_PORT is not defined').to.not.be.empty;

    // init webdriver
    driver = await getDefaultDriver();
    debug('webdriver initialized');

    // load MVD login page
    await loginMVD(
      driver,
      `https://${process.env.ZOWE_EXTERNAL_HOST}:${process.env.ZOWE_API_MEDIATION_GATEWAY_HTTP_PORT}/zlux/ui/v1/ZLUX/plugins/org.zowe.zlux.bootstrap/web/`,
      process.env.SSH_USER,
      process.env.SSH_PASSWD
    );
  });

  it('should launch app correctly', async function() {
    // load app
    await launchApp(driver, APP_TO_TEST);
    const app = await locateApp(driver, APP_TO_TEST);
    expect(app).to.be.an('object');
    debug('app launched');

    // save screenshot
    const file = await saveScreenshot(driver, testName, 'app-loading');
    addContext(this, file);

    // locate app iframe
    const iframe = await waitUntilIframe(driver, 'rs-com-mvd-iframe-component > iframe', app);
    expect(iframe).to.be.an('object');
    debug('app iframe found');

    // wait for atlas iframe
    const atlas = await waitUntilIframe(driver, 'iframe#zluxIframe');
    expect(atlas).to.be.an('object');
    debug('iframe is ready');

    // to avoid StaleElementReferenceError, find the iframes context again
    await switchToIframeAppContext(driver, APP_TO_TEST, MVD_IFRAME_APP_CONTENT);

    // wait for page is loaded
    try {
      const searchBox = await waitUntilElement(driver, '.search-bar');
      expect(searchBox).to.be.an('object');
      await saveScreenshotWithIframeAppContext(this, driver, testName, 'login-pre-success', APP_TO_TEST, MVD_IFRAME_APP_CONTENT);

    } catch (e) {
      // try to save screenshot for debug purpose
      await saveScreenshotWithIframeAppContext(this, driver, testName, 'login-failed', APP_TO_TEST, MVD_IFRAME_APP_CONTENT);

      const errName = e && e.name;
      if (errName === 'TimeoutError') {
        expect(errName).to.not.equal('TimeoutError');
      } else {
        expect(e).to.be.null;
      }
    }

    // save screenshot
    await saveScreenshotWithIframeAppContext(this, driver, testName, 'app-loaded', APP_TO_TEST, MVD_IFRAME_APP_CONTENT);

    const productNameText = await getElementText(driver, '.product-name');
    expect(productNameText).to.equal(APP_TO_TEST);

    // TODO: check listed "Available APIs"

    debug('page is fully loaded');
  });

  after('quit webdriver', async function() {
    // quit webdriver
    if (driver) {
      await driver.quit();
    }
  });
});
