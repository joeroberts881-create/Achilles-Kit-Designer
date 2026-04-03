/* main.js — state, boot, UI event handlers */

/* ── Global state ─────────────────────────────────────────
   S holds every setting that affects the rendered kit.
   All UI changes update S, then call redraw().

   colA–colD = the 4 kit colours (body, sleeves, etc.)
   colE      = text/number colour
   style     = 'solid' or a pattern key from patterns.js
   view      = 'front' or 'back'
   shirt     = shirt key matching an entry in shirts.js (e.g. 'vneck', 'crew')
   fmt       = export format: 'png' or 'svg'
   badgeUrl / sponsorUrl = base64 data URLs from uploaded images
   ──────────────────────────────────────────────────────── */
var S = {
  colA: '#FFFFFF',
  colB: '#FFFFFF',
  colC: '#FFFFFF',
  colD: '#FFFFFF',
  colE: '#000000',
  style:      'solid',
  patOpacity: 25,   // 0–100 (set from pattern defaultOpacity when pattern selected)
  patRotate:  0,    // 0–359 degrees
  patScale:   100,  // 25–400 percent
  nameScale:  100,  // 50–150 percent
  numScale:   100,  // 50–150 percent
  view:  'front',
  shirt: 'vneck',
  fmt:   'png',
  badgeUrl:   null,
  sponsorUrl: null
};

/* ── Default state ────────────────────────────────────────
   Used by resetKit() to wipe everything back to a blank kit.
   Change these if you want a different starting point.
   ──────────────────────────────────────────────────────── */
var DEFAULTS = {
  colA: '#FFFFFF', colB: '#FFFFFF', colC: '#FFFFFF', colD: '#FFFFFF', colE: '#000000',
  style: 'solid', patOpacity: 25, patRotate: 0, patScale: 100,
  nameScale: 100, numScale: 100, view: 'front', shirt: 'vneck', fmt: 'png',
  badgeUrl: null, sponsorUrl: null
};

/* ── Undo ─────────────────────────────────────────────────
   Every meaningful change calls pushUndo() first, which
   saves a full snapshot of S + all text fields.
   Ctrl/Cmd+Z calls undo() to restore the previous snapshot.
   MAX_UNDO controls how many steps back the user can go.
   ──────────────────────────────────────────────────────── */
var undoStack = [];
var MAX_UNDO = 30; // ← increase if you want more undo history

function captureSnapshot() {
  return {
    S: Object.assign({}, S),
    pName:      document.getElementById('pName').value,
    pNum:       document.getElementById('pNum').value,
    nameFont:   document.getElementById('nameFont').value,
    numFont:    document.getElementById('numFont').value,
    sponsorTxt: document.getElementById('sponsorTxt').value
  };
}

function saveToStorage() {
  // Persists current state to localStorage so the kit survives a page refresh.
  try { localStorage.setItem('achilles_kit', JSON.stringify(captureSnapshot())); } catch(e) {}
}

function pushUndo() {
  undoStack.push(captureSnapshot());
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  updateUndoBtn();
  saveToStorage();
}

function updateUndoBtn() {
  var btn = document.getElementById('undoBtn');
  if (btn) btn.disabled = undoStack.length === 0;
}

/* restoreSnapshot — rebuilds the entire UI from a saved snapshot.
   Called by undo() and on page load (to restore from localStorage). */
