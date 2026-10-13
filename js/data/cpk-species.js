/* Jmol CPK colors. Geometry is an enlarged teaching representation, not a scale model.
 * Colors: https://jmol.sourceforge.net/jscolors/
 * Carbonate/nitrate bond orders show one representative resonance structure.
 */
(function () {
  const colors = { H:'#FFFFFF', C:'#909090', N:'#3050F8', O:'#FF0D0D', Na:'#AB5CF2', Cl:'#1FF01F', K:'#8F40D4', Ca:'#3DFF00', Cu:'#C88033', Ag:'#C0C0C0', I:'#940094', Pb:'#575961' };
  const names = { H:'Hidrojen', C:'Karbon', N:'Azot', O:'Oksijen', Na:'Sodyum', Cl:'Klor', K:'Potasyum', Ca:'Kalsiyum', Cu:'Bakır', Ag:'Gümüş', I:'İyot', Pb:'Kurşun' };
  const specs = {};
  for (const [formula, element, radius] of [['Na⁺','Na',.32],['H⁺','H',.23],['Cl⁻','Cl',.36],['K⁺','K',.35],['I⁻','I',.36],['Ca²⁺','Ca',.32],['Cu²⁺','Cu',.30],['Ag⁺','Ag',.32],['Pb²⁺','Pb',.34]]) specs[formula] = { atoms:[[element,0,0,0,radius]], bonds:[] };
  const carbonate = [['C',0,0,0,.24],['O',-.554,.32,0,.215],['O',.554,.32,0,.215],['O',0,-.64,0,.215]];
  const carbonateBonds = [[0,1,2],[0,2,1],[0,3,1]];
  specs['CO₃²⁻'] = { atoms:carbonate, bonds:carbonateBonds, note:'C–O bağları eşdeğer rezonans yapılarından biriyle gösterilir.' };
  specs['HCO₃⁻'] = { atoms:[...carbonate,['H',.425,-.770,0,.145]], bonds:[...carbonateBonds,[3,4,1]], note:'O–H bağı korunur; C–O bağlarında bir rezonans yapısı gösterilir.' };
  specs['NO₃⁻'] = { atoms:[['N',0,0,0,.23],...carbonate.slice(1)], bonds:carbonateBonds, note:'N–O bağları eşdeğer rezonans yapılarından biriyle gösterilir.' };
  specs['OH⁻'] = { atoms:[['O',-.13,0,0,.215],['H',.315,0,0,.145]], bonds:[[0,1,1]] };
  specs['H₂O₂'] = { atoms:[['O',-.34,0,0,.195],['O',.34,0,0,.195],['H',-.427,.425,0,.12],['H',.427,-.156,.397,.12]], bonds:[[0,1,1],[0,2,1],[1,3,1]], rotation:[.70,.28,.04] };
  specs['NH₃'] = { atoms:[['N',0,.10,0,.23],['H',0,-.30,.38,.135],['H',-.329,-.30,-.19,.135],['H',.329,-.30,-.19,.135]], bonds:[[0,1,1],[0,2,1],[0,3,1]], rotation:[.25,.35,0] };
  specs.HCl = { atoms:[['H',-.35,0,0,.145],['Cl',.25,0,0,.29]], bonds:[[0,1,1]], note:'Bu görevde HCl, çözeltinin üstündeki gaz molekülüdür.' };
  specs['CaCO₃'] = { atoms:[['Ca',-.95,-.05,.15,.30],...carbonate.map(([e,x,y,z,r])=>[e,x+.25,y,z,r])], bonds:carbonateBonds.map(([a,b,n])=>[a+1,b+1,n]), note:'Katı örgünün temsilî formül birimi; Ca ile karbonat arasında kovalent çubuk çizilmez.' };
  specs['H₂O'] = { atoms:[['O',0,0,0,.195],['H',-.340,-.263,0,.12],['H',.340,-.263,0,.12]], bonds:[[0,1,1],[0,2,1]] };
  specs['CO₂'] = { atoms:[['C',0,0,0,.24],['O',-.65,0,0,.215],['O',.65,0,0,.215]], bonds:[[0,1,2],[0,2,2]] };
  specs['O₂'] = { atoms:[['O',-.30,0,0,.215],['O',.30,0,0,.215]], bonds:[[0,1,2]] };
  const ammonium=[['N',0,0,0,.23],['H',.32,.32,.32,.13],['H',.32,-.32,-.32,.13],['H',-.32,.32,-.32,.13],['H',-.32,-.32,.32,.13]],ammoniumBonds=[[0,1,1],[0,2,1],[0,3,1],[0,4,1]];
  specs['NH₄⁺'] = { atoms:ammonium,bonds:ammoniumBonds };
  specs['NH₄Cl'] = { atoms:[...ammonium,['Cl',.98,0,0,.29]],bonds:ammoniumBonds,note:'Amonyum klorür katı aerosolunun temsilî formül birimi; NH₄⁺ içindeki N–H bağları gösterilir.' };
  const ionicNote='Katı örgünün temsilî formül birimi; iyonlar arasında kovalent bağ çubuğu çizilmez.';
  specs['PbI₂'] = { atoms:[['Pb',0,0,0,.31],['I',-.69,0,0,.29],['I',.69,0,0,.29]],bonds:[],note:ionicNote };
  specs.AgCl = { atoms:[['Ag',-.34,0,0,.28],['Cl',.34,0,0,.29]],bonds:[],note:ionicNote };
  specs.AgI = { atoms:[['Ag',-.34,0,0,.28],['I',.34,0,0,.29]],bonds:[],note:ionicNote };
  specs['CuCO₃'] = { atoms:[['Cu',-.95,-.05,.15,.30],...carbonate.map(([e,x,y,z,r])=>[e,x+.25,y,z,r])],bonds:carbonateBonds.map(([a,b,n])=>[a+1,b+1,n]),note:'Katı örgünün temsilî formül birimi; karbonatın iç bağları gösterilir.' };
  specs['Cu(OH)₂'] = { atoms:[['Cu',0,0,0,.28],['O',-.62,.18,0,.20],['H',-.95,-.09,0,.13],['O',.62,-.18,0,.20],['H',.95,.09,0,.13]],bonds:[[1,2,1],[3,4,1]],note:'Katı örgünün temsilî formül birimi; hidroksitlerin O–H bağları gösterilir.' };
  function get(formula) {
    const spec = specs[formula];
    return spec ? { ...spec, formula, charge:FormulaChemistry.chargeDetails(formula).charge } : null;
  }
  function matchAtoms(item) {
    const spec = get(item.formula); if (!spec) throw new Error('3B tür tanımlanmadı: '+item.formula);
    const pool = item.atoms.map(a=>({...a}));
    const atoms = spec.atoms.map(([e,x,y,z,r])=>{
      const index = pool.findIndex(a=>a.e===e); if (index<0) throw new Error('3B atom envanteri uyuşmuyor: '+item.formula);
      const [original] = pool.splice(index,1); return { ...original, x,y,z,r };
    });
    if (pool.length) throw new Error('3B görünümde kullanılmayan atom: '+item.formula);
    return { ...spec, atoms };
  }
  window.CPKSpecies = { colors, names, get, matchAtoms };
})();
