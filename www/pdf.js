/* Gerador de PDF sem dependências: A4, fontes Helvetica padrão, logo em JPEG. */
(function (root) {
  var W = 595.28, H = 841.89, M = 40, CW = W - M * 2;
  var STEEL = [39, 70, 92], YELLOW = [232, 168, 0], INK = [23, 35, 45], GRAY = [100, 114, 124], LIGHT = [238, 241, 243], ZEBRA = [247, 248, 249], WHITE = [255, 255, 255];

  /* Larguras da Helvetica (AFM, por 1000 em) */
  var REG = { ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667, "'": 191, '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278, ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556, '@': 1015, '[': 278, '\\': 278, ']': 278, '^': 469, '_': 556, '`': 333, '{': 334, '|': 260, '}': 334, '~': 584 };
  var BLD = { ' ': 278, '!': 333, '"': 474, '#': 556, '$': 556, '%': 889, '&': 722, "'": 238, '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278, ':': 333, ';': 333, '<': 584, '=': 584, '>': 584, '?': 611, '@': 975, '[': 333, '\\': 278, ']': 333, '^': 584, '_': 556, '`': 333, '{': 389, '|': 280, '}': 389, '~': 584 };
  function fill(map, up, lo) {
    var i, A = 65, a = 97;
    up = up.split(' '); lo = lo.split(' ');
    for (i = 0; i < 26; i++) { map[String.fromCharCode(A + i)] = +up[i]; map[String.fromCharCode(a + i)] = +lo[i]; }
    for (i = 0; i < 10; i++) map[String(i)] = 556;
  }
  fill(REG, '667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611',
            '556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500');
  fill(BLD, '722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611',
            '556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500');

  function chW(ch, bold) {
    var m = bold ? BLD : REG;
    if (m[ch] != null) return m[ch];
    if (ch === ' ') return 278;
    var base = ch.normalize ? ch.normalize('NFD').charAt(0) : ch;
    if (m[base] != null) return m[base];
    return 556;
  }
  function strW(s, size, bold) {
    var w = 0;
    for (var i = 0; i < s.length; i++) w += chW(s.charAt(i), bold);
    return w * size / 1000;
  }
  var SPECIAL = { '−': 0x2D, '–': 0x96, '—': 0x97, '•': 0x95, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '€': 0x80 };
  function hex(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i), v;
      if (SPECIAL[s.charAt(i)] != null) v = SPECIAL[s.charAt(i)];
      else if (c < 256) v = c;
      else v = 63;
      out += (v < 16 ? '0' : '') + v.toString(16);
    }
    return '<' + out + '>';
  }
  function col(c) { return (c[0] / 255).toFixed(3) + ' ' + (c[1] / 255).toFixed(3) + ' ' + (c[2] / 255).toFixed(3); }
  function n2(x) { return x.toFixed(2); }
  function strBytes(s) { var u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; }

  function Doc() { this.pages = []; this.imgs = []; this.addPage(); }
  Doc.prototype.addPage = function () { this.p = []; this.pages.push(this.p); };
  Doc.prototype.text = function (s, x, y, o) {
    o = o || {};
    var size = o.size || 10, bold = !!o.bold, w = strW(s, size, bold);
    if (o.align === 'right') x -= w; else if (o.align === 'center') x -= w / 2;
    this.p.push('BT /' + (bold ? 'F2' : 'F1') + ' ' + n2(size) + ' Tf ' + col(o.color || INK) + ' rg ' + n2(x) + ' ' + n2(H - y) + ' Td ' + hex(s) + ' Tj ET');
  };
  Doc.prototype.rect = function (x, y, w, h, c) { this.p.push(col(c) + ' rg ' + n2(x) + ' ' + n2(H - y - h) + ' ' + n2(w) + ' ' + n2(h) + ' re f'); };
  Doc.prototype.line = function (x1, y1, x2, y2, wd, c) { this.p.push(n2(wd) + ' w ' + col(c) + ' RG ' + n2(x1) + ' ' + n2(H - y1) + ' m ' + n2(x2) + ' ' + n2(H - y2) + ' l S'); };
  Doc.prototype.image = function (idx, x, y, w, h) { this.p.push('q ' + n2(w) + ' 0 0 ' + n2(h) + ' ' + n2(x) + ' ' + n2(H - y - h) + ' cm /Im' + idx + ' Do Q'); };
  Doc.prototype.wrap = function (s, size, bold, maxW) {
    var out = [];
    String(s == null ? '' : s).split(/\r?\n/).forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean), line = '';
      if (!words.length) { out.push(''); return; }
      words.forEach(function (wd) {
        while (strW(wd, size, bold) > maxW) {
          var k = 1;
          while (k < wd.length && strW(wd.slice(0, k + 1), size, bold) <= maxW) k++;
          if (line) { out.push(line); line = ''; }
          out.push(wd.slice(0, k)); wd = wd.slice(k);
        }
        var t = line ? line + ' ' + wd : wd;
        if (strW(t, size, bold) <= maxW) line = t; else { out.push(line); line = wd; }
      });
      out.push(line);
    });
    return out;
  };
  Doc.prototype.finish = function () {
    var chunks = [], len = 0, offs = [], self = this;
    function push(x) { var u = typeof x === 'string' ? strBytes(x) : x; chunks.push(u); len += u.length; }
    function obj(n, body) { offs[n] = len; push(n + ' 0 obj\n' + body + '\nendobj\n'); }
    push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));
    var ni = this.imgs.length, np = this.pages.length, first = 5 + ni, i, kids = [];
    for (i = 0; i < np; i++) kids.push((first + i * 2) + ' 0 R');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + np + ' >>');
    obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    var xo = '';
    for (i = 0; i < ni; i++) xo += '/Im' + i + ' ' + (5 + i) + ' 0 R ';
    this.imgs.forEach(function (im, k) {
      offs[5 + k] = len;
      push((5 + k) + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + im.bytes.length + ' >>\nstream\n');
      push(im.bytes);
      push('\nendstream\nendobj\n');
    });
    this.pages.forEach(function (ops, k) {
      var pid = first + k * 2, cid = pid + 1, stream = ops.join('\n');
      obj(pid, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + n2(W) + ' ' + n2(H) + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ' + xo + '>> >> /Contents ' + cid + ' 0 R >>');
      obj(cid, '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
    });
    var N = first + np * 2 - 1, start = len, x = 'xref\n0 ' + (N + 1) + '\n0000000000 65535 f \n';
    for (i = 1; i <= N; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
    push(x);
    push('trailer\n<< /Size ' + (N + 1) + ' /Root 1 0 R >>\nstartxref\n' + start + '\n%%EOF');
    var out = new Uint8Array(len), pos = 0;
    chunks.forEach(function (c) { out.set(c, pos); pos += c.length; });
    return out;
  };

  function b64bytes(dataUrl) {
    var b = atob(dataUrl.split(',')[1]), u = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return u;
  }
  function dbr(iso) { return iso ? iso.split('-').reverse().join('/') : ''; }

  function build(b, s, Core) {
    var c = Core.calc(b), money = Core.money, qfmt = Core.qfmt, UN = Core.UN;
    var d = new Doc(), y = M, hasLogo = false;

    /* Cabeçalho */
    var textX = M;
    if (s.logo && s.logo.d) {
      try {
        d.imgs.push({ w: s.logo.w, h: s.logo.h, bytes: b64bytes(s.logo.d) });
        var sc = Math.min(120 / s.logo.w, 56 / s.logo.h), lw = s.logo.w * sc, lh = s.logo.h * sc;
        d.image(0, M, y, lw, lh); textX = M + lw + 14; hasLogo = true;
      } catch (e) { d.imgs.pop(); }
    }
    var hy = y + 12;
    d.text(s.empresa || 'Minha Serralheria', textX, hy, { size: 15, bold: true, color: STEEL });
    var info = [];
    if (s.doc) info.push(s.doc);
    var l2 = [s.fone, s.email].filter(Boolean).join('  ·  ');
    if (l2) info.push(l2);
    d.wrap(s.endereco || '', 8.5, false, 270).forEach(function (t) { if (t) info.push(t); });
    info.forEach(function (t, k) { d.text(t, textX, hy + 13 + k * 11, { size: 8.5, color: GRAY }); });
    var rx = W - M;
    d.text('ORÇAMENTO', rx, y + 14, { size: 20, bold: true, color: STEEL, align: 'right' });
    d.text('Nº ' + b.num, rx, y + 30, { size: 10, bold: true, align: 'right' });
    d.text('Data: ' + dbr(b.data), rx, y + 43, { size: 9.5, color: GRAY, align: 'right' });
    y = Math.max(y + 60, hy + 13 + info.length * 11) + 8;
    d.rect(M, y, CW, 3, YELLOW);
    y += 16;

    /* Cliente */
    var objLines = d.wrap(b.obra || '-', 10.5, false, CW - 24);
    var bh = 14 + 26 + 12 + objLines.length * 13 + 8;
    d.rect(M, y, CW, bh, LIGHT);
    d.text('CLIENTE', M + 12, y + 16, { size: 7.5, bold: true, color: GRAY });
    d.text(b.cliente || '-', M + 12, y + 29, { size: 11, bold: true });
    d.text('TELEFONE', M + CW * 0.62, y + 16, { size: 7.5, bold: true, color: GRAY });
    d.text(b.fone || '-', M + CW * 0.62, y + 29, { size: 11 });
    d.text('SERVIÇO', M + 12, y + 47, { size: 7.5, bold: true, color: GRAY });
    objLines.forEach(function (t, k) { d.text(t, M + 12, y + 60 + k * 13, { size: 10.5 }); });
    y += bh + 18;

    /* Tabela */
    var cDesc = M + 28, wDesc = 245, cQtd = M + 335, cUn = M + 343, cUnit = M + 432, cTot = M + CW - 8;
    function head() {
      d.rect(M, y, CW, 20, STEEL);
      d.text('#', M + 8, y + 13.5, { size: 8.5, bold: true, color: WHITE });
      d.text('DESCRIÇÃO', cDesc, y + 13.5, { size: 8.5, bold: true, color: WHITE });
      d.text('QTD', cQtd, y + 13.5, { size: 8.5, bold: true, color: WHITE, align: 'right' });
      d.text('UN', cUn, y + 13.5, { size: 8.5, bold: true, color: WHITE });
      d.text('VALOR UNIT.', cUnit, y + 13.5, { size: 8.5, bold: true, color: WHITE, align: 'right' });
      d.text('TOTAL', cTot, y + 13.5, { size: 8.5, bold: true, color: WHITE, align: 'right' });
      y += 20;
    }
    function ensure(h) { if (y + h > H - 56) { d.addPage(); y = M; return true; } return false; }
    head();
    if (!b.itens.length) {
      d.text('Nenhum item neste orçamento.', cDesc, y + 16, { size: 9.5, color: GRAY }); y += 26;
    }
    b.itens.forEach(function (it, k) {
      var lines = d.wrap(it.desc || '-', 9.5, false, wDesc), rh = lines.length * 12 + 10;
      if (y + rh > H - 56) { d.addPage(); y = M; head(); }
      if (k % 2 === 1) d.rect(M, y, CW, rh, ZEBRA);
      var tot = Core.itTotal(it) * c.fator, unit = it.qtd > 0 ? tot / it.qtd : 0, ty = y + 14;
      d.text(String(k + 1), M + 8, ty, { size: 9.5, color: GRAY });
      lines.forEach(function (t, j) { d.text(t, cDesc, ty + j * 12, { size: 9.5 }); });
      d.text(qfmt(it.qtd), cQtd, ty, { size: 9.5, align: 'right' });
      d.text(UN[it.un] ? UN[it.un].s : '', cUn, ty, { size: 9.5, color: GRAY });
      d.text(money(unit), cUnit, ty, { size: 9.5, align: 'right' });
      d.text(money(tot), cTot, ty, { size: 9.5, bold: true, align: 'right' });
      y += rh;
      d.line(M, y, M + CW, y, 0.5, [215, 221, 226]);
    });
    y += 14;

    /* Totais */
    var tw = 240, tx = M + CW - tw;
    ensure(b.desconto ? 100 : 60);
    if (b.desconto) {
      d.text('Subtotal', tx, y + 10, { size: 10, color: GRAY });
      d.text(money(c.bruto), M + CW, y + 10, { size: 10, align: 'right' });
      d.text('Desconto', tx, y + 25, { size: 10, color: GRAY });
      d.text('- ' + money(b.desconto), M + CW, y + 25, { size: 10, align: 'right' });
      y += 36;
    }
    d.rect(tx, y, tw, 36, STEEL);
    d.rect(tx, y, 5, 36, YELLOW);
    d.text('TOTAL', tx + 18, y + 22.5, { size: 11, bold: true, color: WHITE });
    d.text(money(c.total), tx + tw - 12, y + 24, { size: 17, bold: true, color: WHITE, align: 'right' });
    y += 36 + 26;

    /* Condições */
    var cond = [];
    if (b.validade) cond.push(['Validade da proposta', qfmt(b.validade) + ' dias']);
    if (b.pagamento) cond.push(['Pagamento', b.pagamento]);
    if (b.obs) cond.push(['Observações', b.obs]);
    if (cond.length) {
      ensure(40);
      d.text('CONDIÇÕES', M, y, { size: 9, bold: true, color: STEEL });
      d.line(M, y + 5, M + CW, y + 5, 0.75, STEEL);
      y += 20;
      cond.forEach(function (r) {
        var lines = d.wrap(r[1], 10, false, CW - 130);
        ensure(lines.length * 13 + 8);
        d.text(r[0], M, y, { size: 10, bold: true });
        lines.forEach(function (t, j) { d.text(t, M + 130, y + j * 13, { size: 10 }); });
        y += lines.length * 13 + 8;
      });
    }

    /* Aceite */
    ensure(70);
    y += 34;
    d.line(M, y, M + 230, y, 0.6, GRAY);
    d.line(M + CW - 150, y, M + CW, y, 0.6, GRAY);
    d.text('De acordo (cliente)', M, y + 12, { size: 8.5, color: GRAY });
    d.text('Data', M + CW - 150, y + 12, { size: 8.5, color: GRAY });

    /* Rodapé em todas as páginas */
    var np = d.pages.length;
    d.pages.forEach(function (ops, k) {
      d.p = ops;
      d.line(M, H - 40, M + CW, H - 40, 0.5, [215, 221, 226]);
      d.text((s.empresa || '') + '  ·  Orçamento ' + b.num, M, H - 26, { size: 8, color: GRAY });
      d.text('Página ' + (k + 1) + ' de ' + np, M + CW, H - 26, { size: 8, color: GRAY, align: 'right' });
    });
    return d.finish();
  }

  var OrcaPDF = { build: build, strW: strW };
  if (typeof module !== 'undefined' && module.exports) module.exports = OrcaPDF;
  root.OrcaPDF = OrcaPDF;
})(typeof window !== 'undefined' ? window : globalThis);
