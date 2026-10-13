/* Whole-species inquiry models. Atom identities are retained for the trace activity. */
(function () {
  const { clone, count, key, definition, chargeDetails } = FormulaChemistry;
  const phaseOf = value => /katı|^k$/.test(value) ? 'k' : value === 'g' ? 'g' : value === 's' ? 's' : 'suda';
  const charge = items => items.reduce((sum, p) => sum + chargeDetails(p.formula).charge, 0);
  const signature = items => items.map(p => p.formula + ':' + key(p.atoms)).sort().join(';');
  const sourceBreak = { nahco3_hcl: 2, caco3_hcl: 1, na2co3_hcl: 2, h2o2_ki: 1, hcl_naoh: 2, nh3_hcl: 1, pbno32_ki: 2, agno3_hcl: 2, cuno32_naoh: 2, cacl2_na2co3: 2, agno3_ki: 2, cuno32_na2co3: 2 };
  function createPlan(reaction) {
    let before = reaction.microscopic.reactants.map((entry, j) => ({ ...definition(entry), source: j < sourceBreak[reaction.id] ? 0 : 1 }));
    let after = reaction.microscopic.products.map(definition);
    const sourceNames = [reaction.fixedVessel.name, reaction.addedVessel.name];
    // The observed white aerosol is a gas-phase reaction above the solutions,
    // not dissolved NH4+ / Cl- being relabelled as visible smoke.
    if (reaction.id === 'nh3_hcl') {
      before = [{ ...definition({ symbol: 'NH₃' }), source: 0, phase: 'g' }, { formula: 'HCl', elements: { H: 1, Cl: 1 }, n: 1, source: 1, phase: 'g' }];
      after = [{ formula: 'NH₄Cl', elements: { N: 1, H: 4, Cl: 1 }, n: 1, phase: 'k' }];
      sourceNames[0] = 'Amonyak çözeltisinden çıkan gaz'; sourceNames[1] = 'Hidroklorik asit çözeltisinden çıkan gaz';
    }
    if (reaction.id === 'h2o2_ki') {
      before = [before[0], { ...definition({ symbol: 'K⁺' }), source: 1 }, { ...definition({ symbol: 'I⁻' }), source: 1, catalyst: true }];
      after.push(definition({ symbol: 'K⁺' }), { ...definition({ symbol: 'I⁻' }), catalyst: true });
    }
    before.forEach(d => {
      d.phase = phaseOf(d.phase);
    });
    after.forEach(d => d.phase = phaseOf(d.phase));
    const atoms = [];
    const initial = before.flatMap((d, j) => Array.from({ length: d.n }, (_, n) => {
      const own = Object.entries(d.elements).flatMap(([e, total]) => Array.from({ length: total }, (_, k) => ({ e, id: `${reaction.id}:inquiry:${j}:${n}:${e}:${k}` })));
      atoms.push(...own);
      return { id: `initial-${j}-${n}`, formula: d.formula, atoms: own, phase: d.phase, source: d.source, catalyst: !!d.catalyst };
    }));
    const inventory = count(atoms);
    const activeInitial = initial.filter(p => p.catalyst || !after.some(d => d.formula === p.formula));
    const spectators = initial.filter(p => !activeInitial.includes(p));
    const products = after.filter(d => d.catalyst || !before.some(b => b.formula === d.formula));
    function allocate(def, available) {
      const chosen = [];
      for (const [e, n] of Object.entries(def.elements)) {
        const matches = available.filter(a => a.e === e && !chosen.includes(a));
        if (matches.length < n) return null;
        chosen.push(...matches.slice(0, n));
      }
      return clone(chosen);
    }
    function transform(selected) {
      let unused = clone(selected.flatMap(p => p.atoms));
      const result = [];
      products.forEach((d, j) => {
        for (let n = 0; n < d.n; n++) {
          // A regenerated catalyst retains its original species and atom identities.
          const catalyst = d.catalyst && selected.find(p => p.catalyst && p.formula === d.formula);
          const own = catalyst ? clone(catalyst.atoms) : allocate(d, unused);
          if (!own) throw new Error(reaction.id + ': ürün atomları uyuşmuyor.');
          const ids = new Set(own.map(a => a.id)); unused = unused.filter(a => !ids.has(a.id));
          result.push({ id: `product-${j}-${n}`, formula: d.formula, atoms: own, phase: d.phase, catalyst: !!d.catalyst });
        }
      });
      if (unused.length) throw new Error(reaction.id + ': dönüşümde kullanılmayan atomlar var.');
      return result;
    }
    // Allocate catalyst first if another product could share one of its elements.
    products.sort((a, b) => Number(!!b.catalyst) - Number(!!a.catalyst));
    const finalItems = [...clone(spectators), ...transform(activeInitial)];
    const kind = reaction.id === 'nh3_hcl' ? 'smoke' : after.some(d => d.phase === 'k') ? 'solid' : after.some(d => d.phase === 'g') ? 'gas' : 'water';
    const phaseLabels = { suda: 'suda', s: 'sıvı', g: 'gaz', k: 'katı' };
    const activeLabel = activeInitial.map(p => p.formula).filter((f, i, a) => a.indexOf(f) === i).join(' ve ');
    const solid = after.find(d => d.phase === 'k');
    const resultFormula = ['solid', 'smoke'].includes(kind) ? solid.formula : kind === 'gas' ? after.find(d => d.phase === 'g').formula : 'H₂O';
    const options = ['solid', 'smoke'].includes(kind) ? [
      { id: 'solid', formulas: products.filter(d => !d.catalyst).map(d => d.formula), label: kind === 'smoke' ? 'Havada asılı katı tanecikler oluşur' : 'Yeni bir katı yapı oluşur', correct: true },
      { id: 'dissolved', formulas: ['NaCl'], label: 'Çözünmüş bir tuz katı olarak ayrılır', correct: false },
      { id: 'gas', formulas: ['CO₂'], label: 'Gaz molekülleri oluşur', correct: false }
    ] : kind === 'gas' ? [
      { id: 'gas', formulas: products.filter(d => !d.catalyst).map(d => d.formula), label: 'Yeni moleküller; biri gaz olarak ayrılır', correct: true },
      { id: 'solid', formulas: ['NaCl'], label: 'Çözeltideki tuz katı oluşturur', correct: false },
      { id: 'unchanged', formulas: [], label: 'Bütün türler değişmeden kalır', correct: false }
    ] : [
      { id: kind, formulas: [resultFormula], label: 'Yeni su molekülleri oluşur', correct: true },
      { id: 'gas', formulas: ['O₂'], label: 'Gaz molekülleri oluşur', correct: false },
      { id: 'solid', formulas: ['NaCl'], label: 'Çözeltideki tuz katı oluşturur', correct: false }
    ];
    // Deliberately do not always put the correct proposal first.
    if (kind === 'gas' || kind === 'water') options.push(options.shift());
    const properties = kind === 'smoke' ? 'Çözeltilerin üstündeki amonyak ve hidrojen klorür gazları, havada asılı amonyum klorür katı tanecikleri oluşturabilir. Bu bölüm sıvının tamamını değil, beher ağzındaki buharları modeller.' : kind === 'solid'
      ? `${solid.formula} suda az çözünür. Bu görevde başlangıç çözeltilerindeki tuzlar ve çözeltide kalan iyonların tuzları çözünmüş hâldedir.`
      : reaction.id === 'h2o2_ki' ? 'İyodür iyonu ayrışmayı hızlandırır ve sonunda geri kazanılır. Hidrojen peroksit su ve oksijen oluşturabilir.'
      : kind === 'gas' ? 'Asit ile karbonat veya hidrojen karbonatın değişimi yeni su ve karbondioksit oluşturabilir.'
      : 'Asit türü ve hidroksit iyonu su oluşumuna katılabilir; diğer iyonlar çözeltide kalabilir.';
    const evidence = kind === 'smoke' ? 'Beyaz sis / duman' : kind === 'solid' ? 'Katı oluşumu' : kind === 'gas' ? 'Gaz kabarcıkları' : 'Sıcaklık / asit-baz değişimi';
    const explanation = kind === 'smoke' ? 'Havada asılı katı tanecikler oluşması' : kind === 'solid' ? 'Katı bir yapı oluşması' : kind === 'gas' ? 'Yeni gazın sıvıdan ayrılması' : 'Yeni su moleküllerinin oluşması';
    function inventoryError(items) {
      const own = items.flatMap(p => p.atoms), ids = new Set(own.map(a => a.id));
      return own.length !== atoms.length || ids.size !== atoms.length || atoms.some(a => !own.some(b => b.id === a.id && b.e === a.e));
    }
    function validate(frame, index) {
      const items = frame.items;
      if (!items.length) return ['empty', 'Havuzdan bir tür seç; sonra ait olduğu kaynak bölgeye yerleştir.'];
      if (inventoryError(items)) return ['inventory', 'Bazı türler henüz modelinde yok. Havuzdaki veya geri alınan kartları kullanarak yerleştirmeyi tamamla.'];
      if (signature(items) !== signature(index === 2 ? finalItems : initial)) return ['species', 'Modeldeki kimyasal türleri ve sayılarını incele. Çok atomlu iyonlar, bu görevde bütün türler olarak kullanılmalı.'];
      if (charge(items) !== charge(initial)) return ['charge', 'Toplam iyon yükünü başlangıçla karşılaştır. Yük dengesi korunmalı.'];
      if (index === 0 && items.some(p => p.source !== initial.find(x => x.formula === p.formula)?.source)) return ['source', 'Kaynak bölgelerden birindeki tür o maddeye ait değil. Madde adını ve tanecik havuzundaki türleri karşılaştır.'];
      if (index === 0 && items.some(p => p.phase !== initial.find(x => x.formula === p.formula)?.phase)) return ['phase', 'Başlangıç katısını ve çözünmüş türleri farklı hâllerde göster.'];
      if (index === 1 && (!frame.interaction || signature(frame.interaction.reactants) !== signature(activeInitial) || signature(frame.interaction.products) !== signature(transform(activeInitial)))) return ['interaction', 'Gözlemini açıklayan türleri seç; etkileşim ve oluşum önerini dene.'];
      if (index === 1 && frame.interaction.reactants.some(r => {
        const actual = items.find(p => p.id === r.id);
        return !actual || r.formula !== actual.formula || r.atoms.map(a => a.id + ':' + a.e).sort().join('|') !== actual.atoms.map(a => a.id + ':' + a.e).sort().join('|');
      })) return ['inventory', 'Etkileşim önerisinde modelindeki aynı türleri ve aynı atom kimliklerini kullan.'];
      if (index === 1 && inventoryError([...items.filter(p => !frame.interaction.reactants.some(r => r.id === p.id)), ...frame.interaction.products])) return ['inventory', 'Etkileşimde aynı atomları yeniden kullan; bir tür kaybolmuş veya kopyalanmış.'];
      if (index === 2) {
        for (const item of items) {
          const wanted = finalItems.find(d => d.formula === item.formula).phase;
          if (item.phase !== wanted) return [wanted === 'g' ? 'gas' : 'phase', wanted === 'g' ? 'Kabarcıkların yükseldiğini gözledin. Gaz olarak ayrılan tür hangi bölgede olmalı?' : wanted === 'k' ? 'Katı oluşumu gözlemini düşün. İlgili türü katı yapı bölgesinde mi gösterdin?' : 'Çözeltide kalan iyonları ayrı ve sıvı bölgesinde göster.'];
        }
      }
      return ['ok', index === 0 ? 'Türler, kaynaklar ve sayılar uygun. Kimyasal türleri bütün kartlarla gösterdin.' : index === 1 ? 'Etkileşim ve oluşum önerin gözlemini açıklıyor. ' + (spectators.length ? 'Değişmeden kalan türleri de korudun.' : 'İncelenen iki gaz da katı oluşumuna katılıyor.') : 'Türler, atom sayıları, yük ve fiziksel hâller tutarlı.'];
    }
    function tryInteraction(items, selectedIds, proposal) {
      const selected = items.filter(p => selectedIds.includes(p.id));
      if (!selected.length) return ['selection', 'Önce çalışma alanındaki türleri seç.'];
      if (signature(selected) !== signature(activeInitial)) {
        if (selected.every(p => spectators.some(s => s.formula === p.formula))) return ['spectator', 'Bu türlerin yaklaşması gözlediğin değişimi açıklıyor mu? Her iyon yaklaşması yeni katı veya gaz oluşturmaz; madde özelliklerini incele.'];
        if (selected.length > 1 && selected.every(p => chargeDetails(p.formula).charge > 0)) return ['charge', 'Seçtiğin iyonların yük işaretleri aynı. Yükleri ve madde özelliklerini birlikte incele.'];
        return ['ratio', 'Seçtiğin türleri, gerekli oranı ve gözlemini karşılaştır. Bütün türleri değiştirmek zorunda mısın?'];
      }
      if (!proposal) return ['proposal', 'Seçtiğin türler değişime katılabilir. Şimdi hangi oluşumun gözlemini açıklayacağını öner.'];
      if (!options.some(o => o.id === proposal && o.correct)) return ['proposal-wrong', 'Oluşum önerin gözlemindeki fiziksel değişimi açıklıyor mu? Madde özelliklerini ve yeni türlerin atom içeriğini incele.'];
      return ['ok', 'Seçtiğin türler ve oluşum önerin uygun. Aynı atomlarla yeni türler oluştu. ' + (spectators.length ? 'Diğer türler modelde kaldı.' : 'İncelenen iki gaz da katı oluşumuna katıldı.'), { reactants: clone(selected), products: transform(selected) }];
    }
    const hints = [
      ['Kaynak maddenin adıyla türdeki elementleri karşılaştır. Üst indis yükü, alt indis atom sayısını gösterir.', 'Bir formül kartı bir iyonu veya molekülü temsil eder. Adet bilgisi ayrı kart sayısıdır.', 'Kaynak madde bilgi kartını aç; önce o maddeye ait bir türü yerleştir.'],
      ['Gözlediğin katı, gaz veya sıcaklık değişimini hangi türlerin değişimi açıklayabilir?', properties, 'Önce değişmeden kalan bir türü belirle. Diğer türleri gerekli sayıda seçip oluşum önerini sınayabilirsin.'],
      ['Gözlemini fiziksel hâlle ilişkilendir; değişmeden kalan türleri modelde tut.', 'Gaz sıvıdan ayrılır; çökelti katı yapı oluşturur. Çözünmüş iyonlar sıvı bölgesinde ayrı kalır.', 'Atom sayımını önceki adımlarla karşılaştır. Açıklamanda gözlem, değişen tür ve değişmeden kalan türleri ilişkilendir.']
    ];
    const transfer = ['solid', 'smoke'].includes(kind) ? {
      prompt: 'Yeni karışım: Ag⁺, NO₃⁻, K⁺ ve I⁻ iyonları. Bilgi: AgI az çözünür; KNO₃ çözünür. Hangi sonuç modeli uygun?',
      options: ['AgI katı; K⁺ ve NO₃⁻ çözeltide ayrı', 'KNO₃ katı; Ag⁺ ve I⁻ yok olur', 'Bütün iyonlar ayrı CO₂ moleküllerine dönüşür'], answer: 0,
      guidance: 'Verilen çözünürlük bilgisiyle oluşabilecek katıyı belirle. Geri kalan iyonların yok olup olmayacağını düşün.'
    } : kind === 'gas' ? {
      prompt: 'Yeni karışım: 2 Na⁺, CO₃²⁻, 2 H⁺ ve 2 Cl⁻. Gaz ve su oluşuyor. Atomları koruyan sonuç modeli hangisi?',
      options: ['CO₂ gaz; 2 H₂O; iyonlar yok olur', 'CO₂ gaz; H₂O sıvı; 2 Na⁺ ve 2 Cl⁻ çözeltide', 'CO₂ katı; H₂O sıvı; NaCl molekülleri'], answer: 1,
      guidance: 'Önce H ve O sayılarını karşılaştır; sonra değişmeden kalan iyonları ve gazın hâlini kontrol et.'
    } : {
      prompt: 'Yeni karışım: H⁺, Cl⁻, Na⁺ ve OH⁻ iyonları. Yeni su oluşuyor. Hangi model atomları ve değişmeden kalan türleri korur?',
      options: ['Bütün iyonlar yok olur', 'H₂O gaz; NaCl katı', 'H₂O sıvı; Na⁺ ve Cl⁻ çözeltide ayrı'], answer: 2,
      guidance: 'Suyun oluşumuna katılan türleri ayır; tepkimeye katılmayan iyonların çözeltide kalmasını düşün.'
    };
    const staysAnswer = spectators.length ? 'remain' : 'none';
    return { reaction, sourceNames, before, after, initial, finalItems, activeInitial, spectators, atoms, inventory, kind, options, properties, hints, evidence, explanation, staysAnswer, transfer, activeLabel, phaseLabels, charge, validate, tryInteraction };
  }
  window.InquiryChemistry = { createPlan, charge, signature, phaseOf };
})();
