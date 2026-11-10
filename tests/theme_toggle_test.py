"""Theme controls: layout, WebGL geometry, input, persistence and fallback.
No screenshots, canvas captures or live API requests. Run: python tests/theme_toggle_test.py
"""
import functools
import os
import shutil
import unittest
from http.server import ThreadingHTTPServer
from threading import Thread

from playwright.sync_api import sync_playwright, expect
from browser_test import ROOT, QuietHandler, Fixture


class ThemeToggleRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT)))
        Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.url = f"http://127.0.0.1:{cls.server.server_port}/"
        cls.pw = sync_playwright().start()
        exe = os.environ.get("CALENDS_CHROMIUM") or shutil.which("chromium")
        cls.browser = cls.pw.chromium.launch(headless=True, **({"executable_path": exe} if exe else {}))

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.contexts = []
        self.errors = []
        self.fixtures = []

    def tearDown(self):
        for ctx in self.contexts:
            ctx.close()
        self.assertEqual(self.errors, [])
        for fixture in self.fixtures:
            self.assertEqual(fixture.writes, [], "Theme changes must not write preparation records")
            self.assertEqual(fixture.auth_requests, [])
            self.assertEqual(fixture.unexpected, [])

    def open(self, width=390, dpr=1, fallback=False, reduced=False):
        ctx = self.browser.new_context(viewport={"width": width, "height": 900}, device_scale_factor=dpr, color_scheme="light", reduced_motion="reduce" if reduced else "no-preference")
        self.contexts.append(ctx)
        fixture = Fixture()
        self.fixtures.append(fixture)
        ctx.route("**/*", fixture.route)
        if fallback:
            ctx.add_init_script("""const get = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function(type, ...args) {
              return type === 'webgl' ? null : get.call(this, type, ...args);
            };""")
        page = ctx.new_page()
        page.on("pageerror", lambda e: self.errors.append(str(e)))
        page.goto(self.url)
        expect(page.locator("#gate")).to_be_visible()
        expect(page.locator("#gate .theme-toggle")).to_have_attribute("data-shader", "fallback" if fallback else "webgl")
        return page

    def assert_layout(self, page, selector):
        metrics = page.locator(selector).evaluate("""el => {
          const r=el.getBoundingClientRect(), c=el.querySelector('canvas');
          const cs=getComputedStyle(el), cr=c.getBoundingClientRect();
          return {w:r.width,h:r.height,left:r.left,right:r.right,viewport:innerWidth,
            canvasW:cr.width,canvasH:cr.height,bufferW:c.width,bufferH:c.height,
            overflow:document.documentElement.scrollWidth>innerWidth+1,
            background:cs.backgroundColor,shadow:cs.boxShadow};
        }""")
        self.assertEqual(metrics["w"], 216)
        self.assertEqual(metrics["h"], 96)
        self.assertGreaterEqual(metrics["left"], 0)
        self.assertLessEqual(metrics["right"], metrics["viewport"] + 1)
        self.assertFalse(metrics["overflow"])
        self.assertEqual(metrics["canvasW"], 216)
        self.assertEqual(metrics["canvasH"], 96)
        self.assertEqual(metrics["background"], "rgba(0, 0, 0, 0)")
        self.assertEqual(metrics["shadow"], "none")
        # Shader has a 60px lens in a logical 216x96 viewport, independent of DPR.
        self.assertEqual(metrics["canvasW"] * 60 / 216, 60)
        return metrics

    def test_lens_does_not_shrink_at_mobile_widths_or_high_dpi(self):
        for width, dpr in ((1440,1), (390,1), (320,2), (280,2)):
            with self.subTest(width=width, dpr=dpr):
                page = self.open(width=width, dpr=dpr)
                m = self.assert_layout(page, "#gate .theme-toggle")
                self.assertEqual(m["bufferW"], 216*dpr)
                page.evaluate("document.querySelector('#gate').hidden=true; document.querySelector('#app').hidden=false")
                page.wait_for_function("document.querySelector('.top canvas').width === 216 * Math.min(2, devicePixelRatio)")
                self.assert_layout(page, ".top .theme-toggle")
                overlap = page.evaluate("""() => {
                  const a=document.querySelector('.top .theme-slot').getBoundingClientRect();
                  const b=document.querySelector('#changeme').getBoundingClientRect();
                  return a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top;
                }""")
                self.assertFalse(overlap)
                self.assertEqual(page.locator('.top .theme-toggle').get_attribute('data-shader'), 'webgl')

    def test_click_keyboard_reload_and_drag(self):
        page = self.open(reduced=True)
        btn = page.locator('#gate .theme-toggle')
        btn.click()
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        self.assertEqual(page.evaluate("localStorage.getItem('sangbogi:theme')"), 'dark')
        expect(btn).to_have_attribute('aria-pressed', 'true')
        page.reload()
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        btn.press('ArrowRight')
        expect(page.locator('html')).to_have_attribute('data-theme', 'light')
        btn.press('Enter')
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        btn.press('Space')
        expect(page.locator('html')).to_have_attribute('data-theme', 'light')
        r = btn.bounding_box()
        page.mouse.move(r['x']+r['width']-25, r['y']+r['height']/2)
        page.mouse.down()
        page.mouse.move(r['x']+25, r['y']+r['height']/2, steps=12)
        page.mouse.up()
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        self.assertEqual(page.evaluate("localStorage.getItem('sangbogi:theme')"), 'dark')
        self.assertEqual(page.locator('.brand-image').first.evaluate('el=>getComputedStyle(el).filter'), 'invert(1)')

    def test_system_scheme_remains_automatic_until_user_chooses(self):
        page = self.open(reduced=True)
        page.emulate_media(color_scheme='dark', reduced_motion='reduce')
        expect(page.locator('#gate .theme-toggle')).to_have_attribute('aria-pressed', 'true')
        self.assertIsNone(page.evaluate("localStorage.getItem('sangbogi:theme')"))
        page.emulate_media(color_scheme='light', reduced_motion='reduce')
        expect(page.locator('#gate .theme-toggle')).to_have_attribute('aria-pressed', 'false')
        self.assertIsNone(page.evaluate("localStorage.getItem('sangbogi:theme')"))

    def test_webgl_disabled_still_has_large_lens_and_icons(self):
        page = self.open(fallback=True, reduced=True)
        btn=page.locator('#gate .theme-toggle')
        expect(btn.locator('.theme-fallback-sun')).to_be_visible()
        lens=btn.locator('.theme-fallback-lens').bounding_box()
        self.assertEqual((lens['width'], lens['height']), (60,60))
        btn.click()
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        expect(btn.locator('.theme-fallback-moon')).to_be_visible()
        expect(btn.locator('.theme-fallback-sun')).not_to_be_visible()

    def test_shader_defines_large_geometry_and_fades_unused_pixels(self):
        source=(ROOT/'theme-toggle.js').read_text(encoding='utf-8')
        self.assertIn('vec2(216.0,96.0)', source)
        self.assertIn('vec2(30.0),14.0', source)
        self.assertIn('for(int i=0;i<49;i++)', source)
        self.assertIn('float visible=mix(m,s,progress)', source)
        self.assertIn('offset*5.5', source)
        self.assertIn('1.0-smoothstep', source)


if __name__ == '__main__':
    unittest.main(verbosity=2)
