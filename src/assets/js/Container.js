/**
 * @module container-l
 * @description
 * A custom element for defining containment contexts
 * @property {string} name The name of the container, used as the CSS `container-name` value (optional)
 */
export default class Container extends HTMLElement {
  constructor() {
    super();
    this.render = () => {
      this.i = `Container-${[this.name]}`;
      this.dataset.i = this.i;
      if (!document.getElementById(this.i)) {
        let styleEl = document.createElement('style');
        styleEl.id = this.i;
        styleEl.innerHTML = `
            [data-i="${this.i}"] {
              display: block;
              container-type: inline-size;
              ${this.name ? `container-name: ${this.name};` : ''}
            }
          `.replace(/\s\s+/g, ' ').trim();
        document.head.appendChild(styleEl);
      }
    }
  }

  get name() {
    return this.getAttribute('name') || null;
  }

  set name(val) {
    return this.setAttribute('name', val);
  }

  static get observedAttributes() {
    return ['name'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }
}

if ('customElements' in window) {
  customElements.define('container-l', Container);
}
