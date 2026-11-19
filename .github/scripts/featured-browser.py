"""Exercise the photographed objects themselves and the five completed inspection flows."""
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

root = os.environ.get('KALIMPONG_REVIEW', 'http://127.0.0.1:8765').rstrip('/') + '/complex/shared/station/'
out = Path('station-evidence')
out.mkdir(exist_ok=True)
expect.set_options(timeout=20000)

# Coordinates on the source photographs, outside the circular markers on both screen sizes.
scenes = {
    'shelf': [('Lipton Darjeeling Tea 250 g', .17, .35), ('Coffee Nescafe 50g Jar', .56, .54),
              ('Biscuit Parle G 100g', .90, .51)],
    'counter': [('Ladi Pav (6)', .24, .61), ('Milk Bread 400 g', .60, .58),
                ('Hill Sourdough Boule', .86, .56)],
    'sabzi': [('Tomato', .25, .46), ('Iskus (Squash)', .57, .46), ('Spinach (Palak)', .90, .42)],
    'grocery': [('Sona Masoori Rice (loose)', .35, .60), ('Hill Red Rice 1 kg', .56, .38),
                ('Darjeeling Tea, first flush 100 g', .78, .51)]
}

with sync_playwright() as pw:
    for engine, width, height in [('chromium', 1440, 920), ('webkit', 390, 844)]:
        browser = getattr(pw, engine).launch()
        page = browser.new_page(viewport={'width': width, 'height': height},
                                has_touch=engine == 'webkit', reduced_motion='reduce')
        page.route('https://shala-stats.shalas.workers.dev/**', lambda r: r.fulfill(body=''))
        sheet = page.locator('#sheet')
        button = lambda name: sheet.get_by_role('button', name=name, exact=True)
        for scene, products in scenes.items():
            page.goto(root+'#'+scene, wait_until='domcontentloaded')
            expect(page.locator('#world')).to_have_attribute('data-scene', scene)
            expect(page.locator('#explore-3d')).to_be_in_viewport()
            image = page.locator('#scene')
            image.evaluate('(el)=>el.decode()')
            for index, (name, x, y) in enumerate(products):
                page.evaluate('window.scrollTo(0,0)')
                r = image.bounding_box()
                point = (r['x']+r['width']*x, r['y']+r['height']*y)
                if engine == 'webkit':
                    page.touchscreen.tap(*point)
                else:
                    page.mouse.click(*point)
                expect(sheet.get_by_role('heading')).to_have_text(name)
                if scene == 'shelf':
                    button('Catalogue photo').click()
                    photo = sheet.locator('img:visible')
                    assert photo.get_attribute('src').startswith('../urc-products/')
                    photo.evaluate('(el)=>el.decode()')
                    expect(photo).to_be_in_viewport(ratio=1)
                    if index == 0:
                        page.screenshot(path=out/f'{engine}-catalogue-pack.jpg')
                if scene == 'grocery' and index == 0:
                    for grams, label, price in [(250,'250 g','15.50'),(1000,'1 kg','62.00'),(500,'500 g','31.00')]:
                        sheet.get_by_role('radio', name=label, exact=True).check()
                        photo = sheet.locator('img:visible')
                        expect(photo).to_have_attribute('src',f'sona-masoori-loose-{grams}g.webp')
                        photo.evaluate('(el)=>el.decode()')
                        expect(sheet.locator('output')).to_have_text(label+' · ₹'+price)
                    page.screenshot(path=out/f'{engine}-rice-scale.jpg')
                if scene == 'grocery' and index == 1:
                    button('Inspect grains').click()
                    photo = sheet.locator('img:visible')
                    expect(photo).to_have_attribute('src','hill-rice-grains.webp')
                    photo.evaluate('(el)=>el.decode()')
                    page.screenshot(path=out/f'{engine}-red-grains.jpg')
                expect(button('Add to basket')).to_be_in_viewport(ratio=1)
                button('Close').click()
            if scene in ('shelf','grocery'):
                to_buy = products if scene == 'shelf' else products[:2]
                for index, (name, _, _) in enumerate(to_buy):
                    page.locator('#search').fill(name)
                    page.locator('.card').filter(has=page.get_by_text(name, exact=True)).click()
                    if scene == 'shelf':
                        button('Catalogue photo').click()
                    elif index == 0:
                        sheet.get_by_role('radio', name='500 g',exact=True).check()
                    else:
                        button('Inspect grains').click()
                    button('Add to basket').click()
                    button('Close').click()
        page.reload(wait_until='domcontentloaded')
        page.locator('.km-basket-button').click()
        frame = page.frame_locator('#km-trip-dialog iframe')
        expect(frame.locator('#total')).to_have_text('₹635')
        expect(frame.locator('[data-item="sona-masoori-loose"] output')).to_have_text('500 g')
        expect(frame.locator('[data-item]')).to_have_count(5)
        print(engine, 'opened all twelve products directly and saved all five new selections, total ₹635', flush=True)
        browser.close()
