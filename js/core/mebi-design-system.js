/* Bind the existing MEBİ UI kit to the laboratory's native, accessible controls. */
(function () {
  function applyActivity(root) {
    root.classList.add('mebi-activity');
    root.querySelectorAll('.glass-panel, .workshop-header').forEach(panel => panel.classList.add('mebi-card'));
    root.querySelectorAll('button').forEach(button => {
      if (button.matches('[role="tab"], [data-item], .formula-card, .trace-formula-card, .cpk-hit')) return;
      button.classList.add('mebi-btn');
      button.classList.toggle('mebi-btn-primary', button.classList.contains('liquid-primary'));
      button.classList.toggle('mebi-btn-secondary', !button.classList.contains('liquid-primary'));
      if (button.id === 'fm-result-close') button.classList.add('mebi-btn-icon-only');
    });
    root.querySelectorAll('.formula-card, .formula-token, .trace-formula-card').forEach(card => card.classList.add('mebi-species-card'));
    root.querySelectorAll('select, textarea').forEach(field => field.classList.add('mebi-input'));
    root.querySelectorAll('#fm-transfer-options label').forEach(choice => choice.classList.add('mebi-quiz-choice'));
    root.querySelectorAll('.model-result').forEach(dialog => dialog.classList.add('mebi-modal'));
    root.querySelectorAll('.workshop-feedback').forEach(panel => {
      panel.classList.add('mebi-panel');
      panel.classList.toggle('mebi-panel-success', panel.classList.contains('good'));
      panel.classList.toggle('mebi-panel-warning', panel.classList.contains('guidance'));
    });
  }
  window.MebiDesignSystem = { applyActivity };
})();
