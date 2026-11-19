"""Record the real browser audio graph. Only the OS recognizer callback is supplied."""
import os,base64,wave
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=os.environ.get('KALIMPONG_REVIEW','http://127.0.0.1:8765').rstrip('/')+'/complex/shared/station/'
capture=os.environ.get('MAYA_CAPTURE_OUT')
with sync_playwright() as pw:
    for engine in ('chromium','webkit'):
        browser=getattr(pw,engine).launch()
        page=browser.new_page(viewport={'width':390,'height':844},has_touch=True)
        page.add_init_script("""(() => {
          window.question='What is the cost of Prinjal?';
          Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:class{
            start(){setTimeout(()=>{if(window.micError)this.onerror({error:window.micError});else this.onresult({results:[[{transcript:window.question}]]});this.onend();},100);}
            abort(){} stop(){this.onend();}
          }});
          const Native=window.AudioContext||window.webkitAudioContext;
          const check=window.audioCheck={sources:0,ended:0,peak:0,blocks:[]};
          class Capture extends Native{
            constructor(...a){
              super(...a);check.rate=this.sampleRate;
              this.tap=this.createScriptProcessor(2048,1,1);
              this.tap.onaudioprocess=e=>{
                const block=e.inputBuffer.getChannelData(0);
                for(const x of block)check.peak=Math.max(check.peak,Math.abs(x));
                if(check.peak>0.001 && check.blocks.length<750)check.blocks.push(Int16Array.from(block,x=>Math.round(Math.max(-1,Math.min(1,x))*32767)));
              };
              this.tap.connect(this.destination);
            }
            createBufferSource(){
              const node=super.createBufferSource();node.connect(this.tap);check.sources++;
              node.addEventListener('ended',()=>check.ended++);return node;
            }
          }
          window.AudioContext=Capture;
        })()""")
        page.goto(root+'#sabzi',wait_until='domcontentloaded')
        page.locator('.km-maya-button').click()
        f=page.frame_locator('#km-maya iframe')
        body=f.locator('body')
        expect(f.locator('#mic')).to_be_visible()
        assert body.evaluate('()=>audioCheck.sources===0')
        if os.environ.get('MAYA_TEST_TRANSCRIPT'):
            body.evaluate('(el,text)=>{window.question=text}',os.environ['MAYA_TEST_TRANSCRIPT'])
        f.locator('#mic').click()
        expect(f.locator('#conversation p').last).to_contain_text('₹50 / kg')
        def finished(count=1):
            body.element_handle().owner_frame().wait_for_function('(n)=>audioCheck.ended>=n && audioCheck.peak>0.02',arg=count,timeout=35000)
        def write_clip(name):
            if not capture:return
            rate,encoded=body.evaluate("""()=>{let text='';for(const c of audioCheck.blocks)text+=String.fromCharCode(...new Uint8Array(c.buffer));return [audioCheck.rate,btoa(text)];}""")
            with wave.open(str(Path(capture)/(engine+'-'+name+'.wav')),'wb') as wav:
                wav.setparams((1,2,rate,0,'NONE',''));wav.writeframes(base64.b64decode(encoded))
        finished();write_clip('heard-en')
        f.locator('#voice-toggle').click()
        prior=body.evaluate('()=>audioCheck.sources')
        f.locator('#question').fill('what about half a kilo?')
        f.locator('#send').click()
        expect(f.locator('#conversation p').last).to_contain_text('₹25')
        assert body.evaluate('()=>audioCheck.sources')==prior
        body.evaluate('()=>{audioCheck.blocks=[];audioCheck.peak=0;}')
        f.locator('#question').fill('बैंगन का दाम क्या है?')
        f.locator('#send').click()
        expect(f.locator('#conversation p').last).to_contain_text('₹50 / किलो')
        f.locator('#read').click()
        finished(prior+1);write_clip('heard-hi')
        f.locator('#language').click()
        f.locator('#question').fill('How much is Sona Masoori Rice?')
        f.locator('#send').click()
        expect(f.locator('#conversation p').last).to_contain_text('₹62 / kg')
        body.evaluate('()=>{audioCheck.blocks=[];audioCheck.peak=0;}')
        prior=body.evaluate('()=>audioCheck.sources')
        f.locator('#read').click()
        finished(prior+5);write_clip('heard-rice')
        f.locator('#voice-toggle').click()
        body.evaluate("()=>{window.micError='not-allowed';audioCheck.peak=0;}")
        prior=body.evaluate('()=>audioCheck.sources')
        f.locator('#mic').click()
        expect(f.locator('#status')).to_contain_text('You can type below')
        finished(prior+1)
        browser.close()
        print(engine,'played actual recorded speech after recognition, quoted the unit price, muted the follow-up and replayed Hindi audio',flush=True)
