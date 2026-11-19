"""Exercise Maya against catalogue records beyond the original photographed products."""
import os
from playwright.sync_api import sync_playwright,expect
root=os.environ.get('KALIMPONG_REVIEW','http://127.0.0.1:8765').rstrip('/')+'/complex/shared/station/'
with sync_playwright() as pw:
    for engine in ('chromium','webkit'):
        browser=getattr(pw,engine).launch()
        page=browser.new_page(viewport={'width':390,'height':844})
        page.goto(root+'#sabzi',wait_until='domcontentloaded')
        page.locator('.km-maya-button').click()
        f=page.frame_locator('#km-maya iframe')
        f.locator('#voice-toggle').click()
        def ask(text,expected):
            f.locator('#question').fill(text)
            f.locator('#send').click()
            answer=f.locator('#conversation p').last
            expect(answer).to_contain_text(expected)
            return answer.inner_text()
        f.get_by_role('button',name='Brinjal price').click()
        expect(f.locator('#conversation p').last).to_contain_text('₹50 / kg')
        for word in ['Prinjal','eggplant','aubergine','baingan']:
            ask('What is the cost of '+word+'?', '₹50 / kg')
        ask('What about half a kilo?', '₹25')
        ask('What about two kilos?', '₹100')
        ask('How much is 250 grams of Prinjal?', '₹12.5')
        ask('how much are potatoes?', '₹30')
        ask('price of brinjal and okra', '₹30')
        ask('compare brinjal and potato','₹50')
        ask('second','₹30')
        ask('Darjeeling mandarin','₹120')
        ask('What is the price of shampoo?', 'Which')
        assert 2<=f.locator('#actions button').count()<=7
        ask('zorbulo','couldn’t match')
        ask('What is the cheapest vegetable under 40 rupees?', 'Lowest listed prices')
        ask('कद्दू का दाम क्या है?', 'कद्दू')
        ask('बैंगन की कीमत क्या है?', '₹50 / किलो')
        ask('आधा किलो','₹25')
        f.get_by_role('button',name='बाकी सामान जोड़ें').click()
        expect(f.locator('#conversation p').last).to_contain_text('टोकरी')
        assert page.evaluate("JSON.parse(localStorage.getItem('complex.cart.sabzi')).brinjal")==0.5
        browser.close()
        print(engine,'passed aliases, English and Hindi unit prices, quantities, cross-catalogue choices, comparisons, unknown item and basket',flush=True)
