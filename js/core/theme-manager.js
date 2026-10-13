/**
 * MEBİ Tema Yöneticisi (Light / Dark Mode)
 * MEBİ Design System'in nötr gri standardı ve 350ms yumuşak geçişi ile tam uyumludur.
 */

class LabThemeManager {
  constructor() {
    this.currentTheme = 'light';
    this.callbacks = [];

    // Kayıtlı tercihi veya OS tercihini al
    try {
      const saved = localStorage.getItem('mebi-theme');
      if (saved) {
        this.currentTheme = saved;
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.currentTheme = 'dark';
      }
    } catch (e) {
      this.currentTheme = 'light';
    }

    this.applyTheme(this.currentTheme, false);
  }

  applyTheme(theme, notify = true) {
    theme = theme === 'dark' ? 'dark' : 'light';
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('mebi-theme', theme);
    } catch (e) {}

    // Tema buton ikonlarını güncelle
    const toggleBtn = document.getElementById('btnToggleTheme');
    if (toggleBtn) {
      const isDark = theme === 'dark';
      toggleBtn.setAttribute('title', isDark ? 'Aydınlık Moda Geç' : 'Karanlık Moda Geç');
      toggleBtn.setAttribute('aria-label', isDark ? 'Aydınlık Moda Geç' : 'Karanlık Moda Geç');
      toggleBtn.setAttribute('aria-pressed', String(isDark));
    }

    if (notify) {
      this.callbacks.forEach(cb => cb(theme));
    }
  }

  toggleTheme() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    if (window.labAudio) window.labAudio.playClick();
    this.applyTheme(nextTheme, true);
    return nextTheme;
  }

  onThemeChange(callback) {
    this.callbacks.push(callback);
  }

  isDark() {
    return this.currentTheme === 'dark';
  }
}

const labTheme = new LabThemeManager();
if (typeof window !== "undefined") {
  window.labTheme = labTheme;
}
