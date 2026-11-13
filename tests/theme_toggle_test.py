"""Theme control: duskdot switch layout, input, persistence and fallback.
No screenshots, canvas captures saved to disk, or live API requests.
Run: python tests/theme_toggle_test.py
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
        ctx = self.browser.new_context(
            viewport={"width": width, "height": 900},
            device_scale_factor=dpr,
            color_scheme="light",
            reduced_motion="reduce" if reduced else "no-preference",
        )
        self.contexts.append(ctx)
        fixture = Fixture()
        self.fixtures.append(fixture)
        ctx.route("**/*", fixture.route)
        if fallback:
            ctx.add_init_script("""const get = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function(type, ...args) {
              return type === 'webgl2' ? null : get.call(this, type, ...args);
            };""")
        page = ctx.new_page()
        page.on("pageerror", lambda e: self.errors.append(str(e)))
        page.goto(self.url)
        expect(page.locator("#gate")).to_be_visible()
        expect(page.locator("#gate .theme-toggle")).to_have_attribute("data-shader", "fallback" if fallback else "webgl2")
        return page

    def assert_layout(self, page, selector, width, height):
        metrics = page.locator(selector).evaluate("""el => {
          const r=el.getBoundingClientRect(), c=el.querySelector('canvas');
          const cs=getComputedStyle(el), cr=c.getBoundingClientRect();
          const ctx=c.getContext('2d');
          const px=ctx.getImageData(1,1,1,1).data;
          const edge=ctx.getImageData(Math.floor(c.width/2), 1, 1, 1).data;
          const data=ctx.getImageData(0,0,c.width,c.height).data;
          let maxA=0;
          for (let i=3;i<data.length;i+=16) if (data[i]>maxA) maxA=data[i];
          const lab=el.parentElement.querySelector('.theme-slot-lab');
          const lr=lab?lab.getBoundingClientRect():r;
          return {w:r.width,h:r.height,left:r.left,right:r.right,top:r.top,viewport:innerWidth,
            canvasW:cr.width,canvasH:cr.height,bufferW:c.width,bufferH:c.height,
            overflow:document.documentElement.scrollWidth>innerWidth+1,
            background:cs.backgroundColor,shadow:cs.boxShadow,
            corner:[...px], edgeA:edge[3], maxA,
            labelDy: lab ? (lr.top+lr.height/2) - (r.top+r.height/2) : 0};
        }""")
        self.assertEqual(metrics["w"], width)
        self.assertEqual(metrics["h"], height)
        self.assertGreaterEqual(metrics["left"], -1)
        self.assertLessEqual(metrics["right"], metrics["viewport"] + 1)
        self.assertFalse(metrics["overflow"])
        self.assertEqual(metrics["canvasW"], width)
        self.assertEqual(metrics["canvasH"], height)
        self.assertEqual(metrics["background"], "rgba(0, 0, 0, 0)")
        self.assertEqual(metrics["shadow"], "none")
        self.assertEqual(metrics["corner"], [0, 0, 0, 0])
        self.assertLessEqual(metrics["edgeA"], 8)
        self.assertGreaterEqual(metrics["maxA"], 240)
        self.assertLessEqual(abs(metrics["labelDy"]), 8)
        return metrics

    def test_switch_fits_header_without_a_box_or_overflow(self):
        for width, dpr in ((1440, 1), (390, 1), (320, 2), (280, 2)):
            with self.subTest(width=width, dpr=dpr):
                page = self.open(width=width, dpr=dpr)
                m = self.assert_layout(page, "#gate .theme-toggle", 178, 112)
                self.assertEqual(m["bufferW"], 178 * dpr)
                self.assertEqual(m["bufferH"], 112 * dpr)
                page.evaluate("document.querySelector('#gate').hidden=true; document.querySelector('#app').hidden=false")
                header = (124, 78) if width <= 760 else (178, 112)
                page.wait_for_function(
                    "([w,h]) => { const c=document.querySelector('.top canvas'); return c && c.width===w*Math.min(2,devicePixelRatio) && c.height===h*Math.min(2,devicePixelRatio); }",
                    arg=list(header),
                )
                self.assert_layout(page, ".top .theme-toggle", *header)
                overlap = page.evaluate("""() => {
                  const a=document.querySelector('.top .theme-slot').getBoundingClientRect();
                  const b=document.querySelector('#changeme').getBoundingClientRect();
                  return a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top;
                }""")
                self.assertFalse(overlap)
                self.assertEqual(page.locator('.top .theme-toggle').get_attribute('data-shader'), 'webgl2')
                expect(page.locator('a.theme-credit').first).to_have_attribute('href', 'assets/duskdot/credits.html')

    def test_click_keyboard_reload_and_drag(self):
        page = self.open(reduced=True)
        btn = page.locator('#gate .theme-toggle')
        btn.click()
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        self.assertEqual(page.evaluate("localStorage.getItem('sangbogi:theme')"), 'dark')
        self.assertEqual(page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--theme-p').trim()"), '0.000')
        expect(btn).to_have_attribute('aria-pressed', 'true')
        expect(btn).to_have_attribute('aria-label', '밝은 화면으로 전환')
        page.reload()
        expect(page.locator('#gate .theme-toggle')).to_have_attribute('data-shader', 'webgl2')
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        btn.press('ArrowRight')
        expect(page.locator('html')).to_have_attribute('data-theme', 'light')
        btn.press('Enter')
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        btn.press('Space')
        expect(page.locator('html')).to_have_attribute('data-theme', 'light')
        r = btn.bounding_box()
        page.mouse.move(r['x'] + r['width'] - 25, r['y'] + r['height'] / 2)
        page.mouse.down()
        page.mouse.move(r['x'] + 25, r['y'] + r['height'] / 2, steps=12)
        page.mouse.up()
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        self.assertEqual(page.evaluate("localStorage.getItem('sangbogi:theme')"), 'dark')
        self.assertEqual(page.locator('.brand-image').first.evaluate('el=>getComputedStyle(el).filter'), 'invert(1)')

    def test_system_scheme_remains_automatic_until_user_chooses(self):
        page = self.open(reduced=True)
        page.emulate_media(color_scheme='dark', reduced_motion='reduce')
        expect(page.locator('#gate .theme-toggle')).to_have_attribute('aria-pressed', 'true')
        self.assertIsNone(page.evaluate("localStorage.getItem('sangbogi:theme')"))
        self.assertEqual(page.evaluate("document.documentElement.getAttribute('data-theme')"), None)
        page.emulate_media(color_scheme='light', reduced_motion='reduce')
        expect(page.locator('#gate .theme-toggle')).to_have_attribute('aria-pressed', 'false')
        self.assertIsNone(page.evaluate("localStorage.getItem('sangbogi:theme')"))

    def test_webgl2_disabled_still_toggles_and_keeps_the_hit_target(self):
        page = self.open(fallback=True, reduced=True)
        btn = page.locator('#gate .theme-toggle')
        box = btn.bounding_box()
        self.assertGreaterEqual(box['width'], 44)
        self.assertGreaterEqual(box['height'], 44)
        self.assertEqual((box['width'], box['height']), (178, 112))
        btn.click()
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        expect(btn).to_have_attribute('aria-pressed', 'true')
        knob = btn.evaluate("""el => {
          const s=getComputedStyle(el, ':after');
          return {left:s.left, right:s.right, width:s.width, height:s.height};
        }""")
        self.assertEqual(knob['left'], '14px')
        self.assertEqual(knob['width'], '72px')
        self.assertEqual(knob['height'], '80px')

    def test_control_reuses_the_duskdot_renderer(self):
        source = (ROOT / 'theme-toggle.js').read_text(encoding='utf-8')
        render = (ROOT / 'assets/duskdot/render.js').read_text(encoding='utf-8')
        self.assertIn('assets/duskdot/render.js', source)
        self.assertIn("sangbogi:theme", source)
        self.assertIn('prefers-reduced-motion', source)
        self.assertIn('aria-pressed', source)
        self.assertIn('vec3 rrut', render)
        self.assertIn('tGlowC', render)
        self.assertIn('tGlowA', render)
        self.assertIn('uIsolate', render)
        self.assertNotIn('theme-fallback-sun', (ROOT / 'index.html').read_text(encoding='utf-8'))


if __name__ == '__main__':
    unittest.main(verbosity=2)
