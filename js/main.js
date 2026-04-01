/* main.js — state, boot, UI event handlers */

var S = {
  colA: '#FFFFFF',
  colB: '#FFFFFF',
  colC: '#FFFFFF',
  colD: '#FFFFFF',
  colE: '#000000',
  style: 'solid',
  view:  'front',
  shirt: 'vneck',
  fmt:   'png',
  badgeUrl:   null,
  sponsorUrl: null
};

function toggleSec(id) {
  var b = document.getElementById('body-' + id);
  var a = document.getElementById('arr-' + id);
  var o = b.classList.contains('open');
  b.classList.toggle('open', !o);
  a.classList.toggle('open', !o);
}

function onHex(k, v) {
  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
    S['col' + k] = v;
    document.getElementById('prev' + k).style.background = v;
    document.getElementById('pick' + k).value = v;
    redraw();
  }
}

function applyPick(k, v) {
  S['col' + k] = v;
  document.getElementById('hex' + k).value = v;
  document.getElementById('prev' + k).style.background = v;
  redraw();
}

function setKitStyle(el, s) {
  document.querySelectorAll('.ktab').forEach(function(t) { t.classList.remove('on'); });
  el.classList.add('on');
  S.style = s;
  redraw();
}

function loadImg(k, inp) {
  var r = new FileReader();
  r.onload = function(e) { S[k + 'Url'] = e.target.result; redraw(); };
  r.readAsDataURL(inp.files[0]);
}

function setShirt(s) { S.shirt = s; setView(S.view); }

function setFmt(el, f) {
  document.querySelectorAll('.fmt-btn').forEach(function(b) { b.classList.remove('on'); });
  el.classList.add('on');
  S.fmt = f;
}

function setView(v) {
  S.view = v;
  document.getElementById('vFront').classList.toggle('on', v === 'front');
  document.getElementById('vBack').classList.toggle('on',  v === 'back');
  var key = S.shirt + '_' + v;
  var T = window.SHIRTS[key];
  if (T) {
    document.getElementById('shirtImg').src = T.src;
    document.getElementById('colourSvg').setAttribute('viewBox', '0 0 ' + T.w + ' ' + T.h);
    document.getElementById('logosSvg').setAttribute('viewBox',  '0 0 ' + T.w + ' ' + T.h);
  }
  redraw();
}

/* Boot — scripts are at bottom of <body> so DOM and all other scripts are ready */
setView('front');
