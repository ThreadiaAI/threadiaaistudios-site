/* Threadia Scapes: "Christmas Night". Original shader, written for Threadia Ai Studios (no third party shader code).
   Layers back to front: night sky and stars, aurora curtains, far snowy mountains, a pine ridge, a warm village glow,
   snowy foreground, warm bokeh lights, four depths of falling snow, then vignette and grain. */
(window.ThreadiaScapes = window.ThreadiaScapes || { scenes: {} }).scenes.christmas = { frag: `
float h1(float n){return fract(sin(n)*43758.5453);}
float h2(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n1(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(h1(i),h1(i+1.),f);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
float ridge(float x,float s,float amp,float base){return base+amp*(n1(x*s)*.62+n1(x*s*2.3+4.)*.28+n1(x*s*5.1+9.)*.1);}
float pine(float x,float y,float base,float hgt,float dens,float seed,float px){
  // slender layered fir: width shrinks with height, with three tiers of drooping branches
  float c=x*dens,id=floor(c),f=fract(c)-.5;
  float r=h1(id+seed); if(r<.22) return 0.;
  f-=(h1(id+seed*3.1)-.5)*.35;
  float hh=hgt*(.55+.6*r), yy=(y-base)/hh;
  if(yy<-.05||yy>1.) return 0.;
  float tier=fract(clamp(yy,0.,1.)*3.2);
  float w=.30*(1.-clamp(yy,0.,1.))*(.62+.38*(1.-tier))+.012;
  if(yy<0.) w=.03;
  return smoothstep(w+px,w-px,abs(f)/dens*dens);
}
vec3 snowLayer(vec2 uv,float t,float scale,float speed,float size,float blur,float wind){
  uv*=scale; uv.y+=t*speed; uv.x+=sin(t*.3+uv.y*.15)*wind+t*wind*.4;
  vec2 id=floor(uv),f=fract(uv)-.5;
  float r=h2(id);
  vec2 o=vec2(h2(id+3.1)-.5,h2(id+7.7)-.5)*.7;
  o.x+=sin(t*(.6+r)+r*30.)*.12;
  float d=length(f-o);
  float m=smoothstep(size+blur,size*.2,d)*step(.25,r);
  return vec3(m*(.55+.45*r));
}
void main(){
  vec2 q=gl_FragCoord.xy/R; float ar=R.x/R.y; vec2 uv=vec2((q.x-.5)*ar,q.y);
  vec2 par=(M-.5)*vec2(.04,.02);
  float t=T;
  // sky
  vec3 col=mix(vec3(.05,.12,.2),vec3(.01,.015,.05),pow(q.y,.8));
  col+=vec3(.18,.08,.22)*smoothstep(.75,.25,q.y)*.35;
  // stars
  vec2 sg=uv*vec2(140.,140.); vec2 sid=floor(sg); float sr=h2(sid);
  float star=step(.985,sr)*smoothstep(.5,.0,length(fract(sg)-.5))*(.6+.4*sin(t*(1.5+sr*4.)+sr*50.));
  col+=vec3(.85,.9,1.)*star*smoothstep(.35,.8,q.y);
  // aurora
  for(int i=0;i<3;i++){
    float fi=float(i);
    float x=uv.x*.9+fi*.37+par.x*3.;
    float band=.62+.1*fi+.08*sin(x*1.6+t*.07+fi)+.06*(fbm(vec2(x*1.4,t*.05+fi))-.5);
    float d=q.y-band;
    float curtain=exp(-d*d*180.)*.9+smoothstep(0.,.22,d)*exp(-d*7.)*.35*step(0.,d);
    float rays=.55+.45*fbm(vec2(x*9.,t*.18+fi*3.));
    vec3 ac=mix(vec3(.15,1.,.6),vec3(.55,.3,1.),fi*.5+.25*sin(x+t*.1));
    col+=ac*curtain*rays*.42*smoothstep(.3,.6,q.y);
  }
  // moon glow
  float md=length(vec2(uv.x-ar*.3,uv.y-.9));
  col+=vec3(1.,.95,.85)*(smoothstep(.018,.015,md)*.85+exp(-md*14.)*.1);
  // far mountains
  float x=uv.x+par.x;
  float m1=ridge(x+3.,1.3,.2,.3);
  vec3 mcol=mix(vec3(.12,.17,.27),vec3(.55,.62,.75),smoothstep(m1-.12,m1,q.y)*.6);
  float snowcap=smoothstep(m1-.05,m1-.01,q.y);
  mcol=mix(mcol,vec3(.7,.78,.9),snowcap*.55);
  col=mix(col,mcol,smoothstep(m1+.002,m1-.002,q.y)*.92);
  // haze
  col+=vec3(.25,.3,.42)*exp(-abs(q.y-.3)*14.)*.18;
  // pine ridge
  float x2=uv.x+par.x*2.;
  float g2=ridge(x2+11.,2.,.05,.2);
  float t2=pine(x2,q.y,g2-.01,.075,16.,1.,.02);
  col=mix(col,vec3(.05,.08,.12),max(t2,smoothstep(g2+.003,g2-.003,q.y)));
  col=mix(col,vec3(.6,.68,.82),t2*smoothstep(.0,.02,fract((q.y-g2)*40.))*.12);
  // village glow and windows
  float vg=exp(-abs(x2-.35*ar)*4.)*exp(-abs(q.y-g2)*25.);
  col+=vec3(1.,.55,.2)*vg*.35;
  vec2 wg=vec2(x2*60.,q.y*90.); vec2 wid=floor(wg);
  float win=step(.93,h2(wid+floor(t*.05)))*step(abs(q.y-g2+.012),.012)*smoothstep(.6,.0,abs(x2-.35*ar));
  col+=vec3(1.,.7,.3)*win*.8;
  // foreground snow bank
  float x3=uv.x+par.x*4.;
  float g3=ridge(x3+21.,.9,.07,.06);
  float t3=pine(x3+.3,q.y,g3-.02,.17,5.5,7.,.012);
  float fg=smoothstep(g3+.003,g3-.003,q.y);
  vec3 snowc=mix(vec3(.55,.62,.78),vec3(.85,.9,1.),fbm(vec2(x3*8.,q.y*30.))*.6);
  snowc*=.55+.45*smoothstep(g3-.15,g3,q.y);
  vec3 treec=mix(vec3(.02,.05,.06),vec3(.75,.82,.95),step(.82,fract((q.y-g3)*26.+h1(floor((x3+.3)*5.5))))*.55);
  col=mix(col,treec,t3*step(g3-.02,q.y));
  col=mix(col,snowc,fg);
  // sparkle on snow
  float sp=step(.996,h2(floor(gl_FragCoord.xy*.5)+floor(t*3.)))*fg;
  col+=sp*.7;
  // bokeh lights
  for(int i=0;i<14;i++){
    float fi=float(i);
    vec2 bp=vec2(h1(fi*7.1)*ar,h1(fi*3.3)*.9);
    bp.x+=sin(t*.05+fi)*.05+par.x*6.; bp.y+=sin(t*.08+fi*2.)*.03;
    float rad=.025+.05*h1(fi*9.2);
    float d=length(vec2(q.x*ar,q.y)-bp);
    float disc=smoothstep(rad,rad*.82,d)*.16+smoothstep(rad,rad*.94,d)*smoothstep(rad*.8,rad,d)*.12;
    vec3 bc=h1(fi*1.7)>.66?vec3(1.,.25,.25):(h1(fi*1.7)>.33?vec3(1.,.75,.35):vec3(.35,1.,.55));
    col+=bc*disc*(.6+.4*sin(t*.7+fi*3.));
  }
  // falling snow, back to front
  vec2 su=vec2(q.x*ar,q.y)+par*2.;
  col+=snowLayer(su,t,28.,.9,.035,.03,.25)*.35;
  col+=snowLayer(su+3.,t,16.,.75,.05,.04,.35)*.55;
  col+=snowLayer(su+7.,t,9.,.6,.06,.07,.5)*.75;
  col+=snowLayer(su+11.,t,4.5,.5,.06,.16,.7)*.5;
  // grade, vignette, grain
  col=pow(col,vec3(.92));
  col*=1.-.55*pow(length((q-.5)*vec2(1.1,1.3)),2.2);
  col+=(h2(gl_FragCoord.xy+fract(t)*100.)-.5)*.025;
  gl_FragColor=vec4(col,1.);
}` };
