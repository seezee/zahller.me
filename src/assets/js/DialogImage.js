/**
 * @module zed-dialog-img
 * @description A custom element for creating image modals
 * See https://www.raymondcamden.com/2023/12/13/an-image-dialog-web-component.
 */

export default class DialogImage extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    // Get elements, should be one of each only.
    const image         = this.querySelector(`img`);
    const altAttr       = image.getAttribute(`alt`);
    const imageUrl      = image.getAttribute(`src`);

    let split           = imageUrl.split('.');
    split.pop();
    let imageUrlTrimmed = split.join(".");

    const fig           = image.parentNode.parentNode;
    const caption       = this.querySelector(`figcaption`);
    const captionText   = caption.innerText;

    if(!image) {
      console.warn(`zed-dialog-img: No image found. Exiting.`);
      return; // Bail early.
    }

    if(!altAttr) {
      alert(`Image is missing alt attribute!`);
    }

    // Create the dialog.
    let modal = document.createElement(`dialog`);
    modal.setAttribute(`class`, `image-modal`);
    // `method="dialog"` captures the button click and closes the dialog.
    modal.innerHTML = `
  <form method="dialog">
    <stack-l>
      <figure>
        <picture>
          <stack-l>
            <source srcset="${imageUrlTrimmed}.webp" type="image/webp"/>
            <source srcset="${imageUrlTrimmed}.jpeg" type="image/jpeg"/>
            <img src="${imageUrl}" alt="${altAttr}">
            <figcaption>${captionText}</figcaption>
          </stack-l>
        </picture>
      </figure>
      <div class="aligncenter">
        <button autofocus class="button button-primary" type="submit">Close</button>
      </div>
    </stack-l>
  </form>
    `;

    // Add the dialog outside of the img tag (which is parent),
    // but immediately after.
    fig.parentNode.insertBefore(modal, fig.nextSibling);

    let closeButton = this.querySelector(`button`);

    // Add attribute for accessibility
    image.setAttribute(`tabindex`, `0`);
    image.setAttribute(`aria-haspopup`, `dialog`);

    // Listen for click on image
    image.addEventListener(`click`, (e) => {
      e.preventDefault();
      // Prevent scrolling outside the modal; see
      // https://www.joshwcomeau.com/css/has/#global-detection-6.
      modal.setAttribute(`data-disable-document-scroll`, true);
      // Open the modal.
      modal.showModal();
    });

    // Listen for the enter key click.
    image.addEventListener(`keydown`, (e) => {
        switch (e.key) {
          case `Enter`:
            e.preventDefault();
            // Prevent scrolling outside the modal.
            modal.setAttribute(`data-disable-document-scroll`, true);
            // Open the modal.
            modal.showModal();
            break;
          default:
            return;
        }
      },
      true,
    );

    // Listen for button click
    closeButton.addEventListener(`click`, (e) => {
      // Stop preventDefault() on parent elements from propagating to the button.
      e.stopPropagation();
      // Allow scrolling outside the modal.
      modal.removeAttribute(`data-disable-document-scroll`);
      // Close the modal.
      modal.close();
    });

    // Listen for the escape key click.
    window.addEventListener(`keydown`, (e) => {
        if (e.defaultPrevented) {
          return;
        }

        switch (e.key) {
          case `Escape`:
            // Allow scrolling outside the modal.
            modal.removeAttribute(`data-disable-document-scroll`);
            break;
          default:
            return;
        }
      },
      true,
    );

    // Close the dialog when ::backdrop is clicked.
    modal.addEventListener(`click`, (e) => {
      // Get the dialog boundaries
      const rect = modal.getBoundingClientRect();
      // Define dialog inner boundary.
      const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height && rect.left <= e.clientX && e.clientX <= rect.left + rect.width);

      // If the click is not inside the boundary, close the dialog.
      if (!isInDialog) {
        modal.removeAttribute(`data-disable-document-scroll`);
        modal.close();
      }
    });
  }
}

if (`customElements` in window) {
  customElements.define(`zed-dialog-img`, DialogImage);
}
