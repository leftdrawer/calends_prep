"""Standalone preview QA: no captures, no live records. python tests/glass_preview_test.py"""
import functools
import os
import re
import shutil
import unittest
from http.server import ThreadingHTTPServer
from threading import Thread

from playwright.sync_api import sync_playwright, expect
from browser_test import ROOT, QuietHandler


class GlassPreview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1',0), functools.partial(QuietHandler,directory=str(ROOT)))
        Thread(target=cls.server.serve_forever,daemon=True).start()
        cls.url=f'http://127.0.0.1:{cls.server.server_port}/previews/glass-toggle/'
        cls.pw=sync_playwright().start()
        exe=os.environ.get('CALENDS_CHROMIUM') or shutil.which('chromium')
        cls.browser=cls.pw.chromium.launch(headless=True,**({'executable_path':exe} if exe else {}))

    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.pw.stop();cls.server.shutdown();cls.server.server_close()

    def setUp(self):
        self.contexts=[];self.errors=[];self.external=[];self.api_requests=[]

    def tearDown(self):
        for ctx in self.contexts:ctx.close()
        self.assertEqual(self.errors,[])
        self.assertEqual(self.external,[])
        self.assertEqual(self.api_requests,[])

    def open(self,width=390,dpr=1,reduced=False,blocked=False,touch=False):
        ctx=self.browser.new_context(viewport={'width':width,'height':900},device_scale_factor=dpr,
            color_scheme='light',reduced_motion='reduce' if reduced else 'no-preference',has_touch=touch)
        self.contexts.append(ctx)
        def route(r):
            if not r.request.url.startswith('http://127.0.0.1:'):
                self.external.append(r.request.url);r.abort();return
            if '/rest/' in r.request.url or '/auth/' in r.request.url:self.api_requests.append(r.request.url)
            r.continue_()
        ctx.route('**/*',route)
        if blocked:ctx.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})")
        page=ctx.new_page();page.on('pageerror',lambda e:self.errors.append(str(e)))
        page.goto(self.url)
        expect(page.locator('#main-switch .glass-switch')).to_have_attribute('data-implementation','svg-css')
        return page

    def state(self,page):return page.evaluate('window.glassPreview.main.getState()')
    def settle(self,page):page.wait_for_function("!window.glassPreview.main.getState().animating")

    def test_fixed_large_lens_and_no_overflow_on_four_widths_and_dpr(self):
        for width,dpr in ((1440,1),(390,2),(320,1),(280,2)):
            with self.subTest(width=width,dpr=dpr):
                page=self.open(width,dpr)
                page.locator('summary').click()
                for selector in ('#main-switch','#light-sample','#dark-sample'):
                    size=page.locator(selector+' .glass-switch').evaluate("""e=>{
                      const r=e.getBoundingClientRect(),l=e.querySelector('.lens').getBoundingClientRect();
                      return {w:r.width,h:r.height,lw:l.width,lh:l.height,left:r.left,right:r.right,
                        overflow:document.documentElement.scrollWidth>innerWidth+1};
                    }""")
                    self.assertEqual((size['w'],size['h']),(244,108))
                    self.assertEqual((size['lw'],size['lh']),(72,72))
                    self.assertGreaterEqual(size['left'],0)
                    self.assertLessEqual(size['right'],width+1)
                    self.assertFalse(size['overflow'])

    def test_no_canvas_or_opaque_full_button_surface_on_any_background(self):
        page=self.open();page.locator('summary').click()
        self.assertEqual(page.locator('canvas').count(),0)
        for bg in ('plain','grid','stripes'):
            page.locator('[data-background='+bg+']').click()
            for sample in ('#light-sample','#dark-sample'):
                data=page.locator(sample+' .glass-switch').evaluate("""e=>({
                  background:getComputedStyle(e).backgroundColor,image:getComputedStyle(e).backgroundImage,
                  shadow:getComputedStyle(e).boxShadow,lens:getComputedStyle(e.querySelector('.lens')).backgroundImage,
                  blur:getComputedStyle(e.querySelector('.lens')).backdropFilter
                })""")
                self.assertEqual(data['background'],'rgba(0, 0, 0, 0)')
                self.assertEqual(data['image'],'none')
                self.assertEqual(data['shadow'],'none')
                self.assertIn('gradient',data['lens'])
                alphas=[float(a) for a in re.findall(r'rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)',data['lens'])]
                self.assertEqual(len(alphas),3)
                self.assertLessEqual(max(alphas),.15)
                self.assertIn('blur',data['blur'])

    def test_endpoint_glyphs_are_exact_explicit_patterns_and_distinct(self):
        page=self.open(reduced=True)
        counts=page.evaluate("""() => Object.fromEntries(Object.entries(GlassSwitchPreview.glyphs).map(([k,rows])=>[k,rows.join('').split('#').length-1]))""")
        positions=[]
        for mode in ('light','dark'):
            page.locator('#choose-'+mode).click()
            expect(page.locator('html')).to_have_attribute('data-theme',mode)
            glyph=page.locator('#main-switch .particles g').evaluate_all("els=>els.map(e=>e.getAttribute('transform'))")
            unique=set(glyph);positions.append(unique)
            self.assertEqual(len(unique),counts['sun' if mode=='light' else 'moon'])
            bounds=page.locator('#main-switch .particles').evaluate("""e=>{
              const b=e.getBBox();return {x:b.x,y:b.y,w:b.width,h:b.height};
            }""")
            self.assertGreater(bounds['w'],26);self.assertLess(bounds['w'],42)
            self.assertGreater(bounds['h'],34);self.assertLess(bounds['h'],42)
        self.assertNotEqual(positions[0],positions[1])

    def test_click_keyboard_and_rapid_reversal_finish_without_leftover_animation(self):
        page=self.open();button=page.locator('#main-switch .glass-switch')
        button.click();expect(button).to_have_attribute('aria-pressed','true')
        button.press('ArrowRight');expect(button).to_have_attribute('aria-pressed','false')
        button.press('Space');expect(button).to_have_attribute('aria-pressed','true')
        button.press('Enter');expect(button).to_have_attribute('aria-pressed','false')
        page.evaluate("for(let i=0;i<25;i++) glassPreview.main.setTheme(i%2?'light':'dark')")
        self.settle(page)
        state=self.state(page)
        self.assertEqual(state['mode'],'dark');self.assertEqual(state['phase'],0)
        self.assertFalse(state['animating'])

    def test_drag_can_hold_midpoint_then_snap(self):
        page=self.open();button=page.locator('#main-switch .glass-switch');r=button.bounding_box()
        page.mouse.move(r['x']+192,r['y']+54);page.mouse.down()
        page.mouse.move(r['x']+122,r['y']+54,steps=10)
        self.assertTrue(self.state(page)['dragging'])
        self.assertAlmostEqual(self.state(page)['phase'],.5,places=3)
        before=page.locator('#main-switch .particles g').evaluate_all("els=>els.map(e=>e.getAttribute('transform'))")
        page.wait_for_timeout(150)
        after=page.locator('#main-switch .particles g').evaluate_all("els=>els.map(e=>e.getAttribute('transform'))")
        self.assertEqual(before,after)
        page.mouse.move(r['x']+70,r['y']+54,steps=6);page.mouse.up();self.settle(page)
        self.assertEqual(self.state(page)['phase'],0)

    def test_storage_is_isolated_and_reload_keeps_only_preview_choice(self):
        page=self.open(reduced=True)
        page.evaluate("localStorage.setItem('sangbogi:theme','dark');localStorage.setItem('sangbogi:cycle:test','unchanged')")
        page.reload()
        self.assertEqual(self.state(page)['mode'],'light')
        page.locator('#choose-dark').click();page.reload()
        self.assertEqual(self.state(page)['mode'],'dark')
        self.assertEqual(page.evaluate("localStorage.getItem('sangbogi:cycle:test')"),'unchanged')
        self.assertEqual(page.evaluate("localStorage.getItem('sangbogi:theme')"),'dark')
        self.assertEqual(page.evaluate("localStorage.getItem('calends:glass-preview:theme')"),'dark')
        page.locator('#choose-light').click()
        self.assertEqual(page.evaluate("localStorage.getItem('sangbogi:theme')"),'dark')

    def test_system_mode_and_storage_unavailable(self):
        page=self.open(reduced=True)
        page.emulate_media(color_scheme='dark',reduced_motion='reduce')
        expect(page.locator('html')).to_have_attribute('data-theme','dark')
        self.assertIsNone(page.evaluate("localStorage.getItem('calends:glass-preview:theme')"))
        blocked=self.open(reduced=True,blocked=True)
        blocked.locator('#choose-dark').click()
        expect(blocked.locator('html')).to_have_attribute('data-theme','dark')
        self.assertEqual(self.state(blocked)['phase'],0)

    def test_touch_and_reduced_motion_transparency(self):
        page=self.open(reduced=True,touch=True)
        r=page.locator('#main-switch .glass-switch').bounding_box()
        page.touchscreen.tap(r['x']+120,r['y']+54)
        self.assertEqual(self.state(page)['phase'],0)
        self.assertFalse(self.state(page)['animating'])
        page.evaluate("""() => {
          const host=document.createElement('div');document.body.appendChild(host);
          GlassSwitchPreview.create(host,{initial:'dark',reducedTransparency:true,interactive:false});
        }""")
        expect(page.locator('[data-reduced-transparency=true]')).to_have_count(1)
        data=page.locator('[data-reduced-transparency=true] .lens').evaluate('e=>({blur:getComputedStyle(e).backdropFilter,bg:getComputedStyle(e).backgroundColor})')
        self.assertEqual(data['blur'],'none');self.assertNotEqual(data['bg'],'rgba(0, 0, 0, 0)')

    def test_prismatic_layers_strengthen_only_between_exact_endpoints(self):
        page=self.open()
        button=page.locator('#main-switch .glass-switch')
        self.assertEqual(button.locator('.aura').count(),1)
        self.assertEqual(button.locator('.spectral-edge').count(),1)
        self.assertEqual(button.locator('.specular').count(),1)
        self.assertEqual(button.locator('.counter-fringe').count(),self.state(page)['particleCount'])
        self.assertAlmostEqual(float(button.evaluate("e=>e.style.getPropertyValue('--kinetic')")),0)
        r=button.bounding_box()
        page.mouse.move(r['x']+192,r['y']+54);page.mouse.down()
        page.mouse.move(r['x']+122,r['y']+54,steps=10)
        values=button.evaluate("""e=>({
          kinetic:parseFloat(e.style.getPropertyValue('--kinetic')),
          fringe:parseFloat(e.style.getPropertyValue('--fringe-opacity')),
          lamp:parseFloat(e.style.getPropertyValue('--lamp-alpha')),
          box:e.querySelector('.particles').getBBox().width
        })""")
        self.assertGreater(values['kinetic'],.98)
        self.assertGreater(values['fringe'],.3)
        self.assertGreater(values['lamp'],.9)
        self.assertLess(values['box'],72)
        page.mouse.up();self.settle(page)
        self.assertEqual(float(button.evaluate("e=>e.style.getPropertyValue('--kinetic')")),0)

    def test_pointer_reflection_resets_and_reduced_motion_disables_follow(self):
        page=self.open();button=page.locator('#main-switch .glass-switch');r=button.bounding_box()
        page.mouse.move(r['x']+220,r['y']+72)
        self.assertEqual(button.evaluate("e=>e.style.getPropertyValue('--hover')"),'1')
        self.assertNotEqual(button.evaluate("e=>e.style.getPropertyValue('--shine-x')"),'18px')
        page.mouse.move(5,5)
        self.assertEqual(button.evaluate("e=>e.style.getPropertyValue('--hover')"),'0')
        self.assertEqual(button.evaluate("e=>e.style.getPropertyValue('--shine-x')"),'18px')
        reduced=self.open(reduced=True);r2=reduced.locator('#main-switch .glass-switch').bounding_box()
        reduced.mouse.move(r2['x']+220,r2['y']+72)
        self.assertEqual(reduced.locator('#main-switch .glass-switch').evaluate("e=>e.style.getPropertyValue('--hover')"),'')

    def test_comparison_panels_are_read_only_and_have_no_focusable_switch(self):
        page=self.open();page.locator('summary').click()
        self.assertEqual(page.locator('.samples button').count(),0)
        expect(page.locator('#light-sample [role=img]')).to_have_attribute('data-mode','light')
        expect(page.locator('#dark-sample [role=img]')).to_have_attribute('data-mode','dark')


if __name__=='__main__':unittest.main(verbosity=2)