function restoreSnapshot(snap) {
  Object.assign(S, snap.S);
  document.getElementById('pName').value      = snap.pName;
  document.getElementById('pNum').value       = snap.pNum;
  document.getElementById('nameFont').value   = snap.nameFont;
  document.getElementById('numFont').value    = snap.numFont;
  document.getElementById('sponsorTxt').value = snap.sponsorTxt;

  // hex inputs + colour pickers + previews + swatch highlights
  ['A','B','C','D','E'].forEach(function(k) {
    var v = S['col' + k];
    document.getElementById('hex' + k).value             = v;
    document.getElementById('prev' + k).style.background = v;
    document.getElementById('pick' + k).value            = v;
    updateSwatchSelection(k, v);
  });

  // sliders + value labels
  document.getElementById('patOpacity').value          = S.patOpacity;
  document.getElementById('patRotate').value           = S.patRotate;
  document.getElementById('patScale').value            = S.patScale;
  document.getElementById('nameSize').value            = S.nameScale;
  document.getElementById('numSize').value             = S.numScale;
  document.getElementById('patOpacityVal').textContent = S.patOpacity + '%';
  document.getElementById('patRotateVal').textContent  = S.patRotate  + '\u00b0';
  document.getElementById('patScaleVal').textContent   = S.patScale   + '%';
  document.getElementById('nameSizeVal').textContent   = S.nameScale  + '%';
  document.getElementById('numSizeVal').textContent    = S.numScale   + '%';

  // pattern tabs — highlight whichever tab matches S.style
  document.querySelectorAll('.ktab').forEach(function(t) {
    t.classList.toggle('on', t.dataset.pat === S.style);
  });
  var patOpts = document.getElementById('patOpts');
  var patRow  = document.getElementById('patternColourRow');
  var isPattern = S.style !== 'solid';
  patOpts.style.display = isPattern ? 'block' : 'none';
  patRow.style.display  = isPattern ? ''      : 'none';

  // view toggle + shirt image
  document.getElementById('vFront').classList.toggle('on', S.view === 'front');
  document.getElementById('vBack').classList.toggle('on',  S.view === 'back');
  var T = window.SHIRTS[S.shirt + '_' + S.view];
  if (T) {
    document.getElementById('shirtImg').src = T.src;
    document.getElementById('colourSvg').setAttribute('viewBox', '0 0 ' + T.w + ' ' + T.h);
    document.getElementById('logosSvg').setAttribute('viewBox',  '0 0 ' + T.w + ' ' + T.h);
  }

  // sponsor conflict UI
  updateSponsorUI();
  // badge clear button
  updateBadgeUI();
  // char count
  updateNameCount();

  redraw();
}

function undo() {
  if (!undoStack.length) return;
  restoreSnapshot(undoStack.pop());
  updateUndoBtn();
}

// Ctrl+Z / Cmd+Z keyboard shortcut for undo
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  }
});

/* ── Reset ────────────────────────────────────────────────
   Wipes the kit back to DEFAULTS (defined at the top).
   The default font used here must match an option in the
   font <select> elements in the HTML.
   ──────────────────────────────────────────────────────── */
function resetKit() {
  pushUndo();
  document.getElementById('pName').value      = '';
  document.getElementById('pNum').value       = '';
  document.getElementById('nameFont').value   = "'Barlow Condensed',sans-serif"; // ← default name font
  document.getElementById('numFont').value    = "'Barlow Condensed',sans-serif"; // ← default number font
  document.getElementById('sponsorTxt').value = '';
  document.getElementById('upBadge').value    = '';
  document.getElementById('upSponsor').value  = '';
  restoreSnapshot({ S: Object.assign({}, DEFAULTS), pName: '', pNum: '',
    nameFont: "'Barlow Condensed',sans-serif", numFont: "'Barlow Condensed',sans-serif",
    sponsorTxt: '' });
  undoStack = [];
  updateUndoBtn();
  saveToStorage();
}

/* ── Section toggle ───────────────────────────────────────
   Two variants: toggleColSec for colour sub-sections
   (uses nextElementSibling), toggleSec for main panels
   (uses id="body-X" / id="arr-X" naming convention).
   ──────────────────────────────────────────────────────── */
function toggleColSec(head) {
  var body  = head.nextElementSibling;
  var arrow = head.querySelector('.col-sec-arrow');
  var open  = body.classList.contains('open');
  body.classList.toggle('open', !open);
  arrow.classList.toggle('open', !open);
}

function toggleSec(id) {
  var b = document.getElementById('body-' + id);
  var a = document.getElementById('arr-' + id);
  var o = b.classList.contains('open');
  b.classList.toggle('open', !o);
  a.classList.toggle('open', !o);
}

/* ── Colour handlers ──────────────────────────────────────
   onHex  — called when the user types a hex value directly.
             Validates the format before applying.
   applyPick — called when the native colour picker changes.
   Both update S, the preview swatch, and trigger redraw().
   ──────────────────────────────────────────────────────── */
function onHex(k, v) {
  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
    pushUndo();
    S['col' + k] = v;
    document.getElementById('prev' + k).style.background = v;
    document.getElementById('pick' + k).value = v;
    updateSwatchSelection(k, v);
    redraw();
  }
}

function applyPick(k, v) {
  pushUndo();
  S['col' + k] = v;
  document.getElementById('hex' + k).value             = v;
  document.getElementById('prev' + k).style.background = v;
  updateSwatchSelection(k, v);
  redraw();
}

