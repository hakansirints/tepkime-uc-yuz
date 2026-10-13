/* Local, bounded Turkish observation rules. Unknown/ambiguous wording asks for clarification. */
(function (global) {
  const definitions = {
    nahco3_hcl: { core: 'gas', gas: true, cool: true },
    caco3_hcl: { core: 'gas', gas: true, dissolve: true, warm: true },
    na2co3_hcl: { core: 'gas', gas: true, warm: true },
    h2o2_ki: { core: 'gas', gas: true, foam: true, warm: true },
    hcl_naoh: { core: 'warm', warm: true },
    nh3_hcl: { core: 'mist', mist: true, warm: true },
    pbno32_ki: { core: 'precipitate', precipitate: true, colors: ['sari'] },
    agno3_hcl: { core: 'precipitate', precipitate: true, colors: ['beyaz'] },
    cuno32_naoh: { core: 'precipitate', precipitate: true, warm: true, colors: ['mavi'] },
    cacl2_na2co3: { core: 'precipitate', precipitate: true, colors: ['beyaz'] },
    agno3_ki: { core: 'precipitate', precipitate: true, colors: ['sari', 'krem'] },
    cuno32_na2co3: { core: 'precipitate', precipitate: true, warm: true, colors: ['turkuaz', 'yesil', 'mavi yesil'] }
  };
  const guides = {
    gas: 'Karışımın içinde ve yüzeyinde hareket eden tanecik görünümünü yeniden izle. Ne gördüğünü açıkça yaz.',
    precipitate: 'Karışımın berraklığına ve kabın dibine yeniden bak. Başlangıca göre ne değişti?',
    mist: 'Kabın ağzının üstündeki görünümü yeniden izle. Gördüğün değişimi tarif et.',
    warm: 'Karıştırmadan önceki ve sonraki termometre değerlerini karşılaştır. Değişimin yönünü yaz.',
    cool: 'Termometrenin başlangıç ve son değerlerini yeniden karşılaştır.',
    dissolve: 'Başlangıçta kapta bulunan katının miktarını karıştırma sonrasıyla karşılaştır.',
    foam: 'Sıvının yüzeyini yeniden izle. Gördüğün durumu açıkça tarif et.',
    color: 'Başlangıç rengini ve karışımın son rengini ayrı ayrı tarif et.'
  };
  function normalize(text) {
    return String(text || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i')
      .replace(/kabarc[iı]k/g, 'kabarcik').replace(/kabarciklar?/g, 'kabarcik').replace(/copelti|cokeliti|cokelti/g, 'cokelti')
      .replace(/olustu|olusdu/g, 'olustu').replace(/s[ıi]cakl[ıi]k/g, 'sicaklik').replace(/\s+/g, ' ').trim();
  }
  const topics = /\b(?:gaz\w*|kabarcik\w*|baloncuk\w*|kopur\w*|kopuk\w*|cokel\w*|tortu\w*|kati\w*|bulanik\w*|bulan\w*|cozun\w*|azal\w*|sis\w*|duman\w*|sicaklik\w*|isin\w*|sog\w*|termo\w*|beyaz|sari|krem|mavi|yesil|turkuaz|kirmizi|mor|siyah)\b/g;
  const negative = /\b(?:yok\w*|olma\w*|olusma\w*|cikma\w*|gorulme\w*|gozlenme\w*|gozlemleme\w*|bulunma\w*|degil\w*|artma\w*|azalma\w*|degisme\w*|(?:cikmi|olusmu|olmu|gorulmu|gozlenmi|gorunmu|bulunmu|artmi|azalmi|degismi|cozunmu|kopurmu|isinmi|sogumu|cokmu)yor\w*|cozunme(?:di|mis|z)\w*|kopurme(?:di|mis|z)\w*|isinma(?:di|mis|z)\w*|soguma(?:di|mis|z)\w*|cokme(?:di|mis|z)\w*)\b/;
  const uncertain = /\b(?:belki|galiba|sanirim|olabilir\w*|olmus olabilir|cikmis olabilir|emin degil\w*|mi|mu|m[uü])\b|\?/;
  const assertion = /\b(?:olust\w*|olus\w*|cikt\w*|cikis\w*|cikiyor\w*|gozle\w*|gor\w*|var\w*|meydana\w*|cokt\w*|cokuyor\w*|buland\w*|bulaniklast\w*|cozund\w*|azald\w*|artt\w*|yukseld\w*|dustu\w*|isin\w*|sogud\w*|degist\w*|kopurd\w*|kopuruyor\w*|kaldi\w*|gercekles\w*)\b/;
  function eventFor(word, clause, at) {
    if (/^(gaz|kabarcik|baloncuk)/.test(word)) return 'gas';
    if (/^(kopur|kopuk)/.test(word)) return 'foam';
    if (/^(sis|duman)/.test(word)) return 'mist';
    if (/^(cozun|azal)/.test(word)) return 'dissolve';
    if (/^kati/.test(word) && /cozun|azal/.test(clause.slice(at))) return 'dissolve';
    if (/^(cokel|tortu|kati|bulanik|bulan)/.test(word)) return 'precipitate';
    if (/^(sicaklik|termo|isin|sog)/.test(word)) {
      const tail = clause.slice(at);
      if (/sog|dustu|azald/.test(tail)) return 'cool';
      if (/isin|artt|yukseld/.test(tail)) return 'warm';
      return 'temperature';
    }
    return 'color';
  }
  function claimsFor(text) {
    const claims = [];
    for (const clause of normalize(text).split(/[.,;!\n]+|\b(?:ama|fakat|ancak)\b/).filter(Boolean)) {
      const hits = [...clause.matchAll(topics)];
      hits.forEach((hit, i) => {
        const at = hit.index, end = hits[i + 1]?.index ?? clause.length;
        let scope = clause.slice(at, end);
        // Coordinated nouns can share a final predicate: "gaz ve çökelti oluşmadı".
        if (!assertion.test(scope) && !negative.test(scope)) scope = clause.slice(at);
        const prefix = clause.slice(0, at);
        const before = /basta|baslangicta|baslangictaki|onceden|karistirmadan once/.test(prefix) && !/sonra|karistirinca|karistird|karisimdan/.test(prefix);
        const event = eventFor(hit[0], clause, at);
        let value = uncertain.test(scope) || uncertain.test(prefix) ? null : negative.test(scope) ? false : assertion.test(scope) ? true : null;
        // "Sıcaklık değişmedi" is a definite assertion about both directions.
        if (event === 'temperature' && /degism|ayni kal/.test(scope)) value = false;
        claims.push({ event, value, before, word: hit[0], scope });
      });
    }
    return claims;
  }
  function evaluate(reactionId, text) {
    const profile = definitions[reactionId];
    if (!profile) return { status: 'incomplete', message: 'Bu deneyin gözlem ölçütleri bulunamadı.' };
    const claims = claimsFor(text).filter(c => !c.before);
    const byEvent = {};
    claims.forEach(c => (byEvent[c.event] ||= []).push(c));
    // Foam is visible evidence for a gas producing reaction, without asserting the gas identity.
    if (profile.gas && byEvent.foam?.some(c => c.value === true)) (byEvent.gas ||= []).push({ value: true });
    for (const [event, entries] of Object.entries(byEvent)) {
      const values = new Set(entries.map(c => c.value));
      if (values.has(null) || values.has(true) && values.has(false)) return { status: 'incomplete', message: 'Gözleminde belirsiz veya çelişkili bir ifade var. Karıştırma sonrasında ne gördüğünü netleştir.', claims };
      if (event === 'color') {
        if (!profile.colors && entries.some(c => c.value === true && !(c.word === 'beyaz' && /gaz|kabarcik|baloncuk|kopur|kopuk|sis|duman/.test(c.scope)))) return { status: 'incorrect', message: guides.color, claims };
        if (profile.colors && entries.some(c => c.value === true && !profile.colors.some(color => c.scope.includes(color)))) return { status: 'incorrect', message: guides.color, claims };
        continue;
      }
      if (event === 'foam' && profile.gas && !profile.foam) continue;
      if (event === 'temperature') {
        if (values.has(false) && (profile.warm || profile.cool)) return { status: 'incorrect', message: guides.warm, claims };
        if (values.has(true) && !profile.warm && !profile.cool) return { status: 'incorrect', message: guides.warm, claims };
        continue;
      }
      if (values.has(true) !== Boolean(profile[event])) return { status: 'incorrect', message: guides[event] || guides[profile.core], claims };
    }
    if (byEvent[profile.core]?.some(c => c.value === true)) return { status: 'correct', message: 'Gözlemin deneydeki temel değişimle tutarlı. Şimdi bu değişimi tanecik düzeyinde modelleyebilirsin.', claims };
    return { status: 'incomplete', message: guides[profile.core], claims };
  }
  global.ObservationEvaluator = { evaluate, normalize, claimsFor, profiles: definitions };
})(typeof window === 'undefined' ? globalThis : window);
