/* Değerlendirme: gözlem metni, model testi ve atom eşleme.
   Dönütler doğru cevabı söylemez; öğrenciyi kanıta, saymaya ve karşılaştırmaya yönlendirir. */
(function (T) {
  'use strict';
  const U = T.U;

  /* ----------------------------------------------------------
     1) GÖZLEM DEĞERLENDİRME
     ---------------------------------------------------------- */
  const KW = {
    GAS: ['kabarcık', 'kabarcik', 'baloncuk', 'gaz', 'köpür', 'fokurda', 'fışırda', 'fışır', 'hava kabarc', 'kaynar gibi', 'kaynadı', 'kaynıyor'],
    FOAM: ['köpük', 'köpür'],
    PRECIP: ['çökelti', 'çöktü', 'çökel', 'çöker', 'çökme', 'tortu', 'dibe', 'dipte', 'bulanık', 'bulanıklaş', 'bulandı', 'topak', 'katı oluş', 'katı madde oluş', 'katı oluş', 'jel', 'pelte', 'süt gibi', 'sütümsü'],
    WARM: ['ısın', 'ısıt', 'sıcaklık art', 'sıcaklığı art', 'sıcaklık yüksel', 'sıcaklığı yüksel', 'sıcaklık çık', 'ısı açığa', 'ısı çık', 'ısı ver', 'sıcak oldu', 'sıcaklaştı', 'derece art', 'derece yüksel', 'termometre yüksel', 'termometre art', 'ekzoterm', 'sıcaklık değiş', 'sıcaklığı değiş'],
    COOL: ['soğu', 'sıcaklık düş', 'sıcaklığı düş', 'sıcaklık azal', 'sıcaklığı azal', 'serinle', 'derece düş', 'derece azal', 'endoterm', 'sıcaklık değiş', 'sıcaklığı değiş'],
    SMOKE: ['duman', 'sis', 'buhar', 'bulut', 'beyaz dum'],
    COLOR: ['sarı', 'beyaz', 'mavi', 'turkuaz', 'yeşil', 'renk', 'krem', 'kahve', 'turuncu', 'süt'],
    SOLID_SHRINK: ['küçül', 'eridi', 'eriy', 'çözün', 'azald', 'kayboldu', 'yok oldu', 'aşın', 'ufal'],
    CLEAR: ['berrak', 'renksiz', 'saydam']
  };
  const NEG_RE = /(m[ıi]yor|mad[ıi]|med[ıi]|mam[ıi]ş|memiş|maz|mez|mıyordu|miyordu)$/;
  const NEG_WORDS = ['yok', 'değil', 'hiç', 'olmadı', 'görmedim', 'görülmedi', 'gözlenmedi', 'gözlemlenmedi'];

  function clauses(text) {
    return U.normTR(text)
      .split(/[.,;!?\n]+|\s(?:ama|fakat|ancak|ve|ile|sonra|daha sonra)\s/)
      .map((s) => s.trim()).filter(Boolean);
  }
  function clauseNegated(cl) {
    const toks = cl.split(/\s+/);
    if (toks.some((t) => NEG_WORDS.includes(t))) return true;
    // olumsuz fiil eki (sonraki kelime veya kendisi)
    return toks.some((t) => NEG_RE.test(t) && t.length > 4 && !/^(az|kaz|yaz|maz)/.test(t));
  }
  /** Gruptaki kavram metinde OLUMLU geçiyor mu? 'pos' | 'neg' | null */
  function mention(text, group) {
    const keys = KW[group];
    let res = null;
    for (const cl of clauses(text)) {
      if (keys.some((k) => cl.includes(k))) {
        if (clauseNegated(cl)) { if (!res) res = 'neg'; } else return 'pos';
      }
    }
    return res;
  }
  function anyPos(text, groupsSpec) {
    // 'SMOKE|WARM' -> herhangi biri
    return groupsSpec.split('|').some((g) => mention(text, g) === 'pos');
  }

  const GUIDE = {
    gas: ['Kabın içine yakından bak (tekerlekle ya da iki parmağınla yakınlaştır). Sıvının içinde hareket eden, yukarı doğru yükselen bir şey var mı?',
      'İpucu: Sıvının içinde yükselip yüzeyde patlayan küçük yuvarlak yapılar neyin işaretidir?'],
    precipitate: ['Karışımın görünüşü nasıl değişti? Sıvı hâlâ berrak mı? Kabın dibinde zamanla ne birikiyor?',
      'İpucu: Karışınca sıvıda beliren ve yavaşça dibe inen renkli yapı katı mı, sıvı mı, gaz mı?'],
    heat: ['Gözle görülen bir değişim olmayabilir. Ölçüm aracına bak: termometre karıştırmadan önce ve sonra kaç dereceyi gösteriyor?',
      'İpucu: Termometredeki değer 22 °C’den nereye çıktı? Bu ne anlama gelir?'],
    smoke: ['Kabın ağzına ve termometreye dikkat et. Kabın üstünde neler oluşuyor? Sıcaklık değişti mi?',
      'İpucu: Kabın ağzından yükselen beyaz yapıya ne ad verirsin?']
  };
  function wrongFeedback(wrongGroup, type) {
    if (wrongGroup === 'PRECIP') {
      if (type === 'gas') return 'Kabın içinde görülen değişimi tekrar incele. Katı birikimi mi var, yoksa sıvı içinde kabarcıklar mı oluşuyor?';
      if (type === 'heat') return 'Sıvıyı tekrar incele: bulanıklaşma ya da dibe çöken bir katı var mı? Gözünle göremediğin bir değişimi termometre gösteriyor olabilir.';
      return 'Kabın dibine tekrar bak. Katı bir madde birikiyor mu, yoksa değişim başka bir yerde mi oluyor?';
    }
    if (wrongGroup === 'GAS') {
      if (type === 'precipitate') return 'Sıvının içinde yükselen kabarcıklar var mı, tekrar bak. Karışınca sıvıda beliren yapı yukarı mı çıkıyor, yoksa yavaşça aşağı mı iniyor?';
      if (type === 'heat') return 'Sıvının içine dikkatle bak; gerçekten kabarcık çıkıyor mu? Değişimi gözünle değil, bir ölçüm aracıyla görebilirsin.';
      return 'Kabarcıklar sıvının içinden mi yükseliyor, yoksa gördüğün beyaz yapı kabın üstünde mi oluşuyor? Tekrar incele.';
    }
    if (wrongGroup === 'SMOKE') {
      return 'Kabın üstünde gerçekten bir duman ya da sis var mı? Değişimi sıvının içinde ara.';
    }
    return 'Gözlemini tekrar incele.';
  }

  /**
   * @returns {kind:'ok'|'warn'|'bad', title, text}
   */
  function evaluateObservation(text, reaction, tries) {
    const words = U.wordCount(text);
    if (words < 4) {
      return { kind: 'warn', title: 'Biraz daha ayrıntı', text: 'Gözlemini tam bir cümleyle yaz: Maddeler karışınca kapta ne gördün? Termometre ne gösterdi?' };
    }
    const ev = reaction.evidence;
    const type = reaction.obs.type;
    const norm = U.normTR(text);

    // Tepkimeye özel yanılgılar
    if (ev.custom) {
      for (const c of ev.custom) {
        if (c.keys.some((k) => norm.includes(k)) && !anyPos(text, ev.need[0])) return { kind: 'bad', title: 'Tekrar incele', text: c.fb };
      }
    }
    // Isınma gereken yerde soğuma yazıldıysa
    if (ev.need[0].includes('WARM') && mention(text, 'COOL') === 'pos' && mention(text, 'WARM') !== 'pos' && !norm.includes('değiş')) {
      return { kind: 'bad', title: 'Termometreye tekrar bak', text: 'Sıcaklık arttı mı, azaldı mı? Termometredeki başlangıç ve son değeri karşılaştır.' };
    }
    // Yanlış kanıt türü (olumlu söylenmişse)
    for (const w of ev.wrong) {
      if (mention(text, w) === 'pos' && !(w === 'GAS' && type === 'gas')) {
        // köpük kelimesi h2o2'de doğru; çökeltide 'bulanık' kelimesi gaz değil
        return { kind: 'bad', title: 'Tekrar incele', text: wrongFeedback(w, type) };
      }
    }
    const needOk = ev.need.every((g) => anyPos(text, g));
    if (needOk) {
      const sup = (ev.support || []).filter((g) => mention(text, g) === 'pos' && !ev.need.some((n) => n.split('|').includes(g)));
      let extra = '';
      if (sup.length) extra = ' Destekleyici bir kanıtı da fark ettin; çok iyi.';
      else if (type !== 'heat' && reaction.obs.temp && Math.abs(reaction.obs.temp - 22) > 1) extra = ' Termometreye de baktın mı? Sıcaklık değişimi destekleyici bir kanıt olabilir.';
      return { kind: 'ok', title: 'Doğru gözlem', text: reaction.okText + extra + '<br><br>Şimdi bu değişimi tanecik düzeyinde modelleyelim.' };
    }
    // Kanıt olumsuz söylenmişse
    const negSaid = ev.need.some((g) => g.split('|').some((x) => mention(text, x) === 'neg'));
    const g = GUIDE[type] || GUIDE.gas;
    if (negSaid) {
      return { kind: 'bad', title: 'Tekrar incele', text: 'Gözleminde bir şeyin olmadığını yazdın. Deneyi yenileyip yeniden izle. ' + g[0] };
    }
    return { kind: 'warn', title: 'Kanıt eksik', text: (tries >= 2 ? g[1] : g[0]) };
  }

  /* ----------------------------------------------------------
     2) MODEL TESTİ
     ---------------------------------------------------------- */
  const S = () => T.SPECIES;
  const elName = (el) => T.ELEMENTS[el].name.toLocaleLowerCase('tr-TR');

  function clean(ms) { const o = {}; for (const k in ms) if (ms[k] > 0) o[k] = ms[k]; return o; }
  function total(ms) { let n = 0; for (const k in ms) n += ms[k]; return n; }

  function scaleOf(student, ref) {
    // student = k * ref ?
    const keys = Object.keys(ref);
    if (!keys.length) return 0;
    const k = (student[keys[0]] || 0) / ref[keys[0]];
    if (!Number.isInteger(k) || k < 1) return 0;
    const all = new Set([...Object.keys(student), ...keys]);
    for (const id of all) if ((student[id] || 0) !== (ref[id] || 0) * k) return 0;
    return k;
  }

  /**
   * model: {before:{id:n}, after:{id:n}}, ref: {before, after}
   */
  function checkModel(model, ref, opts) {
    opts = opts || {};
    const b = clean(model.before), a = clean(model.after);
    const cb = T.countAtoms(b), ca = T.countAtoms(a);
    const els = T.EL_ORDER.filter((e) => cb[e] || ca[e]);
    const res = {
      pass: false, counts: { before: cb, after: ca, els },
      criteria: [
        { key: 'types', label: 'Atom türleri korunuyor.', pass: false },
        { key: 'counts', label: 'Atom sayıları korunuyor.', pass: false },
        { key: 'rep', label: 'Sulu iyonlar ayrı, katı çökeltiler kristal olarak gösteriliyor.', pass: false },
        { key: 'species', label: 'Kimyasal türler ve tanecik sayıları tepkimeye uygun.', pass: false }
      ],
      fb: null, focusEl: null
    };
    const C = (k) => res.criteria.find((c) => c.key === k);

    if (!total(b) || !total(a)) {
      res.fb = { kind: 'warn', title: 'Model eksik', text: 'Modelin çalışabilmesi için hem “Tepkime öncesi” hem de “Tepkime sonrası” bölümlerinde tanecik olmalı.' };
      return res;
    }

    // 1) Atom türleri
    const missing = els.filter((e) => cb[e] && !ca[e]);
    const extra = els.filter((e) => ca[e] && !cb[e]);
    C('types').pass = !missing.length && !extra.length;
    // 2) Atom sayıları
    const mis = els.filter((e) => (cb[e] || 0) !== (ca[e] || 0));
    C('counts').pass = !mis.length;
    res.counts.mismatch = mis;
    // 3) Temsil
    const all = Object.keys(b).concat(Object.keys(a));
    const solubleUsed = all.find((id) => S()[id].soluble);
    const hclUsed = all.find((id) => id === 'HCl');
    const refPrecip = Object.keys(ref.after).find((id) => S()[id].precip);
    const precipMissing = refPrecip && !a[refPrecip] && !Object.keys(a).some((id) => S()[id].precip);
    const precipInBefore = Object.keys(b).find((id) => S()[id].precip && !ref.before[id]);
    C('rep').pass = !solubleUsed && !hclUsed && !precipMissing && !precipInBefore;
    // 4) Türler ve oran
    const kB = scaleOf(b, ref.before), kA = scaleOf(a, ref.after);
    C('species').pass = kB > 0 && kB === kA;

    res.pass = res.criteria.every((c) => c.pass);

    // Dönüt (öncelik sırası)
    if (!C('types').pass) {
      if (extra.length) {
        res.focusEl = extra[0];
        res.fb = { kind: 'bad', title: 'Model yeniden incelenmeli', text: `Tepkime sonrasında, tepkime öncesinde hiç olmayan <b>${elName(extra[0])}</b> atomları var. Bir tepkimede yeni bir atom türü ortaya çıkabilir mi? Tepkime sonrası bölümündeki tanecikleri gözden geçir.` };
      } else {
        res.focusEl = missing[0];
        res.fb = { kind: 'bad', title: 'Model yeniden incelenmeli', text: `Tepkime öncesindeki <b>${elName(missing[0])}</b> atomları tepkime sonrasında hiç yok. Atomlar yok olabilir mi? Bu atomlar tepkimeden sonra hangi tanecikte bulunabilir?` };
      }
    } else if (!C('counts').pass) {
      const e = mis[0];
      res.focusEl = e;
      res.fb = { kind: 'bad', title: 'Model yeniden incelenmeli', text: `Modelindeki <b>${elName(e)}</b> atomlarını yeniden say. Tepkime öncesi ve tepkime sonrası sayıların aynı olup olmadığını karşılaştır.` };
    } else if (!C('rep').pass) {
      if (hclUsed) res.fb = { kind: 'bad', title: 'Tanecik dili', text: 'Hidroklorik asit bir sulu çözeltidir. Sulu ortamda hidrojen klorür tanecikleri molekül hâlinde mi kalır, yoksa iyonlarına mı ayrılır? Modelini buna göre düzenle.' };
      else if (solubleUsed) res.fb = { kind: 'bad', title: 'Tanecik dili', text: `Modelinde <b>${T.speciesLabel(solubleUsed)}</b> kristali var. Bu madde suda çözünür; sulu ortamda kristal hâlinde değil, birbirinden ayrı iyonlar hâlinde bulunur.` };
      else if (precipMissing) res.fb = { kind: 'bad', title: 'Gözlemini hatırla', text: 'Deneyde kabın dibine çöken bir katı (çökelti) gözlemiştin. Katılar düzenli bir kristal yapı olarak gösterilir. Modelinde bu katı nerede?' };
      else res.fb = { kind: 'bad', title: 'Tanecik dili', text: `Tepkime öncesinde <b>${T.speciesLabel(precipInBefore)}</b> katısı yoktu. Başlangıçta kaplarda hangi maddeler vardı?` };
    } else if (!C('species').pass) {
      const sb = new Set(Object.keys(b)), rb = new Set(Object.keys(ref.before));
      const sa = new Set(Object.keys(a)), ra = new Set(Object.keys(ref.after));
      const exB = [...sb].find((x) => !rb.has(x)), miB = [...rb].find((x) => !sb.has(x));
      const exA = [...sa].find((x) => !ra.has(x)), miA = [...ra].find((x) => !sa.has(x));
      if (exB) res.fb = { kind: 'bad', title: 'Tepkime öncesini kontrol et', text: `Tepkime öncesi bölümünde başlangıçtaki kaplarda bulunmayan bir tanecik var: <b>${T.speciesLabel(exB)}</b>. Kaplara hangi maddeleri koymuştuk ve bunlar suda hangi taneciklere ayrılır?` };
      else if (miB) res.fb = { kind: 'bad', title: 'Tepkime öncesini kontrol et', text: 'Tepkime öncesi bölümünde bir tanecik türü eksik. İki kaptaki maddelerin suda hangi taneciklere ayrıldığını düşün.' };
      else if (exA) res.fb = { kind: 'bad', title: 'Tepkime sonrasını kontrol et', text: `Tepkime sonrasındaki <b>${T.speciesLabel(exA)}</b> taneciği bu tepkimede oluşmaz. Gözlem kanıtını ve tepkime öncesindeki tanecikleri tekrar düşün.` };
      else if (miA) res.fb = { kind: 'bad', title: 'Tepkime sonrasını kontrol et', text: 'Atomlar dengede ama tepkime sonrasında bir tanecik türü eksik. Gözlemde gördüğün değişimi hangi tanecik açıklıyor?' };
      else res.fb = { kind: 'bad', title: 'Sayılar oranlı değil', text: 'Tanecik türlerin doğru! Ancak tanecik sayıları birbiriyle uyumlu değil. Her türden kaç tanecik tepkimeye girdiğini ve kaç tanecik oluştuğunu düşün.' };
    } else {
      res.fb = { kind: 'ok', title: 'Model başarıyla doğrulandı', text: 'Modelin, atom türlerinin ve atom sayılarının korunması açısından bilimsel olarak tutarlı. Kimyasal türler de tepkimeye uygun.' };
    }
    return res;
  }

  /* ----------------------------------------------------------
     3) ATOM EŞLEME (önce → sonra)
     inst: [{uid, sid, atoms:[{el}]}]
     ---------------------------------------------------------- */
  function mapAtoms(beforeInst, afterInst) {
    const pairs = [];        // {b:[instIdx, atomIdx], a:[instIdx, atomIdx]}
    const usedB = beforeInst.map((x) => x.atoms.map(() => false));
    const usedA = afterInst.map((x) => x.atoms.map(() => false));

    // 1) Aynı tür (kristal olmayan) bütün olarak eşleşir — değişmeden kalan tanecikler
    const takenB = new Set();
    afterInst.forEach((ai, aIdx) => {
      if (T.SPECIES[ai.sid].kind === 'crystal') return;
      const bIdx = beforeInst.findIndex((bi, k) => !takenB.has(k) && bi.sid === ai.sid);
      if (bIdx < 0) return;
      takenB.add(bIdx);
      ai.atoms.forEach((_, j) => { pairs.push({ b: [bIdx, j], a: [aIdx, j] }); usedB[bIdx][j] = true; usedA[aIdx][j] = true; });
      ai.unchanged = true; beforeInst[bIdx].unchanged = true;
    });

    // 2) Kalan atomlar: öğe bazında, aynı kaynaktan gelmeyi tercih ederek
    const order = afterInst.map((x, i) => i).sort((p, q) => afterInst[q].atoms.length - afterInst[p].atoms.length);
    order.forEach((aIdx) => {
      const ai = afterInst[aIdx];
      const sources = {}; // bIdx -> kaç atom alındı
      // önce ağır/merkez atomlar
      const idxs = ai.atoms.map((_, j) => j).sort((p, q) => T.ELEMENTS[ai.atoms[q].el].r - T.ELEMENTS[ai.atoms[p].el].r);
      idxs.forEach((j) => {
        if (usedA[aIdx][j]) return;
        const el = ai.atoms[j].el;
        let best = null, bestScore = -1;
        beforeInst.forEach((bi, bIdx) => {
          bi.atoms.forEach((ba, k) => {
            if (usedB[bIdx][k] || ba.el !== el) return;
            const score = (sources[bIdx] || 0) * 10 + bi.atoms.length * 0.1 - k * 0.001;
            if (score > bestScore) { bestScore = score; best = [bIdx, k]; }
          });
        });
        if (best) {
          usedB[best[0]][best[1]] = true; usedA[aIdx][j] = true;
          sources[best[0]] = (sources[best[0]] || 0) + 1;
          pairs.push({ b: best, a: [aIdx, j] });
        }
      });
    });
    const lostB = [], newA = [];
    usedB.forEach((arr, i) => arr.forEach((u, j) => { if (!u) lostB.push([i, j]); }));
    usedA.forEach((arr, i) => arr.forEach((u, j) => { if (!u) newA.push([i, j]); }));
    return { pairs, lostB, newA };
  }

  /* ----------------------------------------------------------
     4) AÇIK UÇLU GEREKÇE (Aşama 7)
     ---------------------------------------------------------- */
  const IDEAS = [
    { key: 'tür', keys: ['atom tür', 'türü', 'türler', 'yeni atom', 'farklı atom', 'aynı atom', 'element'], label: 'atom türlerinin korunması' },
    { key: 'sayı', keys: ['sayı', 'sayısı', 'sayıları', 'eşit', 'aynı kal', 'kadar', 'adet'], label: 'atom sayılarının korunması' },
    { key: 'korun', keys: ['korun', 'yok olmaz', 'yoktan var', 'kaybolmaz', 'yok edil', 'yeniden düzen', 'yeniden diz', 'yer değiştir', 'kütle'], label: 'atomların yok olmayıp yeniden düzenlenmesi' },
    { key: 'iyon', keys: ['iyon', 'sulu', 'çözün', 'kristal', 'çökelti', 'katı'], label: 'sulu iyonlar / katı kristaller' }
  ];
  function evaluateJustification(text) {
    const n = U.normTR(text);
    const hits = IDEAS.filter((i) => i.keys.some((k) => n.includes(k)));
    const words = U.wordCount(text);
    return { words, hits, missing: IDEAS.filter((i) => !hits.includes(i)) };
  }

  T.Eval = { evaluateObservation, checkModel, mapAtoms, evaluateJustification, mention, scaleOf };
})(window.TUY);
