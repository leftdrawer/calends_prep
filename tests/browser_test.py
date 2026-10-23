"""Run browser regressions against a local server and synthetic Supabase only.

Requirements: Python playwright package and Chromium (CALENDS_CHROMIUM may
override its path). Run: python tests/browser_test.py
All external requests are intercepted; tests never read or write live records.
"""

import copy
import functools
import json
import os
from pathlib import Path
import shutil
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
import unittest
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright, expect


ROOT = Path(__file__).resolve().parents[1]
SUPABASE_HOST = "nfrubhmtyqvecckvzmxi.supabase.co"
PRIVATE_ITEM = "가족구매내역_TEST_ONLY"
PRIVATE_SHOP = "가족구입처_TEST_ONLY"


def stamp(**fields):
    return {"by": "은호당", "at": "2026-10-01T03:00:00.000Z", **fields}


def legacy_cycle():
    return {
        "bought": {"baek": stamp(on=True), "g_ssal": stamp(on=True)},
        "mode": {"baek": stamp(state="buy")},
        "stock": {},
        "part": {},
        "memo": {},
        "shop": {
            "baek": stamp(name=PRIVATE_SHOP, other=True),
            "g_ssal": stamp(name="홍보살", gift=True),
        },
        "list": {
            "jeon": stamp(items=[{"name": PRIVATE_ITEM, "src": "쿠팡", "who": "은호당"}]),
            "g_etc": stamp(items=[{"name": "국화", "who": "김보살"}]),
        },
        "done": {},
        "hist": [
            {"k": "shop/baek", "from": "없음", "to": PRIVATE_SHOP,
             "by": "은호당", "at": "2026-10-01T03:00:00.000Z"},
        ],
    }


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class Fixture:
    def __init__(self, records=None, wordmarks=False):
        self.wordmarks = wordmarks
        self.records = {
            key: value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
            for key, value in copy.deepcopy(records or {}).items()
        }
        self.writes = []
        self.auth_requests = []
        self.unexpected = []
        self.fail_writes = False

    def route(self, route):
        request = route.request
        url = urlparse(request.url)
        if url.hostname in ("127.0.0.1", "localhost") or url.scheme in ("blob", "data"):
            if self.wordmarks and url.path in ("/assets/wordmark-horizontal.png", "/assets/wordmark-vertical.png"):
                width, height = (2000, 800) if "horizontal" in url.path else (800, 2000)
                # Synthetic shapes exercise picture selection; these are not the user's logo.
                body = f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}"><rect width="100%" height="100%" fill="#292F29"/></svg>'
                route.fulfill(status=200, content_type="image/svg+xml", body=body)
                return
            route.continue_()
            return
        if url.hostname != SUPABASE_HOST:
            # Web fonts are optional; abort them deterministically in these tests.
            route.abort("blockedbyclient")
            return
        if url.path.startswith("/auth/"):
            self.auth_requests.append((request.method, url.path))
            route.abort("blockedbyclient")
            return
        if url.path != "/rest/v1/sangbogi":
            self.unexpected.append((request.method, url.path))
            route.abort("blockedbyclient")
            return
        if request.method == "GET":
            query = parse_qs(url.query)
            match = query.get("key", [""])[0]
            if match.startswith("eq."):
                key = match[3:]
                rows = [{"value": self.records[key]}] if key in self.records else []
            elif match.startswith("like."):
                prefix = match[5:].rstrip("*")
                rows = [{"key": key} for key in self.records if key.startswith(prefix)]
            else:
                self.unexpected.append((request.method, url.path + "?" + url.query))
                rows = []
            route.fulfill(status=200, content_type="application/json", body=json.dumps(rows))
        elif request.method == "POST":
            if self.fail_writes:
                route.fulfill(status=503, content_type="application/json", body='{"message":"synthetic offline"}')
                return
            payload = request.post_data_json
            self.records[payload["key"]] = payload["value"]
            self.writes.append(copy.deepcopy(payload))
            route.fulfill(status=201, content_type="application/json", body="")
        else:
            self.unexpected.append((request.method, url.path))
            route.abort("blockedbyclient")


class BrowserRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(QuietHandler, directory=str(ROOT))
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.server_thread = Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}/"
        cls.playwright = sync_playwright().start()
        executable = os.environ.get("CALENDS_CHROMIUM") or shutil.which("chromium")
        cls.browser = cls.playwright.chromium.launch(
            headless=True, **({"executable_path": executable} if executable else {})
        )

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.contexts = []
        self.fixtures = []
        self.page_errors = []

    def tearDown(self):
        for context in self.contexts:
            context.close()
        self.assertEqual(self.page_errors, [], "Unexpected JavaScript errors")
        for fixture in self.fixtures:
            self.assertEqual(fixture.auth_requests, [], "PIN login must not send email/auth API requests")
            self.assertEqual(fixture.unexpected, [], "Unexpected Supabase request")

    def open_page(self, records=None, width=1440, height=1000, storage=None, wordmarks=False):
        fixture = Fixture(records, wordmarks=wordmarks)
        self.fixtures.append(fixture)
        context = self.browser.new_context(viewport={"width": width, "height": height}, timezone_id="Asia/Seoul")
        self.contexts.append(context)
        context.route("**/*", fixture.route)
        if storage:
            context.add_init_script("for (const [key, value] of Object.entries(" + json.dumps(storage) + ")) localStorage.setItem(key, value)")
        page = context.new_page()
        page.on("pageerror", lambda error: self.page_errors.append(str(error)))
        page.goto(self.base_url, wait_until="domcontentloaded")
        return page, fixture

    def login(self, page, name="은호당"):
        expect(page.locator("#gate")).to_be_visible()
        page.locator(f'button[data-name="{name}"]').click()
        expect(page.locator("#lockpane")).to_be_visible()
        page.locator("#familycode").fill("102938" if name == "은호당" else "9394")
        page.locator("#lockverify").click()
        expect(page.locator("#app")).to_be_visible()
        expect(page.locator("#mename")).to_have_text(name)
        page.wait_for_function("document.querySelector('#title').textContent !== '불러오는 중'")

    def guest(self, page, name="방문객"):
        page.locator("#othername").fill(name)
        page.locator("#otherbtn").click()
        expect(page.locator("#app")).to_be_visible()
        expect(page.locator("#guestbadge")).to_be_visible()

    def select_month(self, page, month, leap=False, year=2026):
        page.evaluate("""async ({year, month, leap}) => {
          idx = LUNAR.findIndex(e => e[1] === year && e[2] === month && !!e[3] === leap);
          if (idx < 0) throw new Error('fixture month missing');
          selectedEvent = 'first';
          await loadCycle();
        }""", {"year": year, "month": month, "leap": leap})

    def wait_saved(self, page):
        page.wait_for_function("pending.size === 0 && !flushing")

    def assert_no_overflow(self, page):
        dimensions = page.evaluate("({width: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth})")
        self.assertLessEqual(max(dimensions["document"], dimensions["body"]), dimensions["width"])

    def test_family_pins_reject_wrong_codes_and_never_send_email(self):
        for name, wrong in (("은호당", "9394"), ("어머니", "102938")):
            with self.subTest(role=name):
                page, fixture = self.open_page()
                page.locator(f'button[data-name="{name}"]').click()
                code = page.locator("#familycode")
                expect(code).to_have_attribute("type", "password")
                code.fill(wrong)
                page.locator("#lockverify").click()
                expect(page.locator("#app")).to_be_hidden()
                expect(page.locator("#lockerr")).not_to_be_empty()
                self.assertEqual(fixture.writes, [])
                code.fill("102938" if name == "은호당" else "9394")
                code.press("Enter")
                expect(page.locator("#app")).to_be_visible()
                expect(page.locator("#mename")).to_have_text(name)

    def test_reserved_guest_names_and_saved_names_require_pin(self):
        for name in ("은호당", "어머니"):
            with self.subTest(role=name):
                page, fixture = self.open_page()
                page.locator("#othername").fill("  " + name + "  ")
                page.locator("#otherbtn").click()
                expect(page.locator("#lockpane")).to_be_visible()
                expect(page.locator("#app")).to_be_hidden()
                self.assertEqual(fixture.writes, [])
                saved, _ = self.open_page(storage={"sangbogi:me": json.dumps({"name": name})})
                expect(saved.locator("#gate")).to_be_visible()
                expect(saved.locator("#app")).to_be_hidden()

    def test_guest_excludes_private_content_and_cannot_mutate(self):
        previous = {"stock": {"bae": stamp(state="gift")}, "shop": {"bae": stamp(name="박보살", gift=True)}}
        records = {"sangbogi:cycle:2026-09": legacy_cycle(), "sangbogi:cycle:2026-08": previous}
        page, fixture = self.open_page(records)
        self.guest(page)
        self.select_month(page, 9)
        expect(page.locator("#gifts")).to_contain_text("홍보살")
        expect(page.locator("#gifts")).to_contain_text("김보살")
        expect(page.locator("#loglist")).to_contain_text("박보살")
        expect(page.locator("#prog")).to_be_hidden()
        expect(page.locator("#fixed .row")).to_have_count(0)
        expect(page.locator("#var .row")).to_have_count(0)
        expect(page.locator("#steps .step")).to_have_count(0)
        expect(page.locator("#donebox button")).to_have_count(0)
        expect(page.locator("#gifts input, #gifts .tick, #gifts .adm")).to_have_count(0)
        html = page.locator("#app").inner_html()
        self.assertNotIn(PRIVATE_ITEM, html)
        self.assertNotIn(PRIVATE_SHOP, html)
        page.evaluate("writeCycle(c => { c.bought.baek = stamp({on: false}); })")
        self.assertEqual(page.evaluate("pending.size"), 0)
        self.assertEqual(fixture.writes, [])

    def test_mother_can_prepare_and_owner_tools_stay_hidden(self):
        page, fixture = self.open_page()
        self.login(page, "어머니")
        expect(page.locator("#guestbadge")).to_be_hidden()
        expect(page.locator("#fixed .row")).to_have_count(6)
        expect(page.locator("#clear-btn")).to_be_hidden()
        expect(page.locator("#fixed .adm")).to_have_count(0)
        page.locator("#fixed .row").first.get_by_role("button", name="직접 찜", exact=True).click()
        self.wait_saved(page)
        stored = json.loads(fixture.writes[-1]["value"])
        self.assertTrue(stored["bought"]["baek"]["on"])
        self.assertEqual(stored["bought"]["baek"]["by"], "어머니")

    def test_role_switch_removes_open_private_sheet(self):
        page, _ = self.open_page({"sangbogi:cycle:2026-09": legacy_cycle()})
        self.login(page)
        self.select_month(page, 9)
        page.locator("#fixed .adm").first.click()
        expect(page.locator("#sheet")).to_be_visible()
        expect(page.locator("#sheet")).to_contain_text(PRIVATE_SHOP)
        page.locator("#sheet-close").click()
        page.locator("#changeme").click()
        self.guest(page)
        expect(page.locator("#sheet")).to_be_hidden()
        self.assertNotIn(PRIVATE_SHOP, page.locator("#sheet").inner_html())
        self.assertNotIn(PRIVATE_SHOP, page.locator("#app").inner_html())

    def test_signature_returns_to_first_screen_without_losing_preparation(self):
        key = "sangbogi:cycle:2026-09"
        page, fixture = self.open_page({key: legacy_cycle()})
        self.login(page)
        self.select_month(page, 9)
        fixture.fail_writes = True
        page.locator("#fixed .row").first.get_by_role("button", name="부득이 사 옴", exact=True).click()
        expect(page.locator("#status")).to_contain_text("아직 올리지 못했습니다")
        self.assertEqual(page.evaluate("pending.size"), 1)
        self.assertFalse(page.evaluate("cycle.bought.baek.on"))
        signature = page.get_by_role("link", name="은호당 · 첫 화면으로 돌아가기", exact=True)
        signature.click()
        expect(page.locator("#gate")).to_be_visible()
        expect(page.locator("#app")).to_be_hidden()
        expect(page.locator("#othername")).to_be_focused()
        self.assertEqual(page.evaluate("scrollY"), 0)
        self.assertEqual(page.evaluate("pending.size"), 1)
        self.assertFalse(page.evaluate("cycle.bought.baek.on"))
        page.locator("#gatecancel").click()
        expect(page.locator("#fixed .tick").first).to_have_attribute("aria-checked", "false")
        fixture.fail_writes = False
        page.evaluate("flush()")
        self.wait_saved(page)
        saved = fixture.records[key]
        self.assertFalse(json.loads(saved)["bought"]["baek"]["on"])
        self.assertGreater(len(json.loads(saved)["hist"]), len(legacy_cycle()["hist"]))
        signature.focus()
        signature.press("Enter")
        expect(page.locator("#gate")).to_be_visible()
        expect(page.locator("#othername")).to_be_focused()
        page.locator('button[data-name="은호당"]').click()
        expect(page.locator("#lockpane")).to_be_visible()
        expect(page.locator("#familycode")).to_be_empty()
        expect(page.locator("#app")).to_be_hidden()
        page.locator("#familycode").fill("102938")
        page.locator("#familycode").press("Enter")
        expect(page.locator("#app")).to_be_visible()
        self.select_month(page, 9)
        expect(page.locator("#fixed .tick").first).to_have_attribute("aria-checked", "false")
        self.assertEqual(fixture.records[key], saved)

    def test_stored_history_and_guest_names_render_as_literal_text(self):
        attack = '<img src=x onerror="window.injected = true">'
        record = legacy_cycle()
        record["hist"][0].update(by=attack, to=attack)
        page, _ = self.open_page({"sangbogi:cycle:2026-09": record})
        self.login(page)
        self.select_month(page, 9)
        page.locator("#fixed .adm").first.click()
        expect(page.locator("#sheet-log")).to_contain_text(attack)
        expect(page.locator("#sheet-log img")).to_have_count(0)
        self.assertFalse(page.evaluate("!!window.injected"))
        page.locator("#sheet-close").click()
        page.locator("#changeme").click()
        self.guest(page, attack)
        expect(page.locator("#mename")).to_have_text(attack)
        self.assertFalse(page.evaluate("!!window.injected"))

    def test_all_months_and_leap_month_start_with_independent_first_day(self):
        picked = {
            "2026-01|홍수맥이": "2026-02-19",
            "2026-02|영등맞이": "2026-03-21",
            "2026-03|삼신날": "2026-04-19",
            "2026-05|단오 또는 단군할아버지 생신": "2026-06-17",
            "2026-10|성주맞이 고사": "2026-11-11",
            "2026-12|삼재풀이": "2027-01-10",
        }
        page, fixture = self.open_page({"sangbogi:picked": picked})
        self.login(page)
        page.evaluate("loadCalendarConfig()")
        for month in range(1, 13):
            with self.subTest(month=month):
                self.select_month(page, month)
                expect(page.locator("#title")).to_contain_text("초하루")
                expect(page.locator("#eventnav [aria-selected=true]")).to_contain_text("초하루")
                expect(page.locator("#chips")).to_contain_text(f"음력 {month}월 1일")
                expect(page.locator("#notice")).to_contain_text("명절은 따로 지냅니다")
                self.assertEqual(page.evaluate("sangDate(LUNAR[idx])"), page.evaluate("LUNAR[idx][0]"))
                self.assertIsNone(page.evaluate("substituteFor(LUNAR[idx])"))
        self.select_month(page, 5, leap=True, year=2028)
        expect(page.locator("#chips")).to_contain_text("음력 윤5월 1일")
        expect(page.locator("#eventnav [role=tab]")).to_have_count(1)
        self.assertEqual(fixture.writes, [])

    def test_legacy_september_records_belong_to_first_day_and_jungyang_starts_independent(self):
        record = legacy_cycle()
        record["done"] = {"done:중양": stamp(on=True)}
        key = "sangbogi:cycle:2026-09"
        page, fixture = self.open_page({key: record})
        original = fixture.records[key]
        # Verify legacy-key independence before the later explicit completion report.
        page.clock.install(time="2026-10-20T03:00:00Z")
        self.login(page)
        self.select_month(page, 9)
        expect(page.locator("#title")).to_have_text("구월 초하루")
        expect(page.locator("#fixed .tick").first).to_have_attribute("aria-checked", "true")
        expect(page.locator("#donebox button")).to_contain_text("초하루 상 올림")
        self.assertEqual(page.evaluate("keyNow()"), key)
        self.assertEqual(fixture.records[key], original)
        page.locator('#eventnav [data-event="jungyang"]').click()
        expect(page.locator("#title")).to_have_text("구월 중양")
        expect(page.locator("#chips")).to_contain_text("음력 9월 9일")
        expect(page.locator("#chips")).to_contain_text("10월 19일")
        expect(page.locator("#jungyang-prep")).to_contain_text("조상님을 대접하는 날")
        expect(page.locator("#jungyang-progress")).to_have_text("기본 차림 0 / 7 준비")
        expect(page.locator("#fixed .row, #var .row, #steps .step")).to_have_count(0)
        expect(page.locator("#donebox button")).to_have_text("중양 상을 올렸습니다")
        self.assertEqual(page.evaluate("keyNow()"), "sangbogi:event:2026-09:jungyang")
        self.assertEqual(page.evaluate("Object.keys(cycle.bought).length"), 0)
        page.locator('#eventnav [data-event="first"]').click()
        expect(page.locator("#fixed .tick").first).to_have_attribute("aria-checked", "true")
        self.assertEqual(fixture.records[key], original)
        self.assertEqual(fixture.writes, [])
        # An explicit reversal overrides the read-only legacy completion fallback.
        page.locator("#donebox button").click()
        self.wait_saved(page)
        stored = json.loads(fixture.records[key])
        self.assertFalse(stored["done"]["done:초하루"]["on"])
        self.assertTrue(stored["done"]["done:중양"]["on"])
        expect(page.locator("#donebox button")).to_have_text("초하루 상을 올렸습니다")

    def test_rice_offerings_appear_each_first_day_and_stay_private(self):
        page, fixture = self.open_page()
        self.login(page)
        names = ("소당 밥공양", "중당 밥공양", "육당 밥공양", "건립 밥공양")
        for month in range(1, 13):
            self.select_month(page, month)
            expect(page.locator("#rice-offering-card")).to_be_visible()
            for name in names:
                expect(page.get_by_role("checkbox", name=name, exact=True)).to_have_attribute("aria-checked", "false")
            expect(page.locator("#tiers [data-offering]")).to_have_count(3)
            expect(page.locator("#tiers [data-offering].on")).to_have_count(0)
            expect(page.locator('#geollip-pills [data-offering="rice-offering-geollip"]')).to_have_class("pill")
            expect(page.locator("#total")).to_have_text("/18")
        self.select_month(page, 5, leap=True, year=2028)
        expect(page.locator("#rice-offering-card [role=checkbox]")).to_have_count(4)
        self.select_month(page, 9)
        page.locator('#eventnav [data-event="jungyang"]').click()
        expect(page.locator("#rice-offering-card [role=checkbox]")).to_have_count(4)
        expect(page.locator('[id^="jungyang-rice-offering-"]')).to_have_count(4)
        expect(page.locator("#tiers [data-offering]")).to_have_count(0)
        expect(page.locator("#geollip-pills [data-offering]")).to_have_count(0)
        page.locator(".brand-home").click()
        self.guest(page)
        self.select_month(page, 9)
        expect(page.locator("#offering-prep")).to_be_empty()
        expect(page.locator("#rice-offering-card, #sangcard [data-offering]")).to_have_count(0)
        self.assertNotIn("밥공양", page.locator("#app").inner_html())
        self.assertEqual(fixture.writes, [])

    def test_rice_offerings_save_by_tier_and_month_without_changing_purchases(self):
        key = "sangbogi:cycle:2026-09"
        october = "sangbogi:cycle:2026-10"
        original = legacy_cycle()
        october_record = legacy_cycle()
        october_record["part"]["bulsa-rice"] = stamp(on=True)
        page, fixture = self.open_page({key: original, october: october_record})
        self.login(page, "어머니")
        self.select_month(page, 9)
        progress = page.locator("#done").inner_text()
        fields = {"sodang": "소당 밥공양", "jungdang": "중당 밥공양", "yukdang": "육당 밥공양", "geollip": "건립 밥공양"}
        for suffix, label in fields.items():
            check = page.get_by_role("checkbox", name=label, exact=True)
            check.press("Space")
            self.wait_saved(page)
            expect(page.locator(f'#sangcard [data-offering="rice-offering-{suffix}"]')).to_have_class("pill on")
        saved = json.loads(fixture.records[key])
        for suffix, label in fields.items():
            item = saved["part"]["rice-offering-" + suffix]
            self.assertTrue(item["on"])
            self.assertEqual(item["by"], "어머니")
            self.assertTrue(item["at"])
            self.assertIn(label, page.evaluate("nameOfKey('part/rice-offering-' + " + json.dumps(suffix) + ")"))
        self.assertEqual(saved["bought"], original["bought"])
        expect(page.locator("#done")).to_have_text(progress)
        expect(page.locator("#total")).to_have_text("/18")
        self.select_month(page, 9, year=2027)
        expect(page.locator("#rice-offering-card [aria-checked=false]")).to_have_count(4)
        page.reload(wait_until="domcontentloaded")
        self.login(page, "어머니")
        self.select_month(page, 9)
        expect(page.locator("#rice-offering-card [aria-checked=true]")).to_have_count(4)
        page.get_by_role("checkbox", name="중당 밥공양", exact=True).click()
        self.wait_saved(page)
        expect(page.locator('#tiers [data-offering="rice-offering-jungdang"]')).to_have_class("pill")
        stored = json.loads(fixture.records[key])
        self.assertTrue(stored["part"]["rice-offering-sodang"]["on"])
        self.assertFalse(stored["part"]["rice-offering-jungdang"]["on"])
        self.assertTrue(stored["part"]["rice-offering-yukdang"]["on"])
        self.assertTrue(stored["part"]["rice-offering-geollip"]["on"])
        self.select_month(page, 10)
        expect(page.locator("#rice-offering-card [aria-checked=false]")).to_have_count(4)
        expect(page.locator("#bulsa-rice-check")).to_have_attribute("aria-checked", "true")
        self.assertEqual(json.loads(fixture.records[october]), october_record)
        self.assertEqual({write["key"] for write in fixture.writes}, {key})

    def test_geollip_offering_is_independent_of_existing_three_tiers(self):
        key = "sangbogi:cycle:2026-09"
        original = legacy_cycle()
        for suffix in ("sodang", "jungdang", "yukdang"):
            original["part"]["rice-offering-" + suffix] = stamp(on=True)
        page, fixture = self.open_page({key: original})
        self.login(page)
        self.select_month(page, 9)
        check = page.get_by_role("checkbox", name="건립 밥공양", exact=True)
        expect(check).to_have_attribute("aria-checked", "false")
        expect(page.locator("#tiers [data-offering].on")).to_have_count(3)
        expect(page.locator('#geollip-pills [data-offering="rice-offering-geollip"]')).to_have_class("pill")
        self.assertEqual(fixture.writes, [])
        check.press("Space")
        self.wait_saved(page)
        stored = json.loads(fixture.records[key])
        self.assertTrue(stored["part"]["rice-offering-geollip"]["on"])
        self.assertEqual(stored["part"]["rice-offering-geollip"]["by"], "은호당")
        for item_key, item_value in original["part"].items():
            self.assertEqual(stored["part"][item_key], item_value)
        self.assertEqual(stored["bought"], original["bought"])
        expect(page.locator('#geollip-pills [data-offering="rice-offering-geollip"]')).to_have_class("pill on")

    def test_sangdal_rice_only_appears_on_regular_tenth_month_first_day(self):
        page, fixture = self.open_page()
        self.login(page)
        for month in range(1, 13):
            with self.subTest(month=month):
                self.select_month(page, month)
                check = page.get_by_role("checkbox", name="불사단지 쌀 교체", exact=True)
                if month == 10:
                    expect(check).to_be_visible()
                    expect(check).to_have_attribute("aria-checked", "false")
                    expect(page.locator("#bulsa-prep-card h2")).to_have_text("상달 초하루 준비")
                else:
                    expect(check).to_have_count(0)
                    self.assertNotIn("불사단지 쌀 교체", page.locator("#app").inner_html())
                expect(page.locator("#fixed .row")).to_have_count(6)
                expect(page.locator("#var .row")).to_have_count(12)
                expect(page.locator("#steps .step")).to_have_count(6)
                expect(page.locator("#total")).to_have_text("/18")
        self.select_month(page, 10)
        page.locator('#eventnav [data-event="seongju"]').click()
        expect(page.locator("#bulsa-prep-card")).to_have_count(0)
        # Seongju reference text may mention the first-day check, but never offers it.
        expect(page.get_by_role("checkbox", name="불사단지 쌀 교체", exact=True)).to_have_count(0)
        expect(page.locator("#ritual-reference [role=checkbox]")).to_have_count(0)
        # The supported date table has no leap tenth month; exercise that case
        # with a synthetic month in this disposable page only.
        page.evaluate("""async () => {
          const regular=LUNAR.find(e => e[1]===2026 && e[2]===10 && !e[3]);
          LUNAR.push([regular[0],regular[1],10,1,regular[4]]);
          idx=LUNAR.length-1;selectedEvent='first';await loadCycle();
        }""")
        expect(page.locator("#chips")).to_contain_text("음력 윤10월 1일")
        expect(page.locator("#bulsa-prep-card")).to_have_count(0)
        self.assertNotIn("불사단지 쌀 교체", page.locator("#app").inner_html())
        self.assertEqual(fixture.writes, [])

    def test_mother_sangdal_rice_save_reload_and_independent_tables(self):
        key = "sangbogi:cycle:2026-10"
        other_year = "sangbogi:cycle:2027-10"
        other_month = "sangbogi:cycle:2026-09"
        holiday_key = "sangbogi:event:2026-10:seongju"
        original = legacy_cycle()
        original["part"]["s1"] = stamp(on=True)
        records = {key: original, other_month: legacy_cycle(), holiday_key: {"part": {"s1": stamp(on=True)}}}
        page, fixture = self.open_page(records)
        preserved = {k: fixture.records[k] for k in (other_month, holiday_key)}
        self.login(page, "어머니")
        self.select_month(page, 10)
        initial_progress = page.locator("#done").inner_text()
        check = page.get_by_role("checkbox", name="불사단지 쌀 교체", exact=True)
        check.press("Space")
        self.wait_saved(page)
        saved = json.loads(fixture.records[key])
        self.assertTrue(saved["part"]["bulsa-rice"]["on"])
        self.assertEqual(saved["part"]["bulsa-rice"]["by"], "어머니")
        self.assertTrue(saved["part"]["bulsa-rice"]["at"])
        self.assertEqual(saved["bought"], original["bought"])
        self.assertEqual(saved["part"]["s1"], original["part"]["s1"])
        expect(page.locator("#done")).to_have_text(initial_progress)
        expect(page.locator("#total")).to_have_text("/18")
        expect(page.locator("#steps .step")).to_have_count(6)
        page.locator('#eventnav [data-event="seongju"]').click()
        expect(page.locator("#bulsa-rice-check")).to_have_count(0)
        self.assertNotIn("bulsa-rice", page.evaluate("cycle.part"))
        page.reload(wait_until="domcontentloaded")
        self.login(page, "어머니")
        self.select_month(page, 10)
        expect(check).to_have_attribute("aria-checked", "true")
        self.select_month(page, 10, year=2027)
        expect(check).to_have_attribute("aria-checked", "false")
        check.click()
        self.wait_saved(page)
        self.select_month(page, 10)
        expect(check).to_have_attribute("aria-checked", "true")
        check.click()
        self.wait_saved(page)
        expect(check).to_have_attribute("aria-checked", "false")
        self.assertFalse(json.loads(fixture.records[key])["part"]["bulsa-rice"]["on"])
        self.assertTrue(json.loads(fixture.records[other_year])["part"]["bulsa-rice"]["on"])
        self.assertEqual({k: fixture.records[k] for k in preserved}, preserved)
        self.assertEqual({write["key"] for write in fixture.writes}, {key, other_year})

    def test_sangdal_rice_is_removed_from_guest_dom_after_role_switch(self):
        record = legacy_cycle()
        record["part"]["bulsa-rice"] = stamp(on=True)
        page, fixture = self.open_page({"sangbogi:cycle:2026-10": record})
        self.login(page, "어머니")
        self.select_month(page, 10)
        expect(page.locator("#bulsa-rice-check")).to_have_attribute("aria-checked", "true")
        page.locator("#changeme").click()
        self.guest(page)
        self.select_month(page, 10)
        expect(page.locator("#seasonal-prep")).to_be_empty()
        expect(page.locator("#bulsa-prep-card, #bulsa-rice-check")).to_have_count(0)
        self.assertNotIn("불사단지 쌀 교체", page.locator("#app").inner_html())
        page.evaluate("writeCycle(c => { c.part['bulsa-rice'] = stamp({on: false}); })")
        self.assertEqual(page.evaluate("pending.size"), 0)
        self.assertEqual(fixture.writes, [])

    def test_owner_explicit_approval_failure_retry_and_revocation(self):
        key = "sangbogi:cycle:2026-09"
        policy_key = "sangbogi:calendar:2026-09"
        page, fixture = self.open_page({key: legacy_cycle()})
        original = fixture.records[key]
        self.login(page)
        self.select_month(page, 9)
        page.locator('#eventnav [data-event="jungyang"]').click()
        page.locator("#approve-replacement").click()
        expect(page.locator("#approve-replacement-confirm")).to_be_visible()
        self.assertNotIn(policy_key, fixture.records)
        page.locator("#approve-replacement-cancel").click()
        self.assertNotIn(policy_key, fixture.records)
        page.locator("#approve-replacement").click()
        fixture.fail_writes = True
        page.locator("#approve-replacement-confirm").click()
        expect(page.locator("#status")).to_contain_text("승인을 저장하지 못했습니다")
        expect(page.locator("#notice")).to_contain_text("명절은 따로 지냅니다")
        expect(page.locator("#approve-replacement-confirm")).to_be_enabled()
        self.assertNotIn(policy_key, fixture.records)
        fixture.fail_writes = False
        page.locator("#approve-replacement-confirm").click()
        expect(page.locator("#notice")).to_contain_text("은호당의 승인")
        expect(page.locator("#revoke-replacement")).to_be_visible()
        saved = json.loads(fixture.records[policy_key])
        self.assertEqual(saved["approvedEvent"], "jungyang")
        self.assertEqual(saved["approvedDate"], "2026-10-19")
        self.assertEqual(saved["approvedBy"], "은호당")
        self.assertEqual(fixture.records[key], original)
        page.locator("#revoke-replacement").click()
        self.assertEqual(json.loads(fixture.records[policy_key])["approvedEvent"], "jungyang")
        page.locator("#approve-replacement-confirm").click()
        expect(page.locator("#notice")).to_contain_text("명절은 따로 지냅니다")
        self.assertIsNone(json.loads(fixture.records[policy_key])["approvedEvent"])
        self.assertEqual(fixture.records[key], original)

    def test_mother_cannot_approve_and_undated_holiday_cannot_replace_first_day(self):
        page, fixture = self.open_page()
        self.login(page, "어머니")
        self.select_month(page, 9)
        page.locator('#eventnav [data-event="jungyang"]').click()
        expect(page.locator("#approve-replacement, #revoke-replacement")).to_have_count(0)
        page.evaluate("saveMonthPlan(LUNAR[idx], getSelectedEvent())")
        self.assertEqual(fixture.writes, [])
        page.locator("#changeme").click()
        self.login(page)
        self.select_month(page, 10)
        page.locator('#eventnav [data-event="seongju"]').click()
        expect(page.locator("#approve-replacement")).to_be_disabled()
        expect(page.locator("#eventplan input[type=date]")).to_be_visible()
        # Lunar October ends on Dec 8; Dec 1 is still within this lunar month.
        page.locator("#eventplan input[type=date]").fill("2026-12-09")
        page.locator("#eventplan input[type=date]").dispatch_event("change")
        expect(page.locator("#status")).to_contain_text("이 음력 달 안에서")
        self.assertEqual(fixture.writes, [])

    def test_open_mother_and_guest_refresh_date_and_approval_from_other_device(self):
        for role in ("어머니", "손님"):
            with self.subTest(role=role):
                page, fixture = self.open_page({
                    "sangbogi:picked": {"2026-10|성주맞이 고사": "2026-11-11"},
                })
                if role == "어머니":
                    self.login(page, role)
                else:
                    self.guest(page)
                self.select_month(page, 10)
                page.locator('#eventnav [data-event="seongju"]').click()
                expect(page.locator("#chips")).to_contain_text("11월 11일")
                fixture.records["sangbogi:picked"] = json.dumps({
                    "2026-10|성주맞이 고사": "2026-11-13",
                })
                fixture.records["sangbogi:calendar:2026-10"] = json.dumps({
                    "version": 1, "approvedEvent": "seongju", "approvedDate": "2026-11-13",
                    "approvedBy": "은호당", "approvedAt": "2026-10-10T03:00:00.000Z",
                })
                # Both the 12-second poll and tab visibility resume use this path.
                page.evaluate("loadCycle(true)")
                expect(page.locator("#chips")).to_contain_text("11월 13일")
                expect(page.locator("#notice")).to_contain_text("은호당의 승인")
                self.assertEqual(page.evaluate("substituteFor(LUNAR[idx]).date"), "2026-11-13")
                del fixture.records["sangbogi:picked"]
                page.evaluate("loadCycle(true)")
                expect(page.locator("#eventnav [aria-selected=true]")).to_contain_text("날짜 미정")
                self.assertIsNone(page.evaluate("substituteFor(LUNAR[idx])"))
                self.assertEqual(fixture.writes, [])

    def test_failed_prepare_save_retains_pending_changes_until_retry(self):
        page, fixture = self.open_page()
        self.login(page)
        self.select_month(page, 9)
        fixture.fail_writes = True
        page.locator("#fixed .row").first.get_by_role("button", name="직접 찜", exact=True).click()
        expect(page.locator("#fixed .tick").first).to_have_attribute("aria-checked", "true")
        expect(page.locator("#status")).to_contain_text("아직 올리지 못했습니다")
        self.assertEqual(page.evaluate("pending.size"), 1)
        self.assertEqual(fixture.writes, [])
        # Polling the record cannot overwrite local changes awaiting persistence.
        page.evaluate("loadCycle(true)")
        expect(page.locator("#fixed .tick").first).to_have_attribute("aria-checked", "true")
        fixture.fail_writes = False
        page.evaluate("flush()")
        self.wait_saved(page)
        self.assertTrue(json.loads(fixture.records["sangbogi:cycle:2026-09"])["bought"]["baek"]["on"])

    def test_debounced_input_stays_with_its_original_table(self):
        page, fixture = self.open_page()
        self.login(page)
        self.select_month(page, 9)
        page.get_by_role("textbox", name="전 1번째", exact=True).fill("동그랑땡")
        page.locator('#eventnav [data-event="jungyang"]').click()
        page.wait_for_timeout(1000)
        self.wait_saved(page)
        stored = json.loads(fixture.records["sangbogi:cycle:2026-09"])
        self.assertEqual(stored["list"]["jeon"]["items"][0]["name"], "동그랑땡")
        self.assertNotIn("sangbogi:event:2026-09:jungyang", fixture.records)
        self.assertEqual(page.evaluate("Object.keys(cycle.list).length"), 0)

    def test_edits_during_inflight_save_are_preserved(self):
        page, fixture = self.open_page()
        self.login(page)
        self.select_month(page, 9)
        page.evaluate("""() => {
          const original = store.set.bind(store);
          let paused = false;
          store.set = async (key, value) => {
            if (!paused && key === 'sangbogi:cycle:2026-09') {
              paused = true;
              await new Promise(resolve => { window.releaseSave = resolve; });
            }
            return original(key, value);
          };
        }""")
        page.locator("#fixed .row").nth(0).get_by_role("button", name="직접 찜", exact=True).click()
        page.wait_for_function("typeof window.releaseSave === 'function'")
        page.locator("#fixed .row").nth(1).get_by_role("button", name="직접 찜", exact=True).click()
        page.evaluate("window.releaseSave()")
        self.wait_saved(page)
        stored = json.loads(fixture.records["sangbogi:cycle:2026-09"])
        self.assertTrue(stored["bought"]["baek"]["on"])
        self.assertTrue(stored["bought"]["kong"]["on"])

    def test_namul_keeps_active_second_slot_when_previous_save_finishes(self):
        page, fixture = self.open_page()
        self.login(page)
        self.select_month(page, 9)
        page.evaluate("""() => {
          const original = store.set.bind(store);
          let paused = false;
          store.set = async (key, value) => {
            if (!paused && key === 'sangbogi:cycle:2026-09') {
              paused = true;
              await new Promise(resolve => { window.releaseNamulSave = resolve; });
            }
            return original(key, value);
          };
        }""")
        first = page.get_by_role("textbox", name="나물 1번째", exact=True)
        second = page.get_by_role("textbox", name="나물 2번째", exact=True)
        first.fill("고사리")
        page.wait_for_function("typeof window.releaseNamulSave === 'function'")
        second.fill("시금치")
        result = page.evaluate("""async () => {
          const input = document.activeElement;
          input.setSelectionRange(1, 2);
          window.releaseNamulSave();
          while (flushing) await new Promise(resolve => setTimeout(resolve, 5));
          const current = document.querySelector('input[aria-label="나물 2번째"]');
          return {value: current.value, same: input === current,
            focused: current === document.activeElement,
            selection: [current.selectionStart, current.selectionEnd]};
        }""")
        self.assertEqual(result, {"value": "시금치", "same": True, "focused": True, "selection": [1, 2]})
        page.get_by_role("textbox", name="나물 3번째", exact=True).fill("도라지")
        self.wait_saved(page)
        page.locator("#title").click()
        stored = json.loads(fixture.records["sangbogi:cycle:2026-09"])
        self.assertEqual([row["name"] for row in stored["list"]["namul"]["items"]],
                         ["고사리", "시금치", "도라지"])
        page.reload(wait_until="domcontentloaded")
        self.login(page)
        self.select_month(page, 9)
        expect(page.get_by_role("textbox", name="나물 2번째", exact=True)).to_have_value("시금치")

    def test_namul_keeps_ime_and_empty_slot_order_across_refresh_and_source_pick(self):
        page, fixture = self.open_page()
        self.login(page)
        self.select_month(page, 9)
        second = page.get_by_role("textbox", name="나물 2번째", exact=True)
        second.focus()
        result = page.evaluate("""async () => {
          const input = document.activeElement;
          input.dispatchEvent(new CompositionEvent('compositionstart', {bubbles: true}));
          input.value = '시';
          input.setSelectionRange(1, 1);
          input.dispatchEvent(new InputEvent('input', {bubbles: true, data: '시', isComposing: true}));
          await loadCycle(true);
          await new Promise(resolve => setTimeout(resolve, 700));
          const current = document.querySelector('input[aria-label="나물 2번째"]');
          return {value: current.value, same: input === current, focused: current === document.activeElement};
        }""")
        self.assertEqual(result, {"value": "시", "same": True, "focused": True})
        self.assertEqual(fixture.writes, [], "An unfinished IME composition must not be uploaded")
        second.evaluate("""input => {
          input.value = '시금치';
          input.dispatchEvent(new CompositionEvent('compositionend', {bubbles: true, data: '시금치'}));
          input.dispatchEvent(new InputEvent('input', {bubbles: true, data: '시금치'}));
        }""")
        namul = page.locator("#var .row").filter(has=page.get_by_role("textbox", name="나물 1번째", exact=True))
        namul.get_by_role("button", name="2번째 출처와 준비한 사람", exact=True).click()
        namul.get_by_role("button", name="집에 있음", exact=True).click()
        third = page.get_by_role("textbox", name="나물 3번째", exact=True)
        third.fill("도라지")
        third.press("Tab")
        self.wait_saved(page)
        stored = json.loads(fixture.records["sangbogi:cycle:2026-09"])
        self.assertEqual([row["name"] for row in stored["list"]["namul"]["items"]], ["", "시금치", "도라지"])
        self.assertEqual(stored["list"]["namul"]["items"][1]["src"], "have")
        expect(page.get_by_role("textbox", name="나물 1번째", exact=True)).to_have_value("")
        expect(page.get_by_role("textbox", name="나물 2번째", exact=True)).to_have_value("시금치")

    def test_namul_immediate_source_pick_and_role_change_keep_original_month(self):
        page, fixture = self.open_page()
        self.login(page)
        self.select_month(page, 9)
        page.evaluate("""() => {
          const original = store.set.bind(store);
          let paused = false;
          store.set = async (key, value) => {
            if (!paused && key === 'sangbogi:cycle:2026-09') {
              paused = true;
              await new Promise(resolve => { window.releaseSourceSave = resolve; });
            }
            return original(key, value);
          };
        }""")
        first = page.get_by_role("textbox", name="나물 1번째", exact=True)
        first.press_sequentially("고사리", delay=20)
        page.wait_for_function("typeof window.releaseSourceSave === 'function'")
        namul = page.locator("#var .row").filter(has=first)
        source = namul.get_by_role("button", name="1번째 출처와 준비한 사람", exact=True)
        source.scroll_into_view_if_needed()
        bounds = source.bounding_box()
        page.mouse.move(bounds["x"] + bounds["width"] / 2, bounds["y"] + bounds["height"] / 2)
        page.mouse.down()
        page.evaluate("window.releaseSourceSave()")
        page.wait_for_function("!flushing")
        page.wait_for_timeout(80)
        page.mouse.up()
        namul.get_by_role("button", name="집에 있음", exact=True).click()
        second = page.get_by_role("textbox", name="나물 2번째", exact=True)
        second.fill("시금치")
        second.press("Tab")
        page.wait_for_timeout(40)
        self.assertEqual(page.evaluate("document.activeElement.getAttribute('aria-label')"),
                         "2번째 출처와 준비한 사람")
        # Changing the selected table and role must bypass editing-list protection.
        self.select_month(page, 10)
        expect(page.get_by_role("textbox", name="나물 1번째", exact=True)).to_have_value("")
        page.locator(".brand-home").click()
        self.guest(page)
        expect(page.locator("#var input")).to_have_count(0)
        self.wait_saved(page)
        stored = json.loads(fixture.records["sangbogi:cycle:2026-09"])
        self.assertEqual([row["name"] for row in stored["list"]["namul"]["items"]], ["고사리", "시금치"])
        self.assertEqual(stored["list"]["namul"]["items"][0]["src"], "have")
        self.assertEqual(stored["list"]["namul"]["by"], "은호당")
        self.assertNotIn("sangbogi:cycle:2026-10", fixture.records)
        namul_history = [h for h in stored["hist"] if h["k"] == "list/namul"]
        self.assertTrue(namul_history)
        self.assertFalse(any(h["to"] in ("고", "고사") for h in namul_history))
        self.assertTrue(all(h["by"] == "은호당" for h in namul_history))

    def test_jungyang_mother_prepares_basic_and_preserves_retired_guide_records(self):
        old_key = "sangbogi:cycle:2027-09"
        event_key = "sangbogi:event:2027-09:jungyang"
        retired = {key: stamp(on=True) for key in ("jungyang-water", "jungyang-light", "jungyang-fruit",
                                                  "jungyang-prayer-ancestors", "jungyang-prayer-peace")}
        old_event = legacy_cycle()
        old_event["part"] = copy.deepcopy(retired)
        page, fixture = self.open_page({old_key: legacy_cycle(), event_key: old_event})
        original = fixture.records[old_key]
        self.login(page, "어머니")
        self.select_month(page, 9, year=2027)
        page.locator('#eventnav [data-event="jungyang"]').click()
        expect(page.locator("#jungyang-progress")).to_have_text("기본 차림 0 / 7 준비")
        expect(page.locator("#jungyang-ancestor-card [role=checkbox]")).to_have_count(3)
        expect(page.locator("#rice-offering-card [role=checkbox]")).to_have_count(4)
        for card in ("#shopping-grid", "#prog", "#sangcard", "#stepscard"):
            expect(page.locator(card)).to_be_hidden()
        expect(page.locator("#fixed .row, #var .row, #steps .step")).to_have_count(0)
        expect(page.locator("#donecard")).to_be_visible()
        for group in ("#jungyang-ancestor-card", "#rice-offering-card"):
            for n in range(page.locator(group + " .row").count()):
                page.locator(group + " .row").nth(n).click()
        expect(page.locator("#jungyang-progress")).to_have_text("기본 차림 7 / 7 준비")
        expect(page.locator("#jungyang-recommended-card")).to_have_count(0)
        for name in ("정화수 마련", "향·촛불 마련", "집에 있는 제철과일 한 접시"):
            expect(page.get_by_role("checkbox", name=name, exact=True)).to_have_count(0)
        page.locator("#jungyang-prayer-card .row").first.click()
        expect(page.locator("#jungyang-prayer-card [role=checkbox]")).to_have_count(2)
        merged = page.get_by_role("checkbox", name="제사 받지 못한 조상님들의 해원과 극락왕생을 빌기", exact=True)
        expect(merged).to_have_attribute("aria-checked", "false")
        merged.click()
        expect(page.locator("#jungyang-progress")).to_have_text("기본 차림 7 / 7 준비")
        page.locator("#donebox button").click()
        self.wait_saved(page)
        saved = json.loads(fixture.records[event_key])
        self.assertEqual(fixture.records[old_key], original)
        self.assertTrue(saved["done"]["done:jungyang"]["on"])
        for key, original_part in retired.items():
            self.assertEqual(saved["part"][key], original_part)
        self.assertTrue(saved["part"]["jungyang-prayer-gods"]["on"])
        self.assertTrue(saved["part"]["jungyang-prayer-ancestors-peace"]["on"])
        self.assertEqual(saved["bought"], old_event["bought"])
        self.assertTrue(all(p["by"] == "어머니" and p["at"]
                            for key, p in saved["part"].items() if key not in retired))
        self.assertTrue(all(write["key"] == event_key for write in fixture.writes))
        self.select_month(page, 9)
        page.locator('#eventnav [data-event="jungyang"]').click()
        expect(page.locator("#jungyang-progress")).to_have_text("기본 차림 0 / 7 준비")
        page.reload()
        self.login(page, "어머니")
        self.select_month(page, 9, year=2027)
        page.locator('#eventnav [data-event="jungyang"]').click()
        expect(page.locator("#jungyang-progress")).to_have_text("기본 차림 7 / 7 준비")
        expect(page.locator("#donebox button")).to_contain_text("중양 상 올림")
        page.locator('#eventnav [data-event="first"]').click()
        expect(page.locator("#prog")).to_be_visible()
        expect(page.locator("#total")).to_have_text("/18")
        expect(page.locator("#rice-offering-card [aria-checked=true]")).to_have_count(0)
        for selector in ("#jungyang-prep", "#jungyang-guide"):
            expect(page.locator(selector)).to_be_empty()
        self.assertEqual(fixture.records[old_key], original)

    def test_jungyang_guest_does_not_receive_private_checklists_or_sources(self):
        key = "sangbogi:event:2026-09:jungyang"
        record = legacy_cycle()
        record["part"] = {"jungyang-ancestor-rice": stamp(on=True)}
        page, fixture = self.open_page({key: record})
        self.login(page)
        self.select_month(page, 9)
        page.locator('#eventnav [data-event="jungyang"]').click()
        expect(page.locator("#jungyang-progress")).to_have_text("기본 차림 1 / 7 준비")
        page.locator(".brand-home").click()
        self.guest(page)
        self.select_month(page, 9)
        page.locator('#eventnav [data-event="jungyang"]').click()
        for selector in ("#jungyang-prep", "#offering-prep", "#jungyang-guide", "#donebox"):
            expect(page.locator(selector)).to_be_empty()
        expect(page.locator("#app [role=checkbox]")).to_have_count(0)
        expect(page.locator("#gifts")).to_contain_text("쌀")
        self.assertEqual(fixture.writes, [])

    def test_jungyang_narrow_layout_and_source_boundaries(self):
        for width, height in ((1440, 1000), (390, 844), (320, 640)):
            with self.subTest(viewport=f"{width}x{height}"):
                page, _ = self.open_page(width=width, height=height)
                self.login(page, "어머니")
                self.select_month(page, 9)
                page.locator('#eventnav [data-event="jungyang"]').click()
                self.assert_no_overflow(page)
                expect(page.locator("#jungyang-recommended-card")).to_have_count(0)
                expect(page.locator("#jungyang-guide")).not_to_contain_text("조금 더 갖추면 좋은 것")
                expect(page.locator("#jungyang-guide")).to_contain_text("국화주")
                expect(page.locator("#jungyang-guide")).to_contain_text("국화전")
                expect(page.locator("#jungyang-guide")).to_contain_text("전승된 고정 의식 순서는 아닙니다")
                expect(page.locator('#jungyang-guide a[href^="https://cafe.naver.com/"]')).to_have_count(2)
                expect(page.locator("#jungyang-jibang-card img")).to_have_attribute("src", "./assets/jungyang-jibang-s25-ultra.png?v=20261020-aligned")
                expect(page.locator("#jungyang-chukmun")).to_contain_text("維歲次 丙午 九月九日")
                expect(page.locator("#jungyang-chukmun")).to_contain_text("光山金氏 昌寧成氏")
                expect(page.locator("#jungyang-chukmun")).to_contain_text("奉行者 恩熩堂 金炯錫")
                expect(page.locator("#jungyang-chukmun .chukmun-original")).to_have_count(14)
                expect(page.locator("#jungyang-chukmun .chukmun-reading")).to_have_count(14)
                expect(page.locator("#jungyang-chukmun .chukmun-meaning")).to_have_count(14)
                expect(page.locator(".chukmun-reading").first).to_have_text("유세차 병오 구월구일")
                expect(page.locator(".chukmun-reading").nth(1)).to_have_text("봉행자 은호당 김형석 감소고우")
                expect(page.locator(".chukmun-reading").last).to_have_text("근이지성 봉차박전 복유상향")
                face = page.evaluate("""async () => {
                  const faces=await document.fonts.load('19px "Eunhodang Hanja"','恩熩堂 金炯錫');
                  return {count:faces.length,loaded:faces.every(font=>font.status==='loaded')};
                }""")
                self.assertEqual(face, {"count": 1, "loaded": True})
                expect(page.locator("#jungyang-chukmun-card")).not_to_contain_text("[봉행자 이름]")
                expect(page.locator(".chukmun-meaning").first).to_have_text("병오년 음력 구월 구일입니다.")
                expect(page.locator(".chukmun-meaning").nth(1)).to_have_text("봉행자 은호당 김형석이 삼가 고합니다.")
                expect(page.locator(".chukmun-meaning").nth(2)).to_contain_text("광산김씨와 창녕성씨")
                self.assertTrue(page.locator("#jungyang-chukmun .chukmun-line").evaluate_all("""lines => lines.every(line =>
                  [...line.children].map(el => el.className).join(',') === 'chukmun-original,chukmun-reading,chukmun-meaning')"""))
                sizes = page.evaluate("""() => [document.querySelector('.chukmun-original'),
                  document.querySelector('.chukmun-meaning')].map(el => parseFloat(getComputedStyle(el).fontSize))""")
                self.assertLess(sizes[1], sizes[0])
                expect(page.locator("#jungyang-chukmun-translation")).to_have_count(0)
                self.assertEqual(page.evaluate("nameOfKey('part/jungyang-rice-offering-geollip')"), "건립 밥공양 · 재료")
                for button in page.locator("#jungyang-prep button, #offering-prep button, #jungyang-guide button").all():
                    bounds = button.bounding_box()
                    self.assertGreaterEqual(bounds["width"], 40)
                    self.assertGreaterEqual(bounds["height"], 40)

    def test_jungyang_jibang_download_fullscreen_and_year_specific_prayer(self):
        page, fixture = self.open_page(width=480, height=1040)
        self.login(page)
        self.select_month(page, 9, year=2027)
        page.locator('#eventnav [data-event="jungyang"]').click()
        expect(page.locator("#jungyang-chukmun")).to_contain_text("維歲次 丁未 九月九日")
        expect(page.locator(".chukmun-reading").first).to_have_text("유세차 정미 구월구일")
        pairs = page.locator("#jungyang-chukmun .chukmun-line").all()
        prayer = "\n\n".join(pair.locator(".chukmun-original").inner_text() + "\n" +
                              pair.locator(".chukmun-reading").inner_text() + "\n" +
                              pair.locator(".chukmun-meaning").inner_text() for pair in pairs)
        expect(page.locator(".chukmun-meaning").first).to_have_text("정미년 음력 구월 구일입니다.")
        with page.expect_download() as saved_prayer:
            page.get_by_role("button", name="축문 저장", exact=True).click()
        self.assertEqual(Path(saved_prayer.value.path()).read_text(encoding="utf-8"),
                         prayer + "\n")
        image = page.locator("#jungyang-jibang-card img")
        image.scroll_into_view_if_needed()
        page.wait_for_function("document.querySelector('#jungyang-jibang-card img').naturalWidth > 0")
        self.assertEqual(image.evaluate("img => [img.naturalWidth, img.naturalHeight]"), [853, 1844])
        with page.expect_download() as saved_image:
            page.locator("#jungyang-jibang-card a[download]").click()
        self.assertEqual(Path(saved_image.value.path()).read_bytes(),
                         (ROOT / "assets/jungyang-jibang-s25-ultra.png").read_bytes())
        viewer = page.context.new_page()
        viewer.on("pageerror", lambda error: self.page_errors.append(str(error)))
        viewer.goto(self.base_url + "jibang.html", wait_until="load")
        expect(viewer.locator("#jibang")).to_be_visible()
        self.assert_no_overflow(viewer)
        dimensions = viewer.locator("#jibang").evaluate("img => ({w:img.clientWidth,h:img.clientHeight,nw:img.naturalWidth,nh:img.naturalHeight})")
        self.assertEqual(dimensions, {"w": 480, "h": 1040, "nw": 853, "nh": 1844})
        viewer.get_by_role("button", name="전체 화면", exact=True).click()
        viewer.wait_for_function("!!document.fullscreenElement")
        expect(viewer.locator("#controls")).to_be_hidden()
        expect(viewer.locator("#show-controls")).to_be_hidden()
        viewer.locator("#jibang").click(position={"x": 20, "y": 20})
        expect(viewer.locator("#controls")).to_be_visible()
        viewer.evaluate("document.exitFullscreen()")
        viewer.wait_for_function("!document.fullscreenElement")
        # Browsers without the Fullscreen API retain a working PNG alternative.
        viewer.evaluate("Object.defineProperty(document.documentElement, 'requestFullscreen', {value:undefined})")
        viewer.get_by_role("button", name="전체 화면", exact=True).click()
        expect(viewer.locator("#status")).to_contain_text("PNG를 저장해 갤러리에서")
        expect(viewer.locator("#controls a[download]")).to_be_visible()
        self.assertEqual(fixture.writes, [])

    def test_horizontal_desktop_and_vertical_mobile_wordmarks(self):
        for width, height in ((1440, 1000), (390, 844), (320, 640)):
            with self.subTest(viewport=f"{width}x{height}"):
                page, _ = self.open_page(width=width, height=height, wordmarks=True)
                page.wait_for_function("document.querySelectorAll('.brand-picture.calligraphy-ready').length === 3")

                def assert_logo(selector, mobile_limit):
                    page.wait_for_function("selector => { const img=document.querySelector(selector); return img.complete && img.naturalWidth > 0; }", arg=selector)
                    image = page.locator(selector)
                    dimensions = image.evaluate("img => ({width: img.getBoundingClientRect().width, height: img.getBoundingClientRect().height, url: img.currentSrc})")
                    if width <= 760:
                        self.assertIn("wordmark-vertical.png", dimensions["url"])
                        self.assertGreater(dimensions["height"], dimensions["width"])
                        self.assertLessEqual(dimensions["height"], mobile_limit)
                    else:
                        self.assertIn("wordmark-horizontal.png", dimensions["url"])
                        self.assertGreater(dimensions["width"], dimensions["height"])
                    self.assert_no_overflow(page)

                assert_logo(".gate-brand .brand-image", 160)
                page.locator('button[data-name="어머니"]').click()
                assert_logo("#lockpane .brand-image", 140)
                page.locator("#lockback").click()
                self.guest(page)
                assert_logo(".brand-home .sign-image", 64)

    def test_desktop_mobile_and_narrow_layout_gate_and_application(self):
        for width, height in ((1440, 1000), (390, 844), (320, 640)):
            with self.subTest(viewport=f"{width}x{height}"):
                page, _ = self.open_page(width=width, height=height)
                expect(page.locator("#othername")).to_be_visible()
                self.assert_no_overflow(page)
                page.locator('button[data-name="어머니"]').click()
                expect(page.locator("#familycode")).to_be_visible()
                self.assert_no_overflow(page)
                page.locator("#lockback").click()
                self.login(page)
                self.assert_no_overflow(page)
                self.select_month(page, 9)
                self.assert_no_overflow(page)
                if width in (1440, 390):
                    page.screenshot(path=str(Path(tempfile.gettempdir()) / f"calends-{width}-family.png"), full_page=True)
                page.locator("#changeme").click()
                self.guest(page)
                self.assert_no_overflow(page)


    def test_jungyang_completed_navigation_report_and_manual_history(self):
        event_key = "sangbogi:event:2026-09:jungyang"
        old_event = legacy_cycle()
        old_event["done"]["done:jungyang"] = stamp(on=False, at="2026-10-20T03:00:00.000Z")
        for role in ("은호당", "어머니", "방문객"):
            with self.subTest(role=role):
                page, fixture = self.open_page({event_key: old_event})
                original = fixture.records[event_key]
                page.clock.install(time="2026-10-21T03:00:00Z")
                if role == "방문객":
                    self.guest(page, role)
                else:
                    self.login(page, role)
                expect(page.locator("#title")).to_have_text("시월 초하루")
                page.locator("#prev").click()
                expect(page.locator("#title")).to_have_text("구월 초하루")
                page.locator('#eventnav [data-event="jungyang"]').click()
                expect(page.locator("#title")).to_have_text("구월 중양")
                if role != "방문객":
                    expect(page.locator("#donebox button")).to_contain_text("중양 상 올림")
                # An actual polling interval must leave the manually opened record in place.
                page.clock.run_for(12010)
                page.evaluate("async () => { await loadCycle(true); }")
                expect(page.locator("#title")).to_have_text("구월 중양")
                self.assertEqual(fixture.writes, [])
                self.assertEqual(fixture.records[event_key], original)
                page.reload()
                if role != "방문객":
                    self.login(page, role)
                expect(page.locator("#title")).to_have_text("시월 초하루")
                self.assertEqual(fixture.writes, [])

    def test_jungyang_completed_navigation_other_year_and_explicit_cancellation(self):
        scenarios = (
            (2026, "2026-10-21T03:00:00Z", stamp(on=False, at="2026-10-20T15:10:00.000Z"), False, "구월 초하루"),
            (2026, "2026-10-20T03:00:00Z", None, False, "구월 초하루"),
            (2027, "2027-10-10T03:00:00Z", None, False, "구월 초하루"),
            (2027, "2027-10-10T03:00:00Z", None, True, "구월 초하루"),
            (2027, "2027-10-10T03:00:00Z", stamp(on=False, at="2027-10-09T03:00:00.000Z"), True, "구월 초하루"),
            (2027, "2027-10-10T03:00:00Z", stamp(on=True, at="2027-10-09T03:00:00.000Z"), False, "시월 초하루"),
        )
        for year, today, completion, first_done, title in scenarios:
            with self.subTest(year=year, completion=completion, first_done=first_done):
                first = legacy_cycle()
                if first_done:
                    first["done"]["done:초하루"] = stamp(on=True)
                event = legacy_cycle()
                if completion:
                    event["done"]["done:jungyang"] = completion
                records = {f"sangbogi:cycle:{year}-09": first,
                           f"sangbogi:event:{year}-09:jungyang": event}
                page, fixture = self.open_page(records)
                original = copy.deepcopy(fixture.records)
                page.clock.install(time=today)
                self.login(page)
                expect(page.locator("#title")).to_have_text(title)
                self.assertEqual(fixture.writes, [])
                self.assertEqual(fixture.records, original)

    def test_jungyang_completed_navigation_button_saves_original_event_and_can_undo(self):
        first_key = "sangbogi:cycle:2027-09"
        event_key = "sangbogi:event:2027-09:jungyang"
        first = legacy_cycle()
        first["done"]["done:초하루"] = stamp(on=True)
        event = legacy_cycle()
        event["part"]["jungyang-rice-jung"] = stamp(on=True)
        page, fixture = self.open_page({first_key: first, event_key: event})
        original_first = fixture.records[first_key]
        page.clock.install(time="2027-10-10T03:00:00Z")
        self.login(page, "어머니")
        expect(page.locator("#title")).to_have_text("구월 초하루")
        page.locator('#eventnav [data-event="jungyang"]').click()
        expect(page.locator("#donebox button")).to_have_text("중양 상을 올렸습니다")
        page.locator("#donebox button").click()
        expect(page.locator("#title")).to_have_text("시월 초하루")
        self.wait_saved(page)
        saved = json.loads(fixture.records[event_key])
        self.assertTrue(saved["done"]["done:jungyang"]["on"])
        self.assertEqual(saved["done"]["done:jungyang"]["by"], "어머니")
        self.assertEqual(saved["part"], event["part"])
        self.assertEqual(fixture.records[first_key], original_first)
        self.assertTrue(all(write["key"] == event_key for write in fixture.writes))
        page.locator("#prev").click()
        page.locator('#eventnav [data-event="jungyang"]').click()
        expect(page.locator("#donebox button")).to_contain_text("중양 상 올림")
        page.locator("#donebox button").click()
        expect(page.locator("#title")).to_have_text("구월 중양")
        self.wait_saved(page)
        self.assertFalse(json.loads(fixture.records[event_key])["done"]["done:jungyang"]["on"])
        page.reload()
        self.login(page, "어머니")
        expect(page.locator("#title")).to_have_text("구월 초하루")
        self.assertEqual(fixture.records[first_key], original_first)


    def test_jungyang_reported_cups_are_scoped_to_2026_and_family(self):
        for role in ("은호당", "어머니"):
            with self.subTest(role=role):
                records = {"sangbogi:cycle:2026-09": legacy_cycle(),
                           "sangbogi:event:2026-09:jungyang": legacy_cycle()}
                page, fixture = self.open_page(records, width=390, height=844)
                original = copy.deepcopy(fixture.records)
                self.login(page, role)
                expect(page.locator("#jungyang-cups-card")).to_have_count(0)
                self.select_month(page, 9)
                page.locator('#eventnav [data-event="jungyang"]').click()
                card = page.locator("#jungyang-cups-card")
                expect(card.locator("h2")).to_have_text("올린 잔 · 2026년 중양")
                expect(card.locator("h3")).to_have_text(["술 5잔", "식혜(후추차) 2잔"])
                expect(card.locator("h3 + p")).to_have_text([
                    "중당 · 육당 · 육당의 산신할아버지 상 · 건립 · 조상상",
                    "비어있는 소당 · 조상상",
                ])
                expect(card.locator("button, input, [role=checkbox]")).to_have_count(0)
                expect(page.locator("#jungyang-progress")).to_have_text("기본 차림 0 / 7 준비")
                self.assert_no_overflow(page)
                page.locator('#eventnav [data-event="first"]').click()
                expect(card).to_have_count(0)
                self.select_month(page, 9, year=2027)
                page.locator('#eventnav [data-event="jungyang"]').click()
                expect(card).to_have_count(0)
                page.locator(".brand-home").click()
                self.guest(page)
                self.select_month(page, 9)
                page.locator('#eventnav [data-event="jungyang"]').click()
                expect(card).to_have_count(0)
                expect(page.locator("#jungyang-prep")).to_be_empty()
                self.assertEqual(fixture.writes, [])
                self.assertEqual(fixture.records, original)

    RITUALS = {
        "yeongdeung": (2, 5, 1), "chilseok": (7, 8, 2),
        "chuseok": (8, 5, 2), "dongji": (11, 3, 1),
    }
    REFERENCE_ONLY = {
        "hongsumagi": 1, "samsin": 3, "chopail": 4, "dano": 5,
        "baekjung": 7, "seongju": 10, "samjae": 12,
    }

    def open_event(self, page, event_id, month, year=2026):
        self.select_month(page, month, year=year)
        page.locator(f'#eventnav [data-event="{event_id}"]').click()

    def test_source_rituals_mother_saves_only_event_key_and_reloads(self):
        for event_id, (month, count, step_count) in self.RITUALS.items():
            with self.subTest(event=event_id):
                first_key = f"sangbogi:cycle:2026-{month:02d}"
                event_key = f"sangbogi:event:2026-{month:02d}:{event_id}"
                other_year_key = f"sangbogi:event:2027-{month:02d}:{event_id}"
                page, fixture = self.open_page({first_key: legacy_cycle()})
                original_first = fixture.records[first_key]
                self.login(page, "어머니")
                self.open_event(page, event_id, month)
                expect(page.locator("#ritual-prep #ritual-guide-card")).to_have_count(1)
                expect(page.locator("#ritual-reference")).to_be_empty()
                expect(page.locator("#ritual-progress")).to_have_text(f"준비안 0 / {count} 확인")
                expect(page.locator("#ritual-items-card [role=checkbox]")).to_have_count(count)
                expect(page.locator("#ritual-steps-card [role=checkbox]")).to_have_count(step_count)
                for card in ("#shopping-grid", "#prog", "#sangcard", "#stepscard"):
                    expect(page.locator(card)).to_be_hidden()
                expect(page.locator("#fixed .row, #var .row, #steps .step")).to_have_count(0)
                expect(page.locator("#donecard")).to_be_visible()
                page.locator("#ritual-items-card .row").first.click()
                page.locator("#ritual-items-card [role=checkbox]").nth(1).click()
                page.locator("#ritual-steps-card .row").first.click()
                expect(page.locator("#ritual-progress")).to_have_text(f"준비안 2 / {count} 확인")
                self.wait_saved(page)
                saved = json.loads(fixture.records[event_key])
                ids = page.locator("#ritual-items-card [role=checkbox]").evaluate_all("els => els.map(e => e.id)")
                step_ids = page.locator("#ritual-steps-card [role=checkbox]").evaluate_all("els => els.map(e => e.id)")
                self.assertTrue(all(i.startswith(f"ritual-{event_id}-") and not i.startswith(f"ritual-{event_id}-step-") for i in ids))
                self.assertTrue(all(i.startswith(f"ritual-{event_id}-step-") for i in step_ids))
                expected = {i[:-6] for i in ids[:2] + step_ids[:1]}
                self.assertEqual({k for k, v in saved["part"].items() if v.get("on")}, expected)
                self.assertTrue(all(v["by"] == "어머니" and v["at"] for v in saved["part"].values()))
                self.assertTrue(all(write["key"] == event_key for write in fixture.writes))
                self.assertEqual(fixture.records[first_key], original_first)
                # The first day and another year do not inherit the event's checks.
                page.locator('#eventnav [data-event="first"]').click()
                expect(page.locator("#ritual-prep #ritual-items-card")).to_have_count(0)
                expect(page.locator("#total")).to_have_text("/18")
                self.open_event(page, event_id, month, year=2027)
                expect(page.locator("#ritual-progress")).to_have_text(f"준비안 0 / {count} 확인")
                self.assertNotIn(other_year_key, fixture.records)
                page.reload()
                self.login(page, "어머니")
                self.open_event(page, event_id, month)
                expect(page.locator("#ritual-progress")).to_have_text(f"준비안 2 / {count} 확인")
                expect(page.locator("#ritual-items-card [aria-checked=true]")).to_have_count(2)
                expect(page.locator("#ritual-steps-card [aria-checked=true]")).to_have_count(1)
                self.assertEqual(fixture.records[first_key], original_first)

    def test_daeboreum_three_checks_are_separate_from_first_hongsumagi_and_year(self):
        first_key = 'sangbogi:cycle:2026-01'
        hong_key = 'sangbogi:event:2026-01:hongsumagi'
        event_key = 'sangbogi:event:2026-01:daeboreum'
        page, fixture = self.open_page({first_key: legacy_cycle(), hong_key: legacy_cycle()}, width=390, height=844)
        before = copy.deepcopy(fixture.records)
        self.login(page, '어머니')
        self.open_event(page, 'daeboreum', 1)
        expect(page.locator('#ritual-items-card [role=checkbox]')).to_have_count(3)
        expect(page.locator('#ritual-steps-card')).to_have_count(0)
        expect(page.locator('#ritual-progress')).to_have_text('준비안 0 / 3 확인')
        details = page.locator('.ritual-source-details')
        details.locator('summary').click()
        expect(details).to_contain_text('과일과 전은 따로 올리지 않습니다')
        expect(details).to_contain_text('한 가지만 하면 된다고')
        expect(details.locator('a')).to_have_count(2)
        self.assertEqual(fixture.writes, [])
        self.assert_no_overflow(page)
        preview_dir = os.environ.get('CALENDS_PREVIEW_DIR')
        if preview_dir:
            page.locator('#ritual-prep').screenshot(path=str(Path(preview_dir) / 'daeboreum-preview-390.png'))
        page.locator('#ritual-items-card .row').first.click()
        self.wait_saved(page)
        expect(page.locator('#ritual-progress')).to_have_text('준비안 1 / 3 확인')
        self.assertTrue(json.loads(fixture.records[event_key])['part']['ritual-daeboreum-rice']['on'])
        self.assertTrue(all(write['key'] == event_key for write in fixture.writes))
        self.assertEqual(fixture.records[first_key], before[first_key])
        self.assertEqual(fixture.records[hong_key], before[hong_key])
        self.open_event(page, 'hongsumagi', 1)
        expect(page.locator('#ritual-prep')).to_be_empty()
        self.open_event(page, 'daeboreum', 1, year=2027)
        expect(page.locator('#ritual-progress')).to_have_text('준비안 0 / 3 확인')
        self.open_event(page, 'daeboreum', 1)
        page.reload()
        self.login(page, '어머니')
        self.open_event(page, 'daeboreum', 1)
        expect(page.locator('#ritual-progress')).to_have_text('준비안 1 / 3 확인')

    def test_seongju_fruit_conditions_are_reference_only_not_global_rules(self):
        page, fixture = self.open_page(width=390, height=844)
        self.login(page, '어머니')
        self.open_event(page, 'seongju', 10)
        details = page.locator('.ritual-source-details')
        details.locator('summary').click()
        expect(details).to_contain_text('씨없는수박')
        expect(details).to_contain_text('자몽도 가능하다는 회원 댓글은 본문과 다르며')
        expect(page.locator('#ritual-items-card, #donebox button')).to_have_count(0)
        self.assertEqual(fixture.writes, [])
        self.assert_no_overflow(page)
        preview_dir = os.environ.get('CALENDS_PREVIEW_DIR')
        if preview_dir:
            page.locator('#ritual-reference').screenshot(path=str(Path(preview_dir) / 'seongju-preview-390.png'))
        self.open_event(page, 'samsin', 3)
        expect(page.locator('.ritual-source-details')).not_to_contain_text('씨없는수박')
        self.open_event(page, 'first', 10)
        expect(page.locator('.ritual-source-details')).not_to_contain_text('씨없는수박')
        self.assertEqual(fixture.writes, [])

    def test_reference_only_events_have_guidance_without_checks_or_writes(self):
        for event_id, month in self.REFERENCE_ONLY.items():
            with self.subTest(event=event_id):
                page, fixture = self.open_page()
                original = copy.deepcopy(fixture.records)
                self.login(page, "어머니")
                self.open_event(page, event_id, month)
                expect(page.locator("#ritual-reference #ritual-guide-card")).to_have_count(1)
                expect(page.locator("#ritual-prep")).to_be_empty()
                for selector in ("#ritual-progress", "#ritual-items-card", "#ritual-steps-card"):
                    expect(page.locator(selector)).to_have_count(0)
                expect(page.locator("#ritual-reference [role=checkbox]")).to_have_count(0)
                expect(page.locator("#donebox button")).to_have_count(0)
                details = page.locator("#ritual-reference .ritual-source-details")
                details.locator("summary").click()
                expect(details).to_have_attribute("open", "")
                self.assertGreaterEqual(details.locator('a[href^="https://cafe.naver.com/"]').count(), 2)
                self.assertEqual(fixture.writes, [])
                self.assertEqual(fixture.records, original)

    def test_source_details_stay_open_and_reading_never_writes(self):
        page, fixture = self.open_page()
        original = copy.deepcopy(fixture.records)
        self.login(page, "어머니")
        for event_id, month in ("chilseok", 7), ("dongji", 11), ("samsin", 3):
            self.open_event(page, event_id, month)
            details = page.locator(".ritual-source-details")
            expect(details).to_have_count(1)
            expect(details).not_to_have_attribute("open", "")
            details.locator("summary").click()
            expect(details).to_have_attribute("open", "")
            page.evaluate("loadCycle()")
            self.wait_saved(page)
            expect(page.locator(".ritual-source-details")).to_have_attribute("open", "")
        # Existing first-day guidance keeps its counts; months 2 and 10 only add reading text.
        for month, bulsa in ((2, 0), (10, 1)):
            self.select_month(page, month)
            expect(page.locator("#total")).to_have_text("/18")
            expect(page.locator("#rice-offering-card [role=checkbox]")).to_have_count(4)
            expect(page.locator("#bulsa-prep-card [role=checkbox]")).to_have_count(bulsa)
            expect(page.locator("#ritual-reference #ritual-guide-card")).to_have_count(1)
            expect(page.locator("#ritual-prep")).to_be_empty()
            expect(page.locator("#ritual-reference [role=checkbox]")).to_have_count(0)
            details = page.locator("#ritual-reference .ritual-source-details")
            details.locator("summary").click()
            expect(details).to_have_attribute("open", "")
            page.evaluate("loadCycle()")
            expect(page.locator("#ritual-reference .ritual-source-details")).to_have_attribute("open", "")
        self.assertEqual(fixture.writes, [])
        self.assertEqual(fixture.records, original)

    def test_guest_strips_ritual_guidance_and_checklist_nodes(self):
        page, fixture = self.open_page()
        self.login(page, "어머니")
        self.open_event(page, "chuseok", 8)
        expect(page.locator("#ritual-prep #ritual-items-card")).to_have_count(1)
        page.locator(".brand-home").click()
        self.guest(page)
        for event_id, month in ("chuseok", 8), ("yeongdeung", 2), ("samsin", 3), ("dongji", 11), ("daeboreum", 1), ("seongju", 10):
            self.open_event(page, event_id, month)
            for selector in ("#ritual-reference", "#ritual-prep", "#donebox"):
                expect(page.locator(selector)).to_be_empty()
            for selector in ("#ritual-guide-card", "#ritual-progress", ".ritual-source-details", "#app [role=checkbox]"):
                expect(page.locator(selector)).to_have_count(0)
        self.assertEqual(fixture.writes, [])

    def test_ritual_cards_fit_320_390_1440_with_large_touch_targets(self):
        for width, height in ((1440, 1000), (390, 844), (320, 640)):
            for event_id, month in ("chilseok", 7), ("chuseok", 8), ("dongji", 11), ("samsin", 3), ("daeboreum", 1), ("seongju", 10):
                with self.subTest(viewport=f"{width}x{height}", event=event_id):
                    page, _ = self.open_page(width=width, height=height)
                    self.login(page, "어머니")
                    self.open_event(page, event_id, month)
                    page.locator(".ritual-source-details summary").click()
                    self.assert_no_overflow(page)
                    overflow = page.evaluate("""() => [...document.querySelectorAll('#ritual-reference *, #ritual-prep *')]
                      .filter(el => el.getBoundingClientRect().right > innerWidth + 1).length""")
                    self.assertEqual(overflow, 0)
                    targets = page.locator("#ritual-prep button, #ritual-reference button, .ritual-source-details summary")
                    for target in targets.all():
                        bounds = target.bounding_box()
                        self.assertGreaterEqual(bounds["width"], 40)
                        self.assertGreaterEqual(bounds["height"], 40)


if __name__ == "__main__":
    unittest.main(verbosity=2)
