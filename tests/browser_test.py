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

    def test_legacy_september_records_belong_to_first_day_and_holiday_stays_empty(self):
        record = legacy_cycle()
        record["done"] = {"done:중양": stamp(on=True)}
        key = "sangbogi:cycle:2026-09"
        page, fixture = self.open_page({key: record})
        original = fixture.records[key]
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
        expect(page.locator("#eventplan")).to_contain_text("상차림은 아직 정하지 않았습니다")
        expect(page.locator("#fixed .row, #var .row, #gifts .row, #steps .step, #donebox button")).to_have_count(0)
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
        self.assertNotIn("불사단지 쌀 교체", page.locator("#app").inner_html())
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
                    page.screenshot(path=f"/tmp/calends-{width}-family.png", full_page=True)
                page.locator("#changeme").click()
                self.guest(page)
                self.assert_no_overflow(page)


if __name__ == "__main__":
    unittest.main(verbosity=2)
