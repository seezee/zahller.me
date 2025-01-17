/**
 * @module zed-theme-toggle
 * @description Light/dark theme switcher.
 */

export default class ThemeSwitcher extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector(`button`);
  }

  /**
   * Call this method when the element is added to the document
   */
  connectedCallback() {
    let themeAttr = document.documentElement.getAttribute(`data-theme`);
    let themeValue;
    let themeStatus;

    if (themeAttr === `light`) {
      themeValue  = `dark`;
      themeStatus = `light`;
    } else {
      themeValue  = `light`;
      themeStatus = `dark`;
    }

    // Set attributes
    this.button.className = `theme-toggle`;
    this.button.setAttribute(`data-theme`, `${themeStatus}`);
    this.button.setAttribute(`aria-live`, `polite`);
    this.button.setAttribute(`title`, `Switch to ${themeValue} theme`);
    this.button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="sun-and-moon" aria-hidden="true" width="24" height="24" viewBox="0 0 24 24"><circle class="sun" cx="12" cy="12" r="6" mask="url(#moon-mask)" fill="currentColor" /><g class="sun-beams" stroke="currentColor"><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></g><mask class="moon" id="moon-mask"><rect x="0" y="0" width="100%" height="100%" fill="#fff" /><circle cx="24" cy="10" r="6" fill="#000" /></mask></svg><span class="sr-only" id="theme-toggle-label">Toggle to <span id="theme-value">${themeValue}</span> theme. <span role="status">Current them is <span id="theme-status">${themeStatus}</span></span></span>`;
    // Create the button
    this.render();
    this.addEventListener(`click`, this);
  }

  // Create the click handler
	handleEvent () {
    let themeAttr          = document.documentElement.getAttribute(`data-theme`);
    let dataTheme;
    const themeButton      = document.getElementById(`theme-toggle`);
    let buttonTitle        = themeButton.getAttribute(`title`);
    let themeVal           = document.getElementById(`theme-value`);
    let themeStatus        = document.getElementById(`theme-status`);


    if ( themeAttr !== `dark` ) {
      dataTheme             = this.button.setAttribute(`data-theme`, `dark`);
      document.documentElement.setAttribute(`data-theme`, `dark`);
      localStorage.setItem(`theme-preference`, `dark`);
      themeVal.innerHTML    = `light`;
      themeStatus.innerHTML =`dark`;
      buttonTitle           = this.button.setAttribute(`title`, `Switch to light theme`);
    } else {
      dataTheme             = this.button.setAttribute(`data-theme`, `light`);
      document.documentElement.setAttribute(`data-theme`, `light`);
      localStorage.setItem(`theme-preference`, `light`); // reset theme selection
      themeVal.innerHTML    = `dark`;
      themeStatus.innerHTML = `light`;
      buttonTitle           = this.button.setAttribute(`title`, `Switch to dark theme`);
    }
	}

  /**
   * Render the button
   */
  render() {
    const storageKey  = localStorage.getItem(`theme-preference`);
    const prefersDark = window.matchMedia(`(prefers-color-scheme: dark)`);
    let dataTheme     = storageKey === `dark` ? `dark`:`light`;

    /**
     * If the user hasn't set a preference, check the system settings when the
     * component loads
     */

    // If the storage key is set, set the data-theme attribute & bail
    if (storageKey !== null) {
      document.documentElement.setAttribute(`data-theme`, dataTheme);
    // But if it's not set, set the theme based on system settings
    } else {
      // System setting is dark
      if (prefersDark.matches) {
        document.documentElement.setAttribute(`data-theme`, `dark`);
      // Or it isn't
      } else {
        document.documentElement.setAttribute(`data-theme`, `light`);
      }
    };

    /**
     * Watch for changes to the system setting
     */
    // If the user has set a preference, set the data-theme attribute.
    if (storageKey !== null) {
      document.documentElement.setAttribute(`data-theme`, dataTheme);
    // But if they haven't, listen for the system setting to change.
    // TODO: move this to the event handler.
    } else {
      prefersDark.addEventListener(
        `change`, event => {
          if (event.matches) {
            document.documentElement.setAttribute(`data-theme`, `dark`);
          } else {
            document.documentElement.setAttribute(`data-theme`, `light`);
          }
        }
      )
    }
  }

  /**
   * Call this method when the element is removed from the document
   */
  disconnectedCallback() {
    this.removeEventListener(`click`, this);
  }

}

if (`customElements` in window) {

  // let the browser know that <zed-theme-toggle> is served by our new class
  customElements.define(`zed-theme-toggle`, ThemeSwitcher);
}
