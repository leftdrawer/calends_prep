"""Preview QA for the WebGL glass toggle. No screenshots, no live records."""
import functools, os, shutil, unittest
from http.server import ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright, expect
from browser_test import ROOT, QuietHandler

class GlassPreview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(('127.0.0.1',0), functools.partial(QuietHandler, directory=str(ROOT)))
        Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.url=f'http://127.0.0.1:{cls.server.server_port}/previews/glass-toggle/'
        cls.pw=sync_playwright().start()
        exe=os.environ.get('CALENDS_CHROMIUM') or shutil.which('chromium')
        cls.browser=cls.pw.chromium.launch(headless=True, **({'executable_path':exe} if exe else {}))
    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.pw.stop(); cls.server.shutdown(); cls.server.server_close()
    def setUp(self):
        self.contexts=[]; self.errors=[]; self.external=[]
    def tearDown(self):
        for ctx in self.contexts: ctx.close()
        self.assertEqual(self.errors, [])
        self.assertEqual(self.external, [])
    def open(self, width=390, reduced=False):
        ctx=self.browser.new_context(viewport={'width':width,'height':900}, color_scheme='light', reduced_motion='reduce' if reduced else 'no-preference')
        self.contexts.append(ctx)
        ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith('http://127.0.0.1:') else (self.external.append(r.request.url) or r.abort()))
        page=ctx.new_page(); page.on('pageerror', lambda e: self.errors.append(str(e)))
        page.goto(self.url)
        expect(page.locator('#main-switch .glass-switch')).to_have_attribute('data-implementation','webgl-glass')
        return page
    def test_shader_compiles_and_corners_are_transparent(self):
        page=self.open(reduced=True)
        data=page.locator('#main-switch canvas').evaluate("""c=>{
          const gl=c.getContext('webgl');
          const px=new Uint8Array(4);
          gl.readPixels(1,1,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
          const r=c.parentElement.getBoundingClientRect();
          return {shader:c.parentElement.dataset.shader, err:c.dataset.shaderError||'', corner:[...px], w:r.width, h:r.height, premul:gl.getContextAttributes().premultipliedAlpha};
        }""")
        self.assertEqual(data['shader'],'webgl')
        self.assertEqual(data['err'],'')
        self.assertEqual(data['corner'],[0,0,0,0])
        self.assertTrue(data['premul'])
        self.assertEqual((data['w'],data['h']),(300,132))
    def test_click_moves_theme_without_touching_app_storage(self):
        page=self.open(reduced=True)
        page.evaluate("localStorage.setItem('sangbogi:theme','dark')")
        page.locator('#main-switch .glass-switch').click()
        expect(page.locator('html')).to_have_attribute('data-theme','dark')
        self.assertEqual(page.evaluate("localStorage.getItem('sangbogi:theme')"),'dark')
        self.assertEqual(page.evaluate("localStorage.getItem('calends:glass-preview:theme')"),'dark')

if __name__=='__main__':
    unittest.main(verbosity=2)
