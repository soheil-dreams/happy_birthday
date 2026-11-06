(() => {
  'use strict';
  const experience = document.getElementById('experience');
  const envelopeButton = document.getElementById('envelopeButton');
  const cardButton = document.getElementById('cardButton');
  const musicButton = document.getElementById('musicButton');
  const music = document.getElementById('backgroundMusic');
  const toast = document.getElementById('toast');
  const srStatus = document.getElementById('srStatus');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let phase = 'address';
  let sequenceToken = 0;
  let autoFlipTimer = 0;
  let toastTimer = 0;
  let musicEnabled = false;
  let audioContext;
  const delay = ms => new Promise(resolve => setTimeout(resolve, reducedMotion.matches ? Math.min(ms, 90) : ms));

  function setPhase(next) {
    phase = next;
    experience.dataset.phase = next;
    const cardActive = next === 'front' || next === 'back';
    if (next === 'back') experience.dataset.hintSeen = 'true';
    cardButton.setAttribute('aria-label', next === 'front'
      ? 'Karte antippen, um die Rückseite zu sehen'
      : 'Karte antippen, um die Vorderseite zu sehen');
    envelopeButton.tabIndex = next === 'address' ? 0 : -1;
    envelopeButton.setAttribute('aria-hidden', String(next !== 'address'));
    cardButton.tabIndex = cardActive ? 0 : -1;
    document.getElementById('restartButton').tabIndex = cardActive ? 0 : -1;
    document.getElementById('shareButton').tabIndex = cardActive ? 0 : -1;
    srStatus.textContent = ({
      address:'Briefumschlag antippen, um den Geburtstagsbrief zu öffnen.',
      turning:'Der Umschlag dreht sich um.',
      sealed:'Ein Blumensiegel ist zu sehen.',
      breaking:'Das Siegel löst sich.',
      opening:'Der Briefumschlag öffnet sich.',
      lifting:'Die Karte gleitet aus dem Umschlag.',
      reveal:'Die Karte schwebt aus dem Umschlag.',
      front:'Die Vorderseite der Geburtstagskarte. Tippen, um die persönliche Nachricht zu lesen.',
      back:'Persönlicher Geburtstagsgruß. Tippen, um die Vorderseite zu sehen.'
    })[next] || '';
  }

  function bell(freq=880) {
    if (!musicEnabled) return;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      audioContext ||= new Context();
      if (audioContext.state === 'suspended') audioContext.resume();
      const now = audioContext.currentTime;
      [1,2.02,3.06].forEach((k,i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';osc.frequency.value=freq*k;
        gain.gain.setValueAtTime(.0001,now);
        gain.gain.exponentialRampToValueAtTime(.024/(i+1),now+.025);
        gain.gain.exponentialRampToValueAtTime(.0001,now+1.7);
        osc.connect(gain).connect(audioContext.destination);
        osc.start(now);osc.stop(now+1.75);
      });
    } catch (_) { /* Sound effects are optional. */ }
  }

  async function openLetter() {
    if (phase !== 'address') return;
    const token = ++sequenceToken;
    const alive = () => token === sequenceToken;
    clearTimeout(autoFlipTimer);
    setPhase('turning');
    await delay(1310); if (!alive()) return;
    setPhase('sealed');
    await delay(400); if (!alive()) return;
    setPhase('breaking');
    particles.burst('gold', 28, .5, .55);
    bell(659);
    await delay(720); if (!alive()) return;
    setPhase('opening');
    particles.burst('glitter', 17, .5, .4);
    bell(784);
    await delay(1470); if (!alive()) return;
    setPhase('lifting');
    particles.burst('rose', 15, .5, .45);
    await delay(1430); if (!alive()) return;
    setPhase('reveal');
    particles.burst('glitter', 19, .5, .39);
    await delay(1080); if (!alive()) return;
    setPhase('front');
    particles.burst('hearts', 27, .5, .48);
    particles.burst('glitter', 28, .5, .44);
    bell(988);
    if (!reducedMotion.matches) {
      autoFlipTimer = window.setTimeout(() => {
        if (phase === 'front' && token === sequenceToken) flipCard(true);
      }, 18000);
    }
  }
  function flipCard(automatic=false) {
    if (phase !== 'front' && phase !== 'back') return;
    clearTimeout(autoFlipTimer);
    setPhase(phase === 'front' ? 'back' : 'front');
    if (phase === 'back') {
      particles.burst('glitter',automatic?24:35,.5,.5);
      if (!automatic) bell(784);
    } else {
      particles.burst('hearts',14,.5,.45);
    }
  }
  function replay() {
    ++sequenceToken;
    clearTimeout(autoFlipTimer);
    experience.dataset.hintSeen = 'false';
    setPhase('address');
    particles.clearBursts();
  }
  envelopeButton.addEventListener('click', openLetter);
  cardButton.addEventListener('click', () => flipCard(false));
  document.getElementById('restartButton').addEventListener('click', replay);

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  document.getElementById('shareButton').addEventListener('click', async () => {
    if (location.protocol === 'file:') {
      showToast('Zum Teilen die HTML-Datei online veröffentlichen.');
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title:document.title,text:'Ein kleiner Geburtstagsgruß für dich ♡',url:location.href });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(location.href);
        showToast('Link kopiert ♡');
      } else {showToast('Link aus der Adresszeile kopieren.');}
    } catch (e) {if (e.name !== 'AbortError') showToast('Das Teilen ist hier nicht möglich.');}
  });

  // Browsers commonly block unmuted autoplay before the visitor interacts.
  // Try quietly on load; if blocked, request playback synchronously on the
  // FIRST genuine pointer/keyboard gesture. A manual mute is never overridden.
  let manuallyMutedMusic = false;
  function syncMusicButton(playing) {
    musicEnabled = playing;
    musicButton.setAttribute('aria-pressed', String(playing));
    musicButton.setAttribute('aria-label', playing ? 'Musik ausschalten' : 'Musik einschalten');
  }
  async function attemptMusicStart(withBell = false) {
    if (manuallyMutedMusic || !music.paused) return !music.paused;
    try {
      music.volume = .33;
      // The actual play() request occurs before any await, within the gesture.
      await music.play();
      if (manuallyMutedMusic) { music.pause(); syncMusicButton(false); return false; }
      syncMusicButton(true);
      if (withBell) bell(880);
      return true;
    } catch (_) {
      if (music.paused) syncMusicButton(false);
      return false;
    }
  }
  function startMusicOnFirstInteraction(event) {
    if (manuallyMutedMusic || !music.paused) return;
    if (event.target.closest?.('#musicButton')) return; // handled by its own click
    if (event.type === 'keydown' && (event.altKey || event.ctrlKey || event.metaKey)) return;
    void attemptMusicStart();
  }
  document.addEventListener('pointerdown', startMusicOnFirstInteraction, true);
  document.addEventListener('keydown', startMusicOnFirstInteraction, true);
  music.addEventListener('play', () => syncMusicButton(true));
  music.addEventListener('pause', () => syncMusicButton(false));
  musicButton.addEventListener('click', async () => {
    if (!music.paused) {
      manuallyMutedMusic = true;
      music.pause();
      syncMusicButton(false);
      return;
    }
    manuallyMutedMusic = false;
    if (!await attemptMusicStart(true)) {
      showToast('Musik kann auf diesem Gerät nicht abgespielt werden.');
    }
  });
  // May succeed when the browser/site already has autoplay permission.
  // When it does not, this failure is silent and the first gesture handles it.
  void attemptMusicStart();

  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return;
    if (event.key === 'Escape') {replay();return;}
    if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && ['front','back'].includes(phase)) {
      event.preventDefault();flipCard(false);
    }
  });
  // Very restrained 3D parallax: pointer position is softened; touch never tilts.
  [envelopeButton,cardButton].forEach(element => {
    element.addEventListener('pointermove', event => {
      if (reducedMotion.matches || event.pointerType === 'touch') return;
      const bounds=element.getBoundingClientRect();
      const x=((event.clientX-bounds.left)/bounds.width-.5)*5;
      const y=((event.clientY-bounds.top)/bounds.height-.5)*-5;
      element.style.setProperty('--tilt-x',x.toFixed(2)+'deg');
      element.style.setProperty('--tilt-y',y.toFixed(2)+'deg');
    });
    element.addEventListener('pointerleave', () => {
      element.style.setProperty('--tilt-x','0deg');
      element.style.setProperty('--tilt-y','0deg');
    });
  });
  let touchStart = null;
  cardButton.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') touchStart={x:e.clientX,y:e.clientY};
  });
  cardButton.addEventListener('pointerup', e => {
    if (!touchStart) return;
    if (Math.abs(e.clientX-touchStart.x)>55 && Math.abs(e.clientY-touchStart.y)<110) {
      e.preventDefault();
      flipCard(false);
      // Some mobile browsers synthesize a click after a swipe.
      cardButton.dataset.swiped='true';
      setTimeout(() => delete cardButton.dataset.swiped,360);
    }
    touchStart=null;
  });
  cardButton.addEventListener('click', e=>{
    if (cardButton.dataset.swiped==='true') {e.stopImmediatePropagation();delete cardButton.dataset.swiped;}
  },true);

  // Cinematic ambient dust, tiny floating paper petals, a wax-seal glitter burst,
  // and occasional blush hearts on reveal. All particles are generated locally.
  class MagicParticles {
    constructor(canvas) {
      this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true});
      this.items=[];this.width=innerWidth;this.height=innerHeight;
      this.lastTime=0;this.running=false;
      this.resize=this.resize.bind(this);this.frame=this.frame.bind(this);
      window.addEventListener('resize',this.resize,{passive:true});
      document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.start()});
      this.resize();this.start();
    }
    resize(){
      this.width=window.innerWidth;this.height=window.innerHeight;
      const r=Math.min(2,window.devicePixelRatio||1);
      this.canvas.width=Math.round(this.width*r);this.canvas.height=Math.round(this.height*r);
      this.ctx.setTransform(r,0,0,r,0,0);
    }
    particle(kind,x,y){
      const rand=Math.random;
      const isBurst=kind!=='ambient';
      const speed=kind==='gold'?1.8+rand()*3.9:1.1+rand()*2.6;
      const angle=rand()*Math.PI*2;
      return {
        kind, x,y, age:0,
        vx:isBurst?Math.cos(angle)*speed:(rand()-.5)*.45,
        vy:isBurst?Math.sin(angle)*speed-1.2:-.16-rand()*.28,
        size:kind==='hearts'?3.5+rand()*5:kind==='gold'?1+rand()*2.9:1.5+rand()*3.3,
        alpha:kind==='ambient'?.16+rand()*.25:.52+rand()*.42,
        life:kind==='ambient'?420+rand()*500:115+rand()*130,
        rotation:rand()*7,spin:(rand()-.5)*.045,
        wave:rand()*Math.PI*2,
        tint:rand()
      };
    }
    burst(kind,quantity,x=.5,y=.5){
      if (reducedMotion.matches)return;
      const centerX=this.width*x,centerY=this.height*y;
      for(let i=0;i<quantity;i++)this.items.push(this.particle(kind,centerX+(Math.random()-.5)*45,centerY+(Math.random()-.5)*25));
      this.start();
    }
    clearBursts(){this.items=this.items.filter(p=>p.kind==='ambient')}
    start(){if(!this.running&&!reducedMotion.matches){this.running=true;requestAnimationFrame(this.frame)}}
    frame(t){
      if (document.hidden){this.running=false;return}
      const delta=Math.min(2.3,(t-(this.lastTime||t))/16.667||1);this.lastTime=t;
      const ctx=this.ctx;ctx.clearRect(0,0,this.width,this.height);
      const ambients=this.items.reduce((sum,p)=>sum+(p.kind==='ambient'),0);
      if(ambients<Math.min(22,Math.ceil(this.width/28)) && Math.random()<.13){
        const p=this.particle('ambient',Math.random()*this.width,this.height+10);
        this.items.push(p);
      }
      for(let i=this.items.length-1;i>=0;i--){
        const p=this.items[i];p.age+=delta;p.rotation+=p.spin*delta;
        p.x+=(p.vx+Math.sin(p.age*.02+p.wave)*.18)*delta;
        p.y+=p.vy*delta;
        if(p.kind!=='ambient'){p.vy+=.022*delta;p.vx*=.997}
        if(p.age>p.life || p.y>this.height+35 || p.x<-30||p.x>this.width+30){this.items.splice(i,1);continue}
        const fade=Math.min(1,p.age/22,(p.life-p.age)/35);
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation);
        ctx.globalAlpha=Math.max(0,p.alpha*fade);
        if(p.kind==='hearts'){
          ctx.fillStyle=p.tint>.5?'#d68a99':'#e9a6a4';
          const s=p.size;ctx.beginPath();ctx.moveTo(0,s*.88);ctx.bezierCurveTo(-s*1.3,s*.15,-s*.8,-s*.65,0,-s*.3);ctx.bezierCurveTo(s*.8,-s*.65,s*1.3,s*.15,0,s*.88);ctx.fill();
        }else if(p.kind==='rose'){
          ctx.fillStyle=p.tint>.5?'#e7b6a7':'#cf9eaa';
          ctx.beginPath();ctx.ellipse(0,0,p.size*.62,p.size*1.45,.24,0,Math.PI*2);ctx.fill();
        }else{
          const tint=p.kind==='gold'?'#f2ca7d':p.kind==='ambient'?'#fff4dc':'#fff9f2';
          ctx.fillStyle=tint;
          if(p.kind==='ambient'||p.kind==='glitter'){
            ctx.shadowColor='#fff6dc';ctx.shadowBlur=7;
          }
          ctx.beginPath();ctx.arc(0,0,p.size,0,Math.PI*2);ctx.fill();
          if(p.kind==='glitter'&&p.size>2.6){
            ctx.strokeStyle='#fffdf3';ctx.lineWidth=.7;
            ctx.beginPath();ctx.moveTo(-p.size*2,0);ctx.lineTo(p.size*2,0);ctx.moveTo(0,-p.size*2);ctx.lineTo(0,p.size*2);ctx.stroke();
          }
        }
        ctx.restore();
      }
      requestAnimationFrame(this.frame);
    }
  }
  const particles = new MagicParticles(document.getElementById('magicCanvas'));
  setPhase('address');
})();
