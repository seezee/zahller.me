`use strict`;

function decodeBase64(encoded) {
  return decodeURIComponent(atob(encoded).split(``).map(function(c) {
    return `%` + (`00` + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(``));
}

const slot    = document.getElementById(`email`);
const encoded = slot.getAttribute(`data-sixty-four`);
const email   = decodeBase64(encoded);
const html    = `<a class="vcard__link u-email with-icon" href="mailto:` + email + `"><svg class="icon icon--email" role="img" aria-hidden="true" width="24" height="24"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon-email"></use></svg> <span class="vcard__link-text"><span class="sr-only">Email: </span>` + email + `</span></a>`

slot.insertAdjacentHTML("afterbegin", html);
