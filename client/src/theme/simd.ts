// Simulator neumorphic design system (extracted from SimulatorBrowser) so the
// ChatGPT-style home and other pages can share the exact Simulator theme.
export const SIMD_CSS = `
.simd{--sp:#ffffff;--shd:rgba(90,98,112,.20);--shl:#ffffff;--ink:#2b3757;--mut:#6a7699;--fnt:#9aa6c2;--blue:#2F6FE0;--green:#1f9d78;--amber:#c98a1e;--track:rgba(43,66,110,.12);--grad:linear-gradient(120deg,#4285F4,#6a53ff 55%,#e15b8c);--disp:Poppins,Inter,system-ui,sans-serif;--mono:'IBM Plex Mono',ui-monospace,monospace;
  background:linear-gradient(180deg,#fdfdfc 0%,#fdfdfc 55%,#fdfdfc 100%);min-height:100vh;color:var(--ink);}
.simd-wrap{padding-top:26px;padding-bottom:44px;}
.simd-neu{background:var(--sp);border-radius:22px;box-shadow:9px 9px 22px var(--shd),-9px -9px 18px var(--shl);}
.simd-inset{box-shadow:inset 5px 5px 11px var(--shd),inset -5px -5px 11px var(--shl);}
.simd-top{display:flex;align-items:center;gap:15px;margin-bottom:20px;flex-wrap:wrap;}
.simd-mark{width:56px;height:56px;border-radius:17px;flex:none;display:grid;place-items:center;color:#2F6FE0;background:var(--sp);box-shadow:6px 6px 14px var(--shd),-6px -6px 12px var(--shl);}
.simd-ttl{min-width:0;}
.simd-ttl h1{font-family:var(--disp);font-weight:700;font-size:clamp(22px,2.6vw,30px);margin:0;letter-spacing:-.01em;line-height:1.05;}
.simd-ttl h1 span{color:#2F6FE0;}
.simd-ttl p{margin:2px 0 0;font-size:12.5px;color:var(--mut);}
.simd-badge{font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.08em;color:var(--blue);padding:8px 13px;border-radius:999px;background:var(--sp);box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);white-space:nowrap;}
.simd-grid{display:grid;grid-template-columns:284px minmax(0,1fr) 320px;gap:20px;align-items:stretch;}
@media(max-width:1180px){.simd-grid{grid-template-columns:260px minmax(0,1fr);}.simd-rightcol{grid-column:1 / -1;display:grid;grid-template-columns:1fr 1fr;gap:20px;}}
@media(max-width:760px){.simd-grid{grid-template-columns:1fr;}.simd-rightcol{grid-template-columns:1fr;}}
/* rail */
.simd-rail{padding:20px 15px;display:flex;flex-direction:column;}
.simd-rail-h{display:flex;align-items:baseline;justify-content:space-between;padding:0 6px;margin-bottom:11px;}
.simd-rail-h b{font-family:var(--disp);font-weight:600;font-size:15px;}
.simd-rail-h span{font-family:var(--mono);font-size:12px;color:var(--mut);}
.simd-rail-prog{height:7px;border-radius:99px;margin:0 6px 13px;position:relative;}
.simd-rail-prog i{position:absolute;left:0;top:0;height:100%;border-radius:99px;background:var(--grad);transition:width .4s ease;}
.simd-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px;flex:1;justify-content:space-between;}
.simd-step{display:flex;align-items:center;gap:11px;padding:10px 11px;border-radius:14px;transition:background .25s,box-shadow .25s;}
.simd-no{width:32px;height:32px;border-radius:10px;flex:none;display:grid;place-items:center;font-family:var(--mono);font-weight:600;font-size:12.5px;color:var(--mut);background:var(--sp);box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);transition:.3s;}
.simd-ic{width:19px;height:19px;color:var(--mut);flex:none;transition:color .3s;}
.simd-lb{font-weight:600;font-size:13px;color:var(--mut);flex:1;min-width:0;transition:color .3s;}
.simd-arw{width:15px;height:15px;color:var(--fnt);opacity:0;flex:none;transition:opacity .3s;}
.simd-step.active{background:var(--sp);box-shadow:6px 6px 14px var(--shd),-6px -6px 12px var(--shl);}
.simd-step.active .simd-no{color:#fff;background:var(--grad);box-shadow:3px 3px 8px rgba(106,83,255,.38);}
.simd-step.active .simd-lb{color:var(--ink);}.simd-step.active .simd-ic{color:var(--blue);}.simd-step.active .simd-arw{opacity:1;}
.simd-step.done .simd-no{color:#fff;background:linear-gradient(135deg,#3fc8a4,#1f9d78);}
.simd-step.done .simd-lb{color:var(--ink);}.simd-step.done .simd-ic{color:var(--green);}
/* form */
.simd-form{padding:24px clamp(16px,2.2vw,28px);}
.simd-form-h{display:flex;align-items:center;gap:13px;margin-bottom:20px;}
.simd-tile{width:48px;height:48px;border-radius:14px;flex:none;display:grid;place-items:center;color:#2F6FE0;background:var(--sp);box-shadow:5px 5px 12px var(--shd),-5px -5px 10px var(--shl);}
.simd-form-h h2{font-family:var(--disp);font-weight:700;font-size:clamp(18px,2.2vw,23px);margin:0;}
.simd-fields{display:grid;grid-template-columns:1fr 1fr;gap:15px 17px;}
@media(max-width:520px){.simd-fields{grid-template-columns:1fr;}}
.simd-field label{display:block;font-size:12.5px;font-weight:600;color:var(--mut);margin-bottom:6px;}
.simd-field label em{font-style:normal;font-weight:500;color:var(--fnt);}
.simd-ctl{position:relative;display:flex;align-items:center;border-radius:13px;background:var(--sp);box-shadow:inset 5px 5px 10px var(--shd),inset -4px -4px 9px var(--shl);}
.simd-ctl select,.simd-ctl input{width:100%;border:0;background:transparent;outline:none;font-family:inherit;font-size:13.5px;font-weight:500;color:var(--ink);padding:12px 34px 12px 14px;-webkit-appearance:none;appearance:none;border-radius:13px;cursor:pointer;}
.simd-ctl input{cursor:text;padding-right:14px;}
.simd-ctl input::placeholder{color:var(--fnt);}
.simd-ctl.ro{padding:12px 14px;}
.simd-roval{font-size:13.5px;font-weight:600;color:var(--blue);}
.simd-caret{position:absolute;right:13px;width:11px;height:8px;color:var(--mut);pointer-events:none;}
.simd-ctl:focus-within{box-shadow:inset 5px 5px 10px var(--shd),inset -4px -4px 9px var(--shl),0 0 0 2px rgba(47,111,224,.32);}
.simd-drop{margin-top:18px;display:flex;flex-direction:column;align-items:center;text-align:center;border-radius:17px;padding:26px 16px;border:1.5px dashed rgba(90,120,180,.4);background:var(--sp);box-shadow:inset 5px 5px 12px var(--shd),inset -5px -5px 12px var(--shl);cursor:pointer;transition:box-shadow .2s;}
.simd-drop:hover{box-shadow:inset 3px 3px 8px var(--shd),inset -3px -3px 8px var(--shl);}
.simd-dt{width:52px;height:52px;border-radius:15px;display:grid;place-items:center;color:#2F6FE0;background:var(--sp);box-shadow:5px 5px 12px var(--shd),-5px -5px 10px var(--shl);margin-bottom:11px;}
.simd-drop b{font-family:var(--disp);font-weight:600;font-size:14px;color:var(--ink);}
.simd-drop small{color:var(--mut);font-size:12px;margin-top:4px;}
.simd-drop small.fmt{color:var(--fnt);margin-top:2px;}
.simd-samples{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:14px;}
@media(max-width:520px){.simd-samples{grid-template-columns:1fr;}}
.simd-samp{display:flex;align-items:center;gap:8px;border:0;border-radius:13px;background:var(--sp);box-shadow:5px 5px 12px var(--shd),-5px -5px 10px var(--shl);padding:11px 13px;font-family:inherit;font-weight:600;font-size:13px;color:var(--ink);cursor:pointer;text-align:left;transition:transform .12s,box-shadow .18s;}
.simd-samp svg{color:var(--blue);}
.simd-samp:hover{transform:translateY(-1px);}
.simd-samp.sel{box-shadow:inset 4px 4px 10px var(--shd),inset -4px -4px 10px var(--shl);color:var(--blue);}
.simd-cond{margin-top:16px;}
.simd-cond label{display:block;font-size:12.5px;font-weight:600;color:var(--mut);margin-bottom:8px;}
.simd-cond label em{font-style:normal;font-weight:500;color:var(--fnt);}
.simd-csel{width:100%;border:0;border-radius:13px;background:var(--sp);box-shadow:inset 5px 5px 10px var(--shd),inset -4px -4px 9px var(--shl);padding:12px 36px 12px 14px;font-family:inherit;font-size:13.5px;font-weight:500;color:var(--ink);-webkit-appearance:none;appearance:none;cursor:pointer;outline:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8'><path d='M1 1l5 5 5-5' fill='none' stroke='%236a7699' stroke-width='2' stroke-linecap='round'/></svg>");background-repeat:no-repeat;background-position:right 14px center;}
.simd-csel:focus{box-shadow:inset 5px 5px 10px var(--shd),inset -4px -4px 9px var(--shl),0 0 0 2px rgba(47,111,224,.32);}
.simd-cchip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;font-weight:600;padding:6px 12px;font-size:12px;background:var(--sp);color:var(--blue);box-shadow:3px 3px 8px var(--shd),-3px -3px 6px var(--shl);}
.simd-cchip.ind{color:#fff;background:var(--grad);box-shadow:3px 3px 8px rgba(106,83,255,.35);}
.simd-cx{border:0;background:transparent;cursor:pointer;color:inherit;font-size:15px;line-height:1;padding:0 2px;opacity:.65;transition:opacity .15s;}
.simd-cx:hover{opacity:1;}
.simd-err{margin-top:12px;font-size:13px;font-weight:600;color:#d64545;}
.simd-actions{display:flex;gap:13px;margin-top:20px;flex-wrap:wrap;}
.simd-btn{border:0;cursor:pointer;font-family:var(--disp);font-weight:600;font-size:14.5px;padding:13px 22px;border-radius:14px;display:inline-flex;align-items:center;gap:9px;transition:transform .12s,box-shadow .2s,opacity .2s;}
.simd-btn svg{width:17px;height:17px;}
.simd-btn.run{color:#fff;background:var(--grad);box-shadow:5px 5px 16px rgba(106,83,255,.36),-4px -4px 10px var(--shl);}
.simd-btn.run:hover:not(:disabled){transform:translateY(-1px);}
.simd-btn.run:disabled{opacity:.5;cursor:not-allowed;filter:saturate(.65);}
.simd-btn.ghost{color:var(--blue);background:var(--sp);box-shadow:5px 5px 12px var(--shd),-5px -5px 10px var(--shl);}
.simd-btn.ghost:hover{transform:translateY(-1px);}
/* right cards */
.simd-rightcol{display:flex;flex-direction:column;gap:20px;height:100%;}
.simd-rightcol .simd-card{flex:1;display:flex;flex-direction:column;}
.simd-rightcol .simd-card:first-child{justify-content:center;}
.simd-card{padding:19px;}
.simd-card-h{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.simd-ci{width:25px;height:25px;color:var(--blue);}.simd-ci svg{width:100%;height:100%;}
.simd-card-h h3{font-family:var(--disp);font-weight:600;font-size:15.5px;margin:0;}
.simd-live-sub{font-size:12.5px;color:var(--mut);margin:-6px 0 12px 35px;}
.simd-ring-wrap{display:grid;place-items:center;margin:4px 0 15px;}
.simd-ring{position:relative;width:160px;height:160px;}
.simd-ring svg{width:100%;height:100%;transform:rotate(-90deg);}
.simd-ring-bg{stroke:var(--track);}
.simd-ring-fg{stroke:url(#simdrg);stroke-linecap:round;transition:stroke-dashoffset .45s ease;}
.simd-ring-hole{position:absolute;inset:22px;border-radius:50%;background:var(--sp);display:grid;place-items:center;box-shadow:inset 5px 5px 12px var(--shd),inset -5px -5px 12px var(--shl);}
.simd-pct{font-family:var(--disp);font-weight:700;font-size:36px;color:var(--ink);font-variant-numeric:tabular-nums;}
.simd-status{display:flex;align-items:center;gap:9px;border-radius:13px;padding:11px 13px;font-size:12.5px;font-weight:600;color:var(--ink);box-shadow:inset 4px 4px 9px var(--shd),inset -4px -4px 9px var(--shl);}
.simd-dot{width:10px;height:10px;border-radius:50%;background:var(--green);flex:none;box-shadow:0 0 0 4px rgba(31,157,120,.15);}
.simd-status.run .simd-dot{background:var(--blue);animation:simdPulse 1.2s infinite;}
@keyframes simdPulse{0%,100%{box-shadow:0 0 0 3px rgba(47,111,224,.28)}50%{box-shadow:0 0 0 7px rgba(47,111,224,0)}}
.simd-safe-list{display:flex;flex-direction:column;gap:10px;}
.simd-safe{display:flex;align-items:center;gap:12px;padding:12px 13px;border-radius:14px;background:var(--sp);box-shadow:5px 5px 13px var(--shd),-5px -5px 11px var(--shl);}
.simd-si{width:33px;height:33px;border-radius:10px;flex:none;display:grid;place-items:center;box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);}
.simd-si svg{width:17px;height:17px;}.simd-si.b{color:var(--blue);}.simd-si.a{color:var(--amber);}.simd-si.g{color:var(--green);}
.simd-stx b{display:block;font-size:12.5px;font-weight:600;color:var(--ink);}
.simd-stx span{font-size:11px;color:var(--mut);}
/* bottom */
.simd-bottom{margin-top:20px;padding:22px clamp(16px,2vw,26px);}
.simd-stepper{display:flex;align-items:flex-start;gap:5px;overflow-x:auto;padding-bottom:8px;}
.simd-snode{display:flex;flex-direction:column;align-items:center;gap:7px;flex:1;min-width:70px;position:relative;}
.simd-snode::before{content:"";position:absolute;top:17px;left:-50%;width:100%;height:3px;border-radius:3px;background:var(--track);z-index:0;}
.simd-snode:first-child::before{display:none;}
.simd-snode.fill::before{background:linear-gradient(90deg,#3fc8a4,#1f9d78);}
.simd-sd{width:35px;height:35px;border-radius:50%;display:grid;place-items:center;font-family:var(--mono);font-weight:600;font-size:12.5px;color:var(--mut);z-index:1;background:var(--sp);box-shadow:4px 4px 9px var(--shd),-4px -4px 8px var(--shl);transition:.3s;}
.simd-sl{font-size:10px;color:var(--fnt);text-align:center;font-weight:600;line-height:1.2;max-width:80px;}
.simd-snode.active .simd-sd{color:#fff;background:var(--grad);box-shadow:0 4px 12px rgba(106,83,255,.38);}
.simd-snode.done .simd-sd{color:#fff;background:linear-gradient(135deg,#3fc8a4,#1f9d78);}
.simd-snode.active .simd-sl,.simd-snode.done .simd-sl{color:var(--ink);}
.simd-outbox{margin-top:18px;border-radius:17px;padding:17px;}
.simd-out-empty{display:flex;align-items:center;gap:13px;}
.simd-oi{width:42px;height:42px;border-radius:12px;flex:none;display:grid;place-items:center;color:var(--fnt);background:var(--sp);box-shadow:4px 4px 9px var(--shd),-4px -4px 8px var(--shl);}
.simd-oi svg{width:20px;height:20px;}
.simd-out-empty b{font-family:var(--disp);font-weight:600;font-size:15px;color:var(--mut);display:block;}
.simd-out-empty span{font-size:12.5px;color:var(--fnt);}
.simd-res-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;}
.simd-res-head b{font-family:var(--disp);font-weight:600;font-size:15.5px;color:var(--ink);}
.simd-showall{border:0;background:var(--sp);cursor:pointer;font-family:var(--disp);font-weight:600;font-size:12px;color:var(--blue);padding:8px 13px;border-radius:11px;box-shadow:4px 4px 10px var(--shd),-4px -4px 8px var(--shl);transition:transform .12s;}
.simd-showall:hover{transform:translateY(-1px);}
.simd-results{display:flex;flex-direction:column;gap:12px;}
.simd-rrow{border-radius:15px;background:var(--sp);box-shadow:5px 5px 13px var(--shd),-5px -5px 11px var(--shl);}
.simd-rhead{width:100%;border:0;background:transparent;cursor:pointer;display:flex;align-items:center;gap:16px;padding:15px 18px;text-align:left;flex-wrap:wrap;border-radius:15px;}
.simd-rhead .rk{font-family:var(--mono);font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--fnt);min-width:148px;}
.simd-rhead .rv{font-family:var(--disp);font-weight:700;font-size:24px;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1;}
.simd-rhead .rv .sm{font-size:19px;font-weight:700;}
.simd-rhead .rv small{font-size:12px;color:var(--mut);font-weight:600;}
.simd-rhead .rs{font-size:12px;color:var(--mut);}
.simd-pill{display:inline-block;font-size:10px;font-weight:700;padding:4px 9px;border-radius:999px;box-shadow:inset 2px 2px 5px var(--shd),inset -2px -2px 5px var(--shl);}
.simd-pill.g{color:var(--green);}.simd-pill.a{color:var(--amber);}.simd-pill.b{color:var(--blue);}
.simd-spacer{flex:1;min-width:8px;}
.simd-mtog{display:flex;align-items:center;gap:5px;font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--blue);white-space:nowrap;}
.simd-mchev{display:inline-block;transition:transform .3s;}
.simd-rrow.open .simd-mchev{transform:rotate(180deg);}
.simd-det{max-height:0;overflow:hidden;opacity:0;transition:max-height .5s ease,opacity .35s;padding:0 18px;}
.simd-rrow.open .simd-det{max-height:1600px;opacity:1;padding-bottom:16px;}
.simd-dpanel{border-radius:12px;padding:12px;box-shadow:inset 4px 4px 9px var(--shd),inset -4px -4px 9px var(--shl);display:flex;flex-direction:column;gap:9px;}
.simd-dhead{font-family:var(--mono);font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--fnt);}
.simd-drow{display:flex;justify-content:space-between;gap:10px;font-size:11.5px;color:var(--mut);}
.simd-drow b{color:var(--ink);font-weight:600;text-align:right;}
.simd-genes{display:flex;flex-wrap:wrap;gap:5px;}
.simd-gene{font-family:var(--mono);font-size:9.5px;color:#6a53ff;padding:3px 8px;border-radius:7px;box-shadow:inset 2px 2px 4px var(--shd),inset -2px -2px 4px var(--shl);}
.simd-check{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--ink);}
.simd-ck{width:18px;height:18px;border-radius:6px;flex:none;display:grid;place-items:center;color:#2fa08f;font-size:12px;box-shadow:inset 2px 2px 4px var(--shd),inset -2px -2px 4px var(--shl);}
.simd-ba{display:flex;align-items:center;gap:8px;font-size:10.5px;color:var(--mut);}
.simd-ba .lab{min-width:92px;}
.simd-ba .bar{flex:1;height:8px;border-radius:8px;position:relative;box-shadow:inset 2px 2px 4px var(--shd),inset -2px -2px 4px var(--shl);overflow:hidden;}
.simd-ba .bf{position:absolute;left:0;top:0;height:100%;border-radius:8px;}
.simd-ba .d{font-family:var(--disp);font-weight:600;min-width:58px;text-align:right;}
.simd-sym{display:flex;flex-direction:column;gap:5px;padding:9px;border-radius:10px;box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);}
.simd-sym .top{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.simd-sym .cat{font-size:11.5px;font-weight:600;color:var(--ink);}
.simd-sym .top .simd-pill{margin-top:0;}
.simd-sym .sx{display:flex;flex-wrap:wrap;gap:5px;}
.simd-sym .s{font-size:9.5px;color:var(--mut);padding:3px 8px;border-radius:7px;box-shadow:2px 2px 4px var(--shd),-2px -2px 4px var(--shl);}
.simd-note{font-size:10.5px;line-height:1.5;padding:9px 10px;border-radius:10px;color:var(--mut);box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);}
.simd-note.rev{color:var(--green);}.simd-note.warn{color:var(--amber);}
.simd-blist{display:flex;flex-direction:column;gap:6px;}
.simd-bstep{display:flex;gap:9px;align-items:center;padding:8px 10px;border-radius:9px;box-shadow:2px 2px 6px var(--shd),-2px -2px 5px var(--shl);}
.simd-bstep .bn{width:20px;height:20px;border-radius:6px;flex:none;display:grid;place-items:center;font-family:var(--mono);font-size:9px;color:#fff;background:var(--grad);}
.simd-bstep .bt{font-size:11.5px;font-weight:600;color:var(--ink);}
.simd-disc{margin-top:14px;font-size:11.5px;color:var(--fnt);line-height:1.55;text-align:center;}
.simd-details{margin-top:18px;}
.simd-details summary{cursor:pointer;user-select:none;list-style:none;font-size:13.5px;font-weight:600;color:var(--ink);display:flex;align-items:center;gap:8px;}
.simd-details summary::-webkit-details-marker{display:none;}
.simd-chev{display:inline-block;transition:transform .25s;}
.simd-details[open] .simd-chev{transform:rotate(90deg);}
@media(prefers-reduced-motion:reduce){.simd *{transition:none!important;animation:none!important;}}
`;
