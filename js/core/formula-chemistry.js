/* Formula models share real atom identities across all three phases. No renderer is used. */
(function () {
  const clone = value => JSON.parse(JSON.stringify(value));
  const count = atoms => atoms.reduce((out, a) => { out[a.e] = (out[a.e] || 0) + 1; return out; }, {});
  const key = atoms => Object.entries(count(atoms)).sort(([a], [b]) => a.localeCompare(b)).map(([e, n]) => e + n).join('|');
  // Conventional compound notation cannot be derived from atom insertion order.
  const compounds = [
    ['HCl', { H: 1, Cl: 1 }], ['HNO₃', { H: 1, N: 1, O: 3 }],
    ['H₂CO₃', { H: 2, C: 1, O: 3 }], ['NaOH', { Na: 1, O: 1, H: 1 }],
    ['NaHCO₃', { Na: 1, H: 1, C: 1, O: 3 }], ['Na₂CO₃', { Na: 2, C: 1, O: 3 }],
    ['CaCl₂', { Ca: 1, Cl: 2 }], ['NH₄Cl', { N: 1, H: 4, Cl: 1 }],
    ['KNO₃', { K: 1, N: 1, O: 3 }], ['AgNO₃', { Ag: 1, N: 1, O: 3 }],
    ['Pb(NO₃)₂', { Pb: 1, N: 2, O: 6 }], ['Cu(NO₃)₂', { Cu: 1, N: 2, O: 6 }]
  ].map(([formula, elements]) => ({ formula, elements, phase: 'suda' }));
  function chargeDetails(formula) {
    const match = formula.match(/([⁰¹²³⁴⁵⁶⁷⁸⁹]*)([⁺⁻])$/);
    const digits = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    const magnitude = match ? Number([...match[1]].map(c => digits.indexOf(c)).join('') || 1) : 0;
    const charge = magnitude * (match?.[2] === '⁻' ? -1 : 1);
    return { base: match ? formula.slice(0, -match[0].length) : formula, charge,
      label: charge ? `${magnitude === 1 ? '' : magnitude}${charge > 0 ? '+' : '−'}` : '' };
  }
  function renderFormula(element, formula) {
    const { base, charge, label } = chargeDetails(formula);
    element.textContent = base;
    element.dataset.charge = String(charge);
    if (charge) {
      const sup = document.createElement('sup'); sup.className = 'ion-charge'; sup.textContent = label;
      element.append(sup);
      element.setAttribute('aria-label', `${base}, iyon yükü ${charge > 0 ? 'artı' : 'eksi'} ${Math.abs(charge)}`);
    } else element.removeAttribute('aria-label');
  }
  function definition(entry) {
    const symbol = entry.symbol.replace(/^\d+\s+/, '');
    const record = SPECIES_REGISTRY[symbol] || SPECIES_REGISTRY[entry.symbol];
    const divisor = SPECIES_REGISTRY[symbol] ? 1 : Number(entry.symbol.match(/^\d+/)?.[0]) || 1;
    let elements;
    if (record) elements = Object.fromEntries(Object.entries(record.elements).map(([e, n]) => [e, n / divisor]));
    else if (symbol === 'H₂CO₃') elements = { H: 2, C: 1, O: 3 };
    else throw new Error('Kimyasal tür tanımlanamadı: ' + symbol);
    return { formula: symbol.replace(/\((?:k|g|s|suda)\)$/, ''), elements, n: entry.count || 1,
      phase: entry.state || record?.state || 'suda', catalyst: entry.type === 'catalyst' };
  }
  function createPlan(reaction) {
    const before = reaction.microscopic.reactants.map(definition), after = reaction.microscopic.products.map(definition);
    before.filter(d => d.catalyst).forEach(d => { if (!after.some(p => p.formula === d.formula)) after.push(clone(d)); });
    const interaction = reaction.id === 'nahco3_hcl'
      ? [definition({ symbol: 'Na⁺' }), definition({ symbol: 'Cl⁻' }), definition({ symbol: 'H₂CO₃' })] : clone(after);
    const atoms = [];
    const initial = before.flatMap((d, j) => Array.from({ length: d.n }, (_, n) => {
      const own = Object.entries(d.elements).flatMap(([e, total]) => Array.from({ length: total }, (_, k) => ({ e, id: `${reaction.id}:${j}:${n}:${e}:${k}` })));
      atoms.push(...own); return { id: `start-${j}-${n}`, formula: d.formula, phase: d.phase, catalyst: d.catalyst, atoms: own };
    }));
    const inventory = count(atoms), catalog = [...new Map([...before, ...interaction, ...after].map(d => [d.formula, d])).values()];
    function allocate(def, available) {
      const chosen = [];
      for (const [e, n] of Object.entries(def.elements)) {
        const candidates = available.filter(a => a.e === e && !chosen.includes(a));
        if (candidates.length < n) return null;
        chosen.push(...candidates.slice(0, n));
      }
      return clone(chosen);
    }
    function build(defs, phaseIndex) {
      let available = clone(atoms);
      const items = defs.flatMap((d, j) => Array.from({ length: d.n }, (_, n) => {
        const own = allocate(d, available); if (!own) throw new Error(reaction.id + ': atom sayıları uyuşmuyor.');
        const ids = new Set(own.map(a => a.id)); available = available.filter(a => !ids.has(a.id));
        return { id: `phase-${phaseIndex}-${j}-${n}`, formula: d.formula, phase: d.phase, catalyst: d.catalyst, atoms: own };
      }));
      if (available.length) throw new Error(reaction.id + ': modelde kullanılmayan atomlar var.');
      return items;
    }
    function infer(own) {
      const registered = Object.keys(SPECIES_REGISTRY).filter(symbol => !/^\d|^\[/.test(symbol)).map(symbol => definition({ symbol }));
      const wanted = key(own), known = [...catalog, ...registered, ...compounds].find(d => key(Object.entries(d.elements).flatMap(([e, n]) => Array.from({ length: n }, () => ({ e })))) === wanted);
      // Arbitrary atom counts do not establish that a real chemical species exists.
      return known ? { formula: known.formula, phase: known.phase, catalyst: known.catalyst } : null;
    }
    const expected = [initial, build(interaction, 1), build(after, 2)];
    const signature = items => items.map(p => p.formula + ':' + key(p.atoms)).sort().join(';');
    function validate(items, index) {
      const own = items.flatMap(p => p.atoms), ids = new Set(own.map(a => a.id));
      if (!own.length) return ['empty', 'Havuzdaki formülleri çalışma alanına ekle.'];
      if (own.length !== atoms.length || ids.size !== atoms.length || atoms.some(a => !own.some(b => b.id === a.id && b.e === a.e)))
        return ['inventory', 'Atomların tamamını kullan; eksik veya fazla atomları sayımdan kontrol et.'];
      const validSignatures = index === 1 ? [signature(expected[1]), signature(expected[2])] : [signature(expected[index])];
      if (!validSignatures.includes(signature(items))) return [index === 0 ? 'start' : 'products', index === 0
        ? 'Başlangıç türlerini havuzdaki formüllerle eşleştir.' : 'Aynı atomları tepkimeye uygun kimyasal türler olarak yeniden düzenle.'];
      if (index === 2 && items.some(p => (p.phase === 'g') !== (after.find(d => d.formula === p.formula)?.phase === 'g')))
        return ['gas', 'Gaz ürününü gaz bölgesine; diğer türleri alt bölgeye yerleştir.'];
      return ['ok', 'Formüller ve atom sayıları tutarlı.'];
    }
    return { reaction, before, after, interaction, catalog, atoms, inventory, initial, expected, allocate, infer, validate };
  }
  window.FormulaChemistry = { clone, count, key, definition, createPlan, chargeDetails, renderFormula };
})();