/* ── Pattern ──────────────────────────────────────────────
   setKitStyle — switches the active pattern tab and updates S.style.
     When switching to a pattern, the opacity/rotation/scale sliders
     are reset to that pattern's defaults (from window.PATTERNS in patterns.js).

   onPatOpt — called when any pattern slider changes (opacity/rotate/scale).

   onNameNumOpt — called when name or number size sliders change.
   ──────────────────────────────────────────────────────── */
function setKitStyle(el, s) {
  pushUndo();
  document.querySelectorAll('.ktab').forEach(function(t) { t.classList.remove('on'); });
  el.classList.add('on');
  S.style = s;
  var patOpts = document.getElementById('patOpts');
  var patRow  = document.getElementById('patternColourRow');
  if (s === 'solid') {
    patOpts.style.display = 'none';
    patRow.style.display  = 'none';
  } else {
    patOpts.style.display = 'block';
    patRow.style.display  = '';
    // Reset sliders to this pattern's recommended defaults
    var pat = window.PATTERNS && window.PATTERNS[s];
    var defOp = pat ? Math.round((pat.defaultOpacity || 0.25) * 100) : 25;
    S.patOpacity = defOp;
    S.patRotate  = 0;
    S.patScale   = 100;
    document.getElementById('patOpacity').value          = defOp;
    document.getElementById('patRotate').value           = 0;
    document.getElementById('patScale').value            = 100;
    document.getElementById('patOpacityVal').textContent = defOp + '%';
    document.getElementById('patRotateVal').textContent  = '0\u00b0';
    document.getElementById('patScaleVal').textContent   = '100%';
  }
  redraw();
}

function onPatOpt() {
  pushUndo();
  S.patOpacity = parseInt(document.getElementById('patOpacity').value);
  S.patRotate  = parseInt(document.getElementById('patRotate').value);
  S.patScale   = parseInt(document.getElementById('patScale').value);
  document.getElementById('patOpacityVal').textContent = S.patOpacity + '%';
  document.getElementById('patRotateVal').textContent  = S.patRotate + '\u00b0';
  document.getElementById('patScaleVal').textContent   = S.patScale + '%';
  redraw();
}

function onNameNumOpt() {
  pushUndo();
  S.nameScale = parseInt(document.getElementById('nameSize').value);
  S.numScale  = parseInt(document.getElementById('numSize').value);
  document.getElementById('nameSizeVal').textContent = S.nameScale + '%';
  document.getElementById('numSizeVal').textContent  = S.numScale  + '%';
  redraw();
}

/* ── Text inputs (name / number / sponsor) ────────────────
   onTextInput — generic handler for name/number/sponsor text fields.
   updateNameCount — updates the "X/12" character counter below the
     name field. Change the limit (12) here if needed.
   ──────────────────────────────────────────────────────── */
function onTextInput() {
  pushUndo();
  updateNameCount();
  updateSponsorConflict();
  redraw();
}

function updateNameCount() {
  var el  = document.getElementById('pName');
  var cnt = document.getElementById('nameCount');
  if (!el || !cnt) return;
  var len = el.value.length;
  var limit = 12; // ← max name length shown in the counter
  cnt.textContent = len + '/' + limit;
  cnt.className = 'name-count' + (len >= limit ? ' at-limit' : len >= 9 ? ' near-limit' : '');
}

/* ── Image uploads ────────────────────────────────────────
   loadImg — reads the selected file as a base64 data URL and stores
     it in S.badgeUrl or S.sponsorUrl, then redraws.
   clearImg — removes the stored image URL and resets the file input.
   updateBadgeUI / updateSponsorUI — toggle the "loaded" state of the
     upload box (different title text, show/hide clear button).
   updateSponsorConflict — shows a warning if both a sponsor image
     and sponsor text are provided (only one will be shown on the kit).
   ──────────────────────────────────────────────────────── */
function loadImg(k, inp) {
  if (!inp.files || !inp.files[0]) return;
  pushUndo();
  var r = new FileReader();
  var fname = inp.files[0].name;
  r.onload = function(e) {
    S[k + 'Url'] = e.target.result;
    if (k === 'badge')   updateBadgeUI(fname);
    if (k === 'sponsor') updateSponsorUI(fname);
    redraw();
  };
  r.readAsDataURL(inp.files[0]);
}

function clearImg(k) {
  pushUndo();
  S[k + 'Url'] = null;
  document.getElementById('up' + (k === 'badge' ? 'Badge' : 'Sponsor')).value = '';
  if (k === 'badge')   updateBadgeUI();
  if (k === 'sponsor') updateSponsorUI();
  redraw();
}

