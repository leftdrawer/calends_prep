"""Duskdot iframe integration: source, crop, input, theme sync and persistence.
No screenshots or live API requests. Run: python3 tests/theme_toggle_test.py
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
        self.assertEqual(self.errors, [], "Unexpected JavaScript errors")
        for fixture in self.fixtures:
            self.assertEqual(fixture.writes, [], "Theme changes must not write preparation records")
            self.assertEqual(fixture.auth_requests, [])
            self.assertEqual(fixture.unexpected, [])

    def open(self, width=390, dpr=1, color_scheme="light", stored_theme=None):
        ctx = self.browser.new_context(
            viewport={"width": width, "height": 900},
            device_scale_factor=dpr,
            color_scheme=color_scheme,
            reduced_motion="reduce",
        )
        self.contexts.append(ctx)
        fixture = Fixture()
        self.fixtures.append(fixture)
        ctx.route("**/*", fixture.route)
        if stored_theme:
            ctx.add_init_script("localStorage.setItem('sangbogi:theme', " + repr(stored_theme) + ")")
        page = ctx.new_page()
        page.on("pageerror", lambda error: self.errors.append(str(error)))
        page.goto(self.url, wait_until="domcontentloaded")
        expect(page.locator("#gate")).to_be_visible()
        expect(page.locator(".gate-layout")).to_be_visible()
        expect(page.locator("#gate .theme-toggle iframe[data-theme-frame]")).to_be_visible()
        page.wait_for_function("""() => {
          const frame = document.querySelector('#gate iframe[data-theme-frame]');
          const state = frame && frame.contentWindow && frame.contentWindow.APP && frame.contentWindow.APP.getState();
          return !!state && document.documentElement.dataset.theme === (state.on ? 'light' : 'dark');
        }""", timeout=15000)
        return page

    def assert_frame_theme_matches_page(self, page, selector):
        page.wait_for_function("""selector => {
          const frame = document.querySelector(selector);
          const app = frame && frame.contentWindow && frame.contentWindow.APP;
          return !!app && document.documentElement.dataset.theme === (app.getState().on ? 'light' : 'dark');
        }""", arg=selector, timeout=12000)

    def source_point(self, page, selector, x, y):
        box = page.locator(selector).bounding_box()
        scale = min(500 / 956, 375 / 718)
        return box["x"] + x * scale, box["y"] + y * scale

    def test_original_webgl_page_is_cropped_at_its_native_aspect_and_fits_mobile(self):
        for width, dpr in ((1440, 1), (390, 1), (320, 2), (280, 2)):
            with self.subTest(width=width, dpr=dpr):
                page = self.open(width=width, dpr=dpr)
                frame = page.locator("#gate iframe[data-theme-frame]")
                expect(frame).to_have_attribute("src", "previews/duskdot/index.html?v=2")
                expect(frame).to_have_attribute("title", "밝기 전환 스위치")
                self.assertTrue(frame.evaluate("el => el.contentWindow.APP && el.contentWindow.APP.getState() !== undefined"))
                self.assertTrue(frame.evaluate("el => !!el.contentDocument.getElementById('view').getContext('webgl2')"))
                metrics = page.locator("#gate .theme-toggle").evaluate("""el => {
                  const r=el.getBoundingClientRect(), f=el.querySelector('iframe');
                  const css=getComputedStyle(f), sw=f.contentDocument.getElementById('sw');
                  const sr=sw.getBoundingClientRect();
                  return {width:r.width,height:r.height,left:r.left,right:r.right,viewport:innerWidth,
                    frameWidth:f.contentWindow.innerWidth,frameHeight:f.contentWindow.innerHeight,
                    scale:css.transform,sourceSwitchWidth:sr.width,sourceSwitchHeight:sr.height,
                    overflow:document.documentElement.scrollWidth>innerWidth+1};
                }""")
                self.assertEqual((metrics["width"], metrics["height"]), (220, 133))
                self.assertGreaterEqual(metrics["left"], 0)
                self.assertLessEqual(metrics["right"], metrics["viewport"] + 1)
                self.assertEqual((metrics["frameWidth"], metrics["frameHeight"]), (500, 375))
                source_scale = min(500 / 956, 375 / 718)
                self.assertAlmostEqual(metrics["sourceSwitchWidth"], 393.234375 * source_scale, places=1)
                self.assertAlmostEqual(metrics["sourceSwitchHeight"], 206 * source_scale, places=1)
                self.assertIn("matrix(1, 0, 0, 1", metrics["scale"])
                self.assertFalse(metrics["overflow"])

    def test_system_scheme_is_not_saved_until_the_original_switch_is_used(self):
        page = self.open()
        self.assertEqual(page.locator("html").get_attribute("data-theme"), "light")
        page.emulate_media(color_scheme="dark")
        expect(page.locator("html")).to_have_attribute("data-theme", "dark")
        self.assert_frame_theme_matches_page(page, "#gate iframe[data-theme-frame]")
        self.assertIsNone(page.evaluate("localStorage.getItem('sangbogi:theme')"))
        page.emulate_media(color_scheme="light")
        expect(page.locator("html")).to_have_attribute("data-theme", "light")
        self.assert_frame_theme_matches_page(page, "#gate iframe[data-theme-frame]")
        self.assertIsNone(page.evaluate("localStorage.getItem('sangbogi:theme')"))

    def test_pointer_keyboard_drag_and_reload_follow_the_original_state(self):
        page = self.open()
        frame = page.frame_locator("#gate iframe[data-theme-frame]")
        canvas = frame.locator("canvas#view")
        control = frame.locator("#sw")
        expect(control).to_have_attribute("role", "switch")
        expect(control).to_have_attribute("aria-checked", "true")

        control.press("Enter")
        expect(page.locator("html")).to_have_attribute("data-theme", "dark", timeout=10000)
        self.assertEqual(page.evaluate("localStorage.getItem('sangbogi:theme')"), "dark")
        expect(control).to_have_attribute("aria-checked", "false")

        x, y = self.source_point(page, "#gate iframe[data-theme-frame]", 476.6, 355)
        page.mouse.click(x, y)
        expect(page.locator("html")).to_have_attribute("data-theme", "light", timeout=10000)
        self.assertEqual(page.evaluate("localStorage.getItem('sangbogi:theme')"), "light")

        start = self.source_point(page, "#gate iframe[data-theme-frame]", 572, 355)
        end = self.source_point(page, "#gate iframe[data-theme-frame]", 382, 355)
        page.mouse.move(*start)
        page.mouse.down()
        page.mouse.move(*end, steps=16)
        page.mouse.up()
        expect(page.locator("html")).to_have_attribute("data-theme", "dark", timeout=10000)
        self.assertEqual(page.evaluate("localStorage.getItem('sangbogi:theme')"), "dark")
        self.assert_frame_theme_matches_page(page, "#gate iframe[data-theme-frame]")

        page.reload(wait_until="domcontentloaded")
        expect(page.locator(".gate-layout")).to_be_visible()
        expect(page.locator("html")).to_have_attribute("data-theme", "dark")
        page.wait_for_function("""() => {
          const frame=document.querySelector('#gate iframe[data-theme-frame]');
          return !!(frame && frame.contentWindow && frame.contentWindow.APP && !frame.contentWindow.APP.getState().on);
        }""", timeout=15000)
        self.assertEqual(page.evaluate("localStorage.getItem('sangbogi:theme')"), "dark")

    def test_saved_preference_overrides_system_changes_and_mirrors_into_both_views(self):
        page = self.open(stored_theme="dark")
        page.locator('button[data-name="은호당"]').click()
        expect(page.locator("#lockpane")).to_be_visible()
        page.locator("#familycode").fill("102938")
        expect(page.locator("#app")).to_be_visible()
        app_frame = page.locator("#app iframe[data-theme-frame]")
        expect(app_frame).to_be_visible()
        page.wait_for_function("""() => {
          const frame=document.querySelector('#app iframe[data-theme-frame]');
          return !!(frame && frame.contentWindow && frame.contentWindow.APP && !frame.contentWindow.APP.getState().on);
        }""", timeout=15000)
        self.assert_frame_theme_matches_page(page, "#app iframe[data-theme-frame]")

        page.emulate_media(color_scheme="light")
        expect(page.locator("html")).to_have_attribute("data-theme", "dark")
        frame = page.frame_locator("#app iframe[data-theme-frame]")
        frame.locator("#sw").press("Enter")
        expect(page.locator("html")).to_have_attribute("data-theme", "light", timeout=10000)
        self.assertEqual(page.evaluate("localStorage.getItem('sangbogi:theme')"), "light")
        self.assert_frame_theme_matches_page(page, "#app iframe[data-theme-frame]")

        metrics = page.locator("#app .theme-toggle").evaluate("""el => {
          const r=el.getBoundingClientRect(), b=document.querySelector('#changeme').getBoundingClientRect();
          return {left:r.left,right:r.right,viewport:innerWidth,overlap:r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top,
            overflow:document.documentElement.scrollWidth>innerWidth+1};
        }""")
        self.assertGreaterEqual(metrics["left"], 0)
        self.assertLessEqual(metrics["right"], metrics["viewport"] + 1)
        self.assertFalse(metrics["overlap"])
        self.assertFalse(metrics["overflow"])

    def test_bridge_only_reads_original_state_and_does_not_reimplement_the_shader(self):
        source = (ROOT / "theme-toggle.js").read_text(encoding="utf-8")
        self.assertIn("child.APP.getState()", source)
        self.assertIn("new child.KeyboardEvent('keydown'", source)
        self.assertIn("key:'Enter'", source)
        self.assertNotIn("createShader", source)
        self.assertNotIn("uniform vec2", source)
        self.assertNotIn("theme-fallback", source)
        self.assertEqual((ROOT / "previews/duskdot/index.html").read_text(encoding="utf-8").count("<canvas"), 2)

    def test_palette_manifest_and_switch_canvas_match_both_page_backgrounds(self):
        page = self.open(color_scheme="light")
        frame = page.locator("#gate iframe[data-theme-frame]")
        for scheme, expected_hex, expected_rgb, body_ink, button_bg, button_fg in (
            ("light", "#f0f0f7", "rgb(240, 240, 247)", "rgb(37, 37, 42)", "rgb(37, 37, 42)", "rgb(255, 255, 255)"),
            ("dark", "#101018", "rgb(16, 16, 24)", "rgb(240, 240, 249)", "rgb(240, 240, 249)", "rgb(37, 37, 42)"),
        ):
            with self.subTest(scheme=scheme):
                page.emulate_media(color_scheme=scheme)
                expect(page.locator("html")).to_have_attribute("data-theme", scheme)
                page.wait_for_function("""() => {
                  const f=document.querySelector('#gate iframe[data-theme-frame]');
                  return f?.contentDocument?.documentElement.dataset.theme === document.documentElement.dataset.theme;
                }""")
                measured = page.evaluate("""async () => {
                  const frame=document.querySelector('#gate iframe[data-theme-frame]');
                  const canvas=frame.contentDocument.getElementById('view');
                  const gl=canvas.getContext('webgl2'), read=(x,y) => {
                    const rgba=new Uint8Array(4);
                    gl.readPixels(x, canvas.height-y-1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
                    return Array.from(rgba);
                  };
                  const link=document.querySelector('link[rel="manifest"]');
                  const manifest=await (await fetch(link.href)).json();
                  return {
                    page:getComputedStyle(document.body).backgroundColor,
                    bodyInk:getComputedStyle(document.body).color,
                    buttonBg:getComputedStyle(document.querySelector('#otherbtn')).backgroundColor,
                    buttonFg:getComputedStyle(document.querySelector('#otherbtn')).color,
                    frame:getComputedStyle(frame.contentDocument.documentElement).backgroundColor,
                    themeColor:document.querySelector('meta[name="theme-color"][data-live]').content,
                    manifestBackground:manifest.background_color,
                    manifestTheme:manifest.theme_color,
                    corners:[[2,2],[canvas.width-3,2],[2,canvas.height-3],[canvas.width-3,canvas.height-3]].map(([x,y])=>read(x,y)),
                    outside:read(125,187),
                    nearOutside:[140,142,144].map(x=>read(x,187)[3])
                  };
                }""")
                self.assertEqual(measured["page"], expected_rgb)
                self.assertEqual(measured["bodyInk"], body_ink)
                self.assertEqual(measured["buttonBg"], button_bg)
                self.assertEqual(measured["buttonFg"], button_fg)
                self.assertEqual(measured["frame"], expected_rgb)
                self.assertEqual(measured["themeColor"], expected_hex)
                self.assertEqual(measured["manifestBackground"], expected_hex)
                self.assertEqual(measured["manifestTheme"], expected_hex)
                self.assertTrue(all(rgba[3] == 0 for rgba in measured["corners"]), measured)
                self.assertEqual(measured["outside"][3], 0, measured)
                self.assertTrue(all(alpha <= 32 for alpha in measured["nearOutside"]), measured)

    def test_jibang_controls_use_stone_tokens_in_both_system_themes(self):
        page = self.open(color_scheme="light")
        page.goto(self.url + "jibang.html", wait_until="load")
        for scheme, button_bg, button_fg, panel_bg in (
            ("light", "rgb(37, 37, 42)", "rgb(255, 255, 255)", "rgb(255, 255, 255)"),
            ("dark", "rgb(240, 240, 249)", "rgb(37, 37, 42)", "rgb(37, 37, 42)"),
        ):
            with self.subTest(scheme=scheme):
                page.emulate_media(color_scheme=scheme)
                measured = page.evaluate("""() => ({
                  buttonBg:getComputedStyle(document.querySelector('#fullscreen')).backgroundColor,
                  buttonFg:getComputedStyle(document.querySelector('#fullscreen')).color,
                  panelBg:getComputedStyle(document.querySelector('#controls')).backgroundColor
                })""")
                self.assertEqual(measured["buttonBg"], button_bg)
                self.assertEqual(measured["panelBg"], panel_bg)
                self.assertEqual(measured["buttonFg"], button_fg)


if __name__ == "__main__":
    unittest.main(verbosity=2)
