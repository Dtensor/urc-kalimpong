from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import json,os
root=os.environ.get('KALIMPONG_REVIEW','http://127.0.0.1:8765').rstrip('/')+'/'
out=Path('station-evidence');out.mkdir(exist_ok=True)
with sync_playwright() as pw:
    for engine,size in [('chromium',(1440,920)),('webkit',(390,844))]:
        opts={}
        b=getattr(pw,engine).launch(**opts)
        page=b.new_page(viewport={'width':size[0],'height':size[1]})
        errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
        page.route('https://shala-stats.shalas.workers.dev/**',lambda r:r.fulfill(status=200,content_type='application/javascript',body=''))
        page.goto(root,wait_until='domcontentloaded')
        expect(page.locator('#matches')).to_have_text('1,715 items')
        page.locator('#scene').evaluate('(img)=>img.decode()')
        page.screenshot(path=out/f'{engine}-plaza.jpg',type='jpeg',quality=82)
        page.get_by_role('button',name='Enter the canteen',exact=True).click()
        page.get_by_role('button',name='Walk to the shelf',exact=True).click()
        page.get_by_role('button',name='Darjeeling tea',exact=True).click()
        page.get_by_role('button',name='Add to basket').click()
        expect(page.locator('#basket')).to_have_text('Basket · 1')
        page.get_by_role('link',name='View basket').click()
        expect(page.locator('#main')).to_contain_text('Lipton Darjeeling Tea')
        page.goto(root+'mall/');expect(page.locator('h1')).to_have_text('The canteen hall')
        expect(page.locator('#basket')).to_have_text('Basket · 1')
        page.locator('#search').fill('shampoo')
        expect(page.locator('.card').first).to_contain_text('Shampoo',ignore_case=True)
        page.locator('.card').first.click();expect(page.locator('dialog')).to_be_visible()
        page.get_by_role('button',name='Close',exact=True).click()
        page.locator('#search').fill('zzzzzz');expect(page.locator('.card')).to_have_count(0)
        page.goto(root+'complex/');expect(page.locator('h1')).to_have_text('Station Plaza')
        page.get_by_role('button',name='Motion on').click();expect(page.locator('#motion')).to_have_attribute('aria-pressed','false')
        for selector in ['a[href="../../bakery/?view=hall"]','a[href="../../grocery/"]','a[href="../../sabzi/"]','a[href="../../cinema/"]','a[href="../../?view=hall"]','a[href="../../../?view=list"]']:
            link=page.locator(selector).evaluate('(el)=>el.href')
            assert page.request.get(link).ok,link
        assert page.evaluate('document.documentElement.scrollWidth===innerWidth')
        page.get_by_role('button',name='Visit the bakery',exact=True).click()
        expect(page.locator('h1')).to_have_text('Station Bakehouse')
        expect(page.locator('#sample-note')).to_be_visible()
        page.get_by_role('button',name='Step inside',exact=True).click()
        expect(page.locator('h1')).to_have_text('At the bread counter')
        expect(page.locator('#basket')).to_have_text('Bakery basket · 0')
        page.locator('#scene').evaluate('(img)=>img.decode()')
        for pin in page.locator('#pins .pin').all():
            assert pin.evaluate('''button=>{
              const r=button.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
              return document.elementFromPoint(x,y)===button;
            }'''), 'A bread hotspot is clipped or covered'
        page.screenshot(path=out/f'{engine}-bakery-counter.jpg',type='jpeg',quality=82)
        for label,title in [('Ladi pav','Ladi Pav (6)'),('Milk bread','Milk Bread 400 g'),('Hill sourdough','Hill Sourdough Boule')]:
            page.get_by_role('button',name=label,exact=True).click()
            expect(page.locator('dialog h2')).to_have_text(title)
            if label!='Hill sourdough': page.get_by_role('button',name='Close',exact=True).click()
        page.get_by_role('button',name='Add to basket').click()
        expect(page.locator('#basket')).to_have_text('Bakery basket · 1')
        page.get_by_role('link',name='View basket').click()
        expect(page.locator('#main')).to_contain_text('Hill Sourdough Boule')
        page.goto(root+'complex/shared/station/#counter')
        expect(page.locator('#basket')).to_have_text('Bakery basket · 1')
        expect(page.locator('h1')).to_have_text('At the bread counter')
        page.locator('#search').fill('milk bread')
        expect(page.locator('.card')).to_have_count(1)
        expect(page.locator('.card')).to_contain_text('Milk Bread 400 g')
        assert page.evaluate('document.documentElement.scrollWidth===innerWidth')
        page.get_by_role('button',name='Plaza',exact=True).click()
        expect(page.locator('#basket')).to_have_text('Basket · 1')
        expect(page.locator('#matches')).to_have_text('1,715 items')
        assert not errors,errors
        print(engine,'passed public entry, hall, shelf, search, shared basket, shop links, classic routes and motion')
        b.close()