function updateBadgeUI(fname) {
  var box   = document.getElementById('upBadgeBox');
  var title = document.getElementById('upBadgeTitle');
  var btn   = document.getElementById('clearBadgeBtn');
  if (S.badgeUrl) {
    box.classList.add('loaded');
    title.textContent = fname || 'Badge loaded';
    btn.style.display = 'block';
  } else {
    box.classList.remove('loaded');
    title.textContent = 'Upload crest \u2014 PNG / SVG'; // ← change upload prompt text here
    btn.style.display = 'none';
  }
}

function updateSponsorUI(fname) {
  var box   = document.getElementById('upSponsorBox');
  var title = document.getElementById('upSponsorTitle');
  var btn   = document.getElementById('clearSponsorBtn');
  var txt   = document.getElementById('sponsorTxt');
  if (S.sponsorUrl) {
    box.classList.add('loaded');
    title.textContent   = fname || 'Sponsor image loaded';
    btn.style.display   = 'block';
    // Disable the text field when an image is uploaded (image takes priority)
    txt.disabled        = true;
    txt.style.opacity   = '0.45';
  } else {
    box.classList.remove('loaded');
    title.textContent   = 'Upload sponsor logo \u2014 PNG'; // ← change upload prompt text here
    btn.style.display   = 'none';
    txt.disabled        = false;
    txt.style.opacity   = '';
  }
  updateSponsorConflict();
}

function updateSponsorConflict() {
  // Shows a warning when both a sponsor image and sponsor text are filled in
  var notice = document.getElementById('sponsorConflict');
  var txt    = document.getElementById('sponsorTxt');
  if (!notice) return;
  notice.style.display = (S.sponsorUrl && txt.value.trim()) ? '' : 'none';
}

/* ── Pattern swatches ─────────────────────────────────────
   PREVIEW_SCALE controls how zoomed-out each pattern looks in the
   small tab thumbnail. Lower = more zoomed out (more tiles visible).
   Keys must match pattern keys in window.PATTERNS (patterns.js).
   ──────────────────────────────────────────────────────── */
var PREVIEW_SCALE = {
  stripe:   0.3,  // ← adjust these to change how the pattern tab thumbnails look
  hoop:     0.3,
  geo:      0.35,
  halftone: 0.65
};

/* buildPatternPreviews — generates a small SVG thumbnail inside each
   pattern tab button. Called once on boot. */
function buildPatternPreviews() {
  var sz = 22, ht = 16; // ← thumbnail size in pixels
  document.querySelectorAll('.ktab[data-pat]').forEach(function(tab) {
    var key = tab.dataset.pat;
    if (key === 'solid') {
      tab.insertAdjacentHTML('afterbegin',
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + sz + '" height="' + ht + '" viewBox="0 0 ' + sz + ' ' + ht + '" style="display:block;border-radius:2px;background:var(--border)"></svg>');
      return;
    }
    var pat = window.PATTERNS && window.PATTERNS[key];
    if (!pat) return;
    var sc  = PREVIEW_SCALE[key] || 0.3;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + sz + '" height="' + ht + '" viewBox="0 0 ' + sz + ' ' + ht + '" style="display:block;border-radius:2px;background:var(--blue-light);overflow:hidden">'
            + '<g opacity="0.8">' + pat.render('var(--blue)', sz, ht, { scale: sc }) + '</g></svg>';
    tab.insertAdjacentHTML('afterbegin', svg);
  });
}

/* ── Shirt / view / format ────────────────────────────────
   setShirt — switches the active shirt type and reloads the view.
   setView  — switches front/back and updates the shirt image +
              SVG viewBoxes to match the new template dimensions.
   setFmt   — toggles the export format button highlight (png/svg).
   ──────────────────────────────────────────────────────── */
function setShirt(s) { pushUndo(); S.shirt = s; setView(S.view); }

function setFmt(el, f) {
  document.querySelectorAll('.fmt-btn').forEach(function(b) { b.classList.remove('on'); });
  el.classList.add('on');
  S.fmt = f;
}

function setView(v) {
  S.view = v;
  document.getElementById('vFront').classList.toggle('on', v === 'front');
  document.getElementById('vBack').classList.toggle('on',  v === 'back');
  // Look up the shirt template from shirts.js using "shirtKey_view" (e.g. "vneck_front")
  var key = S.shirt + '_' + v;
  var T = window.SHIRTS[key];
  if (T) {
    document.getElementById('shirtImg').src = T.src;
    document.getElementById('colourSvg').setAttribute('viewBox', '0 0 ' + T.w + ' ' + T.h);
    document.getElementById('logosSvg').setAttribute('viewBox',  '0 0 ' + T.w + ' ' + T.h);
  }
  redraw();
}

