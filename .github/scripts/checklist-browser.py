"""Take a five-item list through four counters, a tab closure and a quantity edit."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = os.environ.get('KALIMPONG_REVIEW', 'http://127.0.0.1:8765').rstrip('/') + '/complex/shared/station/'
out = Path('station-evidence')
out.mkdir(exist_ok=True)
expect.set_options(timeout=20000)

with sync_playwright() as pw:
    for engine, width, height in [('chromium', 1440, 920), ('webkit', 390, 844)]:
        browser = getattr(pw, engine).launch()
        context = browser.new_context(viewport={'width': width, 'height': height},
                                      has_touch=engine == 'webkit', reduced_motion='reduce')
        context.route('https://shala-stats.shalas.workers.dev/**', lambda route: route.fulfill(body=''))
        page = context.new_page()
        for scene, products in [('shelf', ['Parle-G']), ('counter', ['Milk bread']),
                                ('grocery', ['Hill red rice']), ('sabzi', ['Tomatoes', 'Spinach'])]:
            page.goto(root+'#'+scene, wait_until='domcontentloaded')
            for product in products:
                page.get_by_role('button', name=product, exact=True).click()
                sheet = page.locator('#sheet')
                if product == 'Tomatoes':
                    sheet.get_by_role('radio', name='250 g', exact=True).check()
                sheet.get_by_role('button', name='Add to basket', exact=True).click()
                sheet.get_by_role('button', name='Close', exact=True).click()
        page.locator('.km-basket-button').click()
        frame = page.frame_locator('#km-trip-dialog iframe')
        frame.get_by_role('button', name='Shop this list').click()
        expect(frame.locator('#counter-choice')).to_have_value('sabzi')
        spinach = frame.locator('[data-item="spinach"] input')
        expect(frame.locator('[data-item="tomato"]')).to_contain_text('250 g')
        spinach.check()
        expect(frame.locator('#pick-progress')).to_have_text('1 of 2 collected at this counter')
        page.screenshot(path=out/f'{engine}-active-checklist.jpg', type='jpeg', quality=85)
        page.close()
        page = context.new_page()
        page.goto(root+'#shelf', wait_until='domcontentloaded')
        page.locator('.km-basket-button').click()
        frame = page.frame_locator('#km-trip-dialog iframe')
        expect(frame.locator('#counter-choice')).to_have_value('sabzi')
        expect(frame.locator('[data-item="spinach"] input')).to_be_checked()
        expect(frame.locator('[data-item="tomato"] input')).not_to_be_checked()
        frame.get_by_role('button', name='Edit basket').click()
        frame.locator('[data-item="spinach"]').get_by_role('button', name='Increase', exact=False).click()
        frame.get_by_role('button', name='Resume shopping').click()
        expect(frame.locator('[data-item="spinach"] input')).not_to_be_checked()
        expect(frame.locator('[data-item="spinach"]')).to_contain_text('2 bunches')
        frame.locator('[data-item="spinach"] input').check()
        frame.locator('[data-item="tomato"] input').check()
        for venue in ['grocery', 'urc', 'bakery']:
            frame.get_by_role('button', name='Next counter').click()
            expect(frame.locator('#counter-choice')).to_have_value(venue)
            frame.get_by_role('checkbox').check()
        expect(frame.locator('#pick-progress')).to_have_text('Shopping complete · All items collected')
        frame.get_by_role('button', name='Finish trip').click()
        expect(frame.locator('#notice')).to_have_text('Trip finished. Your basket is saved.')
        expect(frame.locator('[data-item]')).to_have_count(5)
        expect(frame.locator('#total')).to_have_text('₹239.98')
        frame.get_by_role('button', name='Shop this list').click()
        expect(frame.locator('input:checked')).to_have_count(0)
        frame.get_by_role('button', name='Edit basket').click()
        easy_url = frame.locator('#save-trip').evaluate('(a) => a.href')
        page.set_viewport_size({'width':320, 'height':640})
        page.goto(easy_url, wait_until='domcontentloaded')
        page.locator('[data-list-action=new]').first.click()
        page.locator('#repeat-name').fill('Market day')
        page.locator('#repeat-save button[type=submit]').click()
        expect(page.get_by_text('Market day', exact=True)).to_be_visible()
        header = page.locator('#km-shopping-switch')
        assert page.evaluate('document.documentElement.scrollWidth') == 320
        for control in [header.get_by_role('link'), header.get_by_role('button')]:
            expect(control).to_be_in_viewport(ratio=1)
            assert control.bounding_box()['height'] >= 52
        header.get_by_role('link', name='Explore in 3D').click()
        page.locator('#km-classic-switch a').click()
        expect(page.get_by_text('Market day', exact=True)).to_be_visible()
        header.get_by_role('button', name='My basket').click()
        expect(frame.locator('#total')).to_have_text('₹239.98')
        browser.close()
        print(engine, 'passed the four-counter checklist, tab closure, quantity change and finish', flush=True)
