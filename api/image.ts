import { NowRequest, NowResponse } from '@vercel/node'
import { launch, Page } from 'puppeteer-core'
import chrome from 'chrome-aws-lambda'
import fs, { readFileSync } from 'fs'
import * as path from 'path'
import * as os from 'os'


let _page: Page | null

export default async function (req: NowRequest, res: NowResponse) {
  try {
    const { authorization } = req.headers;

    if (authorization === `Bearer ${process.env.API_SECRET_KEY}`) {
      const postBody = req.body
      let cssString = String(req.body.css) || ''
      const type = String(postBody.type) === 'jpeg' ? 'jpeg' : ('png' as const)
      const html = String(postBody.html) || ''
      const waitUntil = (() => {
        const allowedValues = [
          'load',
          'domcontentloaded',
          'networkidle0',
          'networkidle2',
        ] as const
        const value = String(postBody.waitUntil)
        const index = allowedValues.indexOf(value as any)
        return allowedValues[index] || 'networkidle0'
      })()
      const result = await renderImage({
        html,
        type,
        width: postBody.width || 1080,
        height: postBody.height || 1350,
        deviceScaleFactor: 1,
        waitUntil,
        js: String(postBody.js || ''),
        css: String(cssString || ''),
      })
      res.setHeader('Content-Type', 'image/' + type)
      res.setHeader(
        'Cache-Control',
        `public, immutable, no-transform, s-maxage=31536000, max-age=31536000`
      )
      if (result instanceof Buffer) {
        res.status(201).send(result.toString("base64"))
      } else {
        res.status(500)
      }
    } else {
      res.status(401).json({ error: { message: 'Unauthorized' } })
    }
  } catch (error) {
    console.error(error)
  }
}

interface ScreenshotOptions {
  html: string
  width: number
  height: number
  css: string
  js: string
  deviceScaleFactor: number
  type: 'jpeg' | 'png'
  waitUntil: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'
}

async function renderImage({
  html,
  type,
  width,
  height,
  css,
  js,
  deviceScaleFactor,
  waitUntil,
}: ScreenshotOptions) {
  let page = await getPage()
  await page.setViewport({ width, height, deviceScaleFactor })
  //await page
  //  .goto(file, { waitUntil, timeout: 6400 })
  //  .catch((e) => console.error(e))
  await page.setContent(html)

  if (js) {
    await page
      .evaluate(async (code) => {
        try {
          await eval(code)
        } catch (e) {
          const errorBox = document.createElement(
            'personal-puppeteer-error-box'
          )
          errorBox.setAttribute(
            'style',
            `position: fixed; bottom: 0; right: 0; background: red; color: white; z-index: 999999999; padding: 10px;`
          )
          errorBox.textContent = String(e)
          document.body.appendChild(errorBox)
        }
      }, js)
      .catch(console.error)
  }
  // See: https://github.com/puppeteer/puppeteer/issues/511
  await page.evaluate(async (css) => {
    const style = document.createElement('style')
    style.textContent = `
      ${css}
    `
    document.head.appendChild(style)
    document.documentElement.dataset.screenshotMode = '1'
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
  }, css || '')
  return await page.screenshot({ type })
}

async function patchFontConfig() {
  if (fs.existsSync('/tmp/aws/fonts.conf')) {
    let contents = fs.readFileSync('/tmp/aws/fonts.conf', 'utf8')
    if (!contents.includes('<!-- patched -->')) {
      console.error('Patching fontconfig...')
      const extraRules = `
        <match target="pattern">
          <test qual="any" name="family"><string>sans-serif</string></test>
          <edit name="family" mode="prepend" binding="same"><string>Arimo</string></edit>
        </match>
      `
      contents = contents
        .replace('<dir>/tmp/aws/.fonts</dir>', '')
        .replace(/<\/fontconfig>/, extraRules + '<!-- patched --></fontconfig>')
      fs.writeFileSync('/tmp/aws/fonts.conf', contents)
    }
  }
}

async function getPage() {
  let page = _page
  if (!page) {
    const chromePathOnLambda = await chrome.executablePath
    const fonts = [
      'https://cdn.jsdelivr.net/gh/googlei18n/noto-emoji@948b1a7f1ed4ec7e27930ad8e027a740db3fe25e/fonts/NotoColorEmoji.ttf',
      'https://cdn.jsdelivr.net/gh/googlefonts/Arimo@dcb3e77c8800e3a35974ce45e23e1a983e1682d4/fonts/ttf/Arimo-Regular.ttf',
      'https://cdn.jsdelivr.net/gh/googlefonts/Arimo@dcb3e77c8800e3a35974ce45e23e1a983e1682d4/fonts/ttf/Arimo-Bold.ttf',
      'https://cdn.jsdelivr.net/gh/googlefonts/Arimo@dcb3e77c8800e3a35974ce45e23e1a983e1682d4/fonts/ttf/Arimo-Italic.ttf',
      'https://cdn.jsdelivr.net/gh/googlefonts/Arimo@dcb3e77c8800e3a35974ce45e23e1a983e1682d4/fonts/ttf/Arimo-BoldItalic.ttf',
      'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@8194fd72cbc46bb88e8246b68e42b96cbef0c700/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
      'https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@165c01b46ea533872e002e0785ff17e44f6d97d8/Sans/OTC/NotoSansCJK-Regular.ttc',
      'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@8194fd72cbc46bb88e8246b68e42b96cbef0c700/hinted/ttf/NotoSansThai/NotoSansThai-Regular.ttf',
    ]
    await Promise.all(
      fonts.map(async (f) =>
        chrome.font(f).catch((e) => {
          console.error('Unable to fetch font %s', f, e)
        })
      )
    )
    // Disabled because it is not compatible with the latest version…
    // await patchFontConfig()
    const browser = await launch({
      args: [...chrome.args, '--font-render-hinting=none'],
      executablePath: chromePathOnLambda || '/usr/bin/chromium-browser',
      headless: true,
    })
    page = await browser.newPage()
    _page = page
  }
  return page
}
