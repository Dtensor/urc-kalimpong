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
        page.route('https://fonts.googleapis.com/**',lambda r:r.abort())
        page.route('https://fonts.gstatic.com/**',lambda r:r.abort())
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
        for selector in ['a[href="../../bakery/?view=hall"]','a[href="#grocery"]','a[href="../../sabzi/?view=hall"]','a[href="../easy.html?venue=cinema"]','a[href="../../?view=hall"]','a[href="../../../?view=list"]']:
            link=page.locator(selector).first.evaluate('(el)=>el.href')
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
        page.get_by_role('button',name='Visit Sabzi Mandi',exact=True).click()
        expect(page.locator('h1')).to_have_text('Sabzi Mandi')
        expect(page.locator('#basket')).to_have_text('Produce list · 0')
        page.locator('#scene').evaluate('(img)=>img.decode()')
        for pin in page.locator('#pins .pin').all():
            assert pin.evaluate('el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el}')
        page.screenshot(path=out/f'{engine}-produce.jpg',type='jpeg',quality=82)
        page.get_by_role('button',name='Iskus squash in scene',exact=True).click()
        expect(page.locator('dialog h2')).to_have_text('Iskus (Squash)')
        expect(page.locator('.weight-choice output')).to_have_text('250 g · ₹7.50')
        page.get_by_role('button',name='Close',exact=True).click()
        page.get_by_role('button',name='Tomatoes in scene',exact=True).click()
        for amount,subtotal in [('500 g','₹20.00'),('1 kg','₹40.00'),('250 g','₹10.00')]:
            page.get_by_role('radio',name=amount,exact=True).check()
            expect(page.locator('.weight-choice output')).to_have_text(amount+' · '+subtotal)
        page.get_by_role('button',name='Add to basket').click()
        expect(page.locator('dialog [role=status]')).to_have_text('In your basket · 250 g')
        page.get_by_role('button',name='Close',exact=True).click()
        page.get_by_role('button',name='Spinach in scene',exact=True).click()
        expect(page.locator('.weight-choice')).to_have_count(0)
        page.get_by_role('button',name='Add to basket').click()
        expect(page.locator('#basket')).to_have_text('Produce list · 2')
        page.get_by_role('link',name='View basket').click()
        expect(page.locator('.list-row').filter(has_text='Tomato')).to_contain_text('250 g')
        expect(page.locator('.list-row').filter(has_text='Spinach')).to_contain_text('1 bunch')
        total=page.locator('#main .panel').filter(has_text='Estimated total').locator('.price')
        expect(total).to_contain_text('₹40')
        assert float((total.inner_text()).replace('₹','').strip())==40
        page.goto(root+'complex/shared/station/#sabzi')
        expect(page.locator('#basket')).to_have_text('Produce list · 2')
        assert page.evaluate('document.documentElement.scrollWidth===innerWidth')
        page.get_by_role('button',name='Plaza',exact=True).click()
        expect(page.locator('#basket')).to_have_text('Basket · 1')
        page.get_by_role('button',name='Visit Station Grocery',exact=True).click()
        expect(page.locator('h1')).to_have_text('Station Grocery')
        page.locator('#scene').evaluate('(img)=>img.decode()')
        page.screenshot(path=out/f'{engine}-grocery.jpg',type='jpeg',quality=80)
        for label in ['Loose rice','Hill red rice','First-flush tea']:
            page.get_by_role('button',name=label+' in scene',exact=True).click()
            if label=='Loose rice':page.get_by_role('radio',name='500 g',exact=True).check()
            page.get_by_role('button',name='Add to basket').click()
            page.get_by_role('button',name='Close',exact=True).click()
        page.locator('#basket').click()
        total=page.locator('#main .panel').filter(has_text='Estimated total').locator('.price')
        expect(total).to_contain_text('₹471')
        assert not errors,errors
        for scene,path in [('plaza','complex/'),('hall','mall/'),('shelf','mall/'),('bakery','complex/bakery/'),('counter','complex/bakery/'),('sabzi','complex/sabzi/'),('grocery','complex/grocery/')]:
            page.goto(root+'complex/shared/station/#'+scene,wait_until='domcontentloaded')
            switch=page.locator('#explore-3d')
            expect(switch).to_be_in_viewport()
            assert switch.bounding_box()['y']<110
            page.evaluate('window.scrollTo(0, 800)')
            expect(switch).to_be_in_viewport()
            print(engine,'opening classic',scene,flush=True)
            switch.click()
            page.wait_for_load_state('domcontentloaded')
            assert page.url.startswith(root+path+'?view=hall'),page.url
            back=page.locator('#km-classic-switch a')
            if not back.count():
                print(page.url,page.title(),page.locator('script[data-screen]').count(),errors[-3:],flush=True)
            expect(back).to_be_in_viewport()
            if scene=='counter': page.screenshot(path=out/f'{engine}-classic-switch.jpg',type='jpeg',quality=80)
            back.click()
            expect(page.locator('#world')).to_have_attribute('data-scene',scene)
        for venue,path in [('cinema','complex/cinema/'),('sabzi','complex/sabzi/')]:
            page.goto(root+'complex/shared/easy.html?venue='+venue,wait_until='domcontentloaded')
            forward=page.get_by_role('link',name='Explore in 3D',exact=True).first
            expect(forward).to_be_in_viewport()
            forward.click()
            assert page.url.startswith(root+path+'?view=hall')
            page.locator('#km-classic-switch a').click()
            assert 'easy.html?venue='+venue in page.url

        print(engine,'passed public entry, hall, shelf, search, shared basket, shop links, classic routes and motion')
        b.close()