/* ── Colour swatches ──────────────────────────────────────
   SWATCHES is the list of preset colours shown in the colour pickers.
   Add, remove, or reorder hex values here to change what's available.
   Group them with a comment so they stay organised.

   LIGHT_SWATCHES — colours that need a dark border so they're visible
   on the light panel background. Add any light colours you add above.
   ──────────────────────────────────────────────────────── */
var SWATCHES = [
  // Whites & greys
  '#FFFFFF','#F5F5F5','#CCCCCC','#999999','#666666','#333333','#1A1A1A','#000000',
  // Reds
  '#FF0000','#CC0000','#990000','#CC2200','#E83030','#FF6666',
  // Oranges & ambers
  '#FF6600','#FF8800','#FFAA00','#E87722',
  // Yellows
  '#FFDD00','#FFE851','#F5D000',
  // Greens
  '#006600','#008800','#00AA00','#33CC33','#00CC66','#007A4D','#003320',
  // Blues
  '#003087','#0047AB','#1E4FA3','#005EB8','#00AEEF','#6CADDF','#C8E6F5',
  // Navy & dark blues
  '#001F5B','#0A1E5E','#002366',
  // Purples
  '#4B0082','#6A0DAD','#9B59B6','#C39BD3',
  // Pinks
  '#FF69B4','#FF1493','#CC0066',
  // Maroon & burgundy
  '#800000','#6D1A36','#A0174C',
  // Browns & golds
  '#8B4513','#C9A84C','#FFD700','#B8860B',
  // Sky & light blues
  '#87CEEB','#56A0D3','#4169E1',
  // Kit whites with tint
  '#F0F4FF','#E8EEF8'
];

// Colours that need a dark border so they're visible on the light background.
// Add any new light colours you add to SWATCHES here too.
var LIGHT_SWATCHES = new Set(['#FFFFFF','#F5F5F5','#F0F4FF','#E8EEF8','#C8E6F5','#FFE851','#FFDD00','#F5D000','#CCCCCC']);

/* buildSwatches — creates a clickable swatch div for each colour in
   SWATCHES and appends them to every .swatch-picker container.
   Each swatch click applies the colour to its slot (A–E) and redraws. */
function buildSwatches() {
  document.querySelectorAll('.swatch-picker').forEach(function(container) {
    var key = container.dataset.key; // 'A', 'B', 'C', 'D', or 'E'
    SWATCHES.forEach(function(hex) {
      var el = document.createElement('div');
      el.className = 'swatch' + (LIGHT_SWATCHES.has(hex) ? ' light' : '');
      el.style.background = hex;
      el.title = hex;
      el.addEventListener('click', function() {
        pushUndo();
        S['col' + key] = hex;
        document.getElementById('hex'  + key).value             = hex;
        document.getElementById('prev' + key).style.background  = hex;
        document.getElementById('pick' + key).value             = hex;
        updateSwatchSelection(key, hex);
        redraw();
      });
      container.appendChild(el);
    });
  });
}

/* updateSwatchSelection — highlights the swatch that matches the current
   colour for slot k. Compares both hex string and rgb() style value
   because the browser converts the background colour to rgb internally. */
function updateSwatchSelection(key, hex) {
  var container = document.getElementById('sp-' + key);
  if (!container) return;
  container.querySelectorAll('.swatch').forEach(function(el) {
    el.classList.toggle('selected', el.style.background === hexToRgbStyle(hex) || el.title.toUpperCase() === hex.toUpperCase());
  });
}

function hexToRgbStyle(hex) {
  var r = parseInt(hex.slice(1,3),16);
  var g = parseInt(hex.slice(3,5),16);
  var b = parseInt(hex.slice(5,7),16);
  return 'rgb(' + r + ', ' + g + ', ' + b + ')';
}

/* ── Boot ─────────────────────────────────────────────────
   Runs once when the page loads:
   1. Build pattern tab thumbnails
   2. Build colour swatch grids
   3. Restore the last saved kit from localStorage, or show the default.
   ──────────────────────────────────────────────────────── */
buildPatternPreviews();
buildSwatches();

(function() {
  try {
    var saved = localStorage.getItem('achilles_kit');
    if (saved) { restoreSnapshot(JSON.parse(saved)); return; }
  } catch(e) {}
  // No saved state — start fresh with defaults
  updateNameCount();
  setView('front');
}());
