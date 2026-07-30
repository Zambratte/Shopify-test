function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

class SectionId {
  static #separator = '__';

  // for a qualified section id (e.g. 'template--22224696705326__main'), return just the section id (e.g. 'template--22224696705326')
  static parseId(qualifiedSectionId) {
    return qualifiedSectionId.split(SectionId.#separator)[0];
  }

  // for a qualified section id (e.g. 'template--22224696705326__main'), return just the section name (e.g. 'main')
  static parseSectionName(qualifiedSectionId) {
    return qualifiedSectionId.split(SectionId.#separator)[1];
  }

  // for a section id (e.g. 'template--22224696705326') and a section name (e.g. 'recommended-products'), return a qualified section id (e.g. 'template--22224696705326__recommended-products')
  static getIdForSection(sectionId, sectionName) {
    return `${sectionId}${SectionId.#separator}${sectionName}`;
  }
}

class HTMLUpdateUtility {
  /**
   * Used to swap an HTML node with a new node.
   * The new node is inserted as a previous sibling to the old node, the old node is hidden, and then the old node is removed.
   *
   * The function currently uses a double buffer approach, but this should be replaced by a view transition once it is more widely supported https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
   */
  static viewTransition(oldNode, newContent, preProcessCallbacks = [], postProcessCallbacks = []) {
    preProcessCallbacks?.forEach((callback) => callback(newContent));

    const newNodeWrapper = document.createElement('div');
    HTMLUpdateUtility.setInnerHTML(newNodeWrapper, newContent.outerHTML);
    const newNode = newNodeWrapper.firstChild;

    // dedupe IDs
    const uniqueKey = Date.now();
    oldNode.querySelectorAll('[id], [form]').forEach((element) => {
      element.id && (element.id = `${element.id}-${uniqueKey}`);
      element.form && element.setAttribute('form', `${element.form.getAttribute('id')}-${uniqueKey}`);
    });

    oldNode.parentNode.insertBefore(newNode, oldNode);
    oldNode.style.display = 'none';

    postProcessCallbacks?.forEach((callback) => callback(newNode));

    setTimeout(() => oldNode.remove(), 500);
  }

  // Sets inner HTML and reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
  static setInnerHTML(element, html) {
    element.innerHTML = html;
    element.querySelectorAll('script').forEach((oldScriptTag) => {
      const newScriptTag = document.createElement('script');
      Array.from(oldScriptTag.attributes).forEach((attribute) => {
        newScriptTag.setAttribute(attribute.name, attribute.value);
      });
      newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
      oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
    });
  }
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  if (summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer, menu-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (event.target !== container && event.target !== last && event.target !== first) return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if ((event.target === container || event.target === first) && event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();

  if (
    elementToFocus.tagName === 'INPUT' &&
    ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
    elementToFocus.value
  ) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(':focus-visible');
} catch (e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    'ARROWUP',
    'ARROWDOWN',
    'ARROWLEFT',
    'ARROWRIGHT',
    'TAB',
    'ENTER',
    'SPACE',
    'ESCAPE',
    'HOME',
    'END',
    'PAGEUP',
    'PAGEDOWN',
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    'focus',
    () => {
      if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add('focused');
    },
    true
  );
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    if (event.target.name === 'plus') {
      if (parseInt(this.input.dataset.min) > parseInt(this.input.step) && this.input.value == 0) {
        this.input.value = this.input.dataset.min;
      } else {
        this.input.stepUp();
      }
    } else {
      this.input.stepDown();
    }

    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);

    if (this.input.dataset.min === previousValue && event.target.name === 'minus') {
      this.input.value = parseInt(this.input.min);
    }
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle('disabled', parseInt(value) <= parseInt(this.input.min));
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}

customElements.define('quantity-input', QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}


function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn(...args);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: `application/${type}` },
  };
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (country_domid, province_domid, options) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler, this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = '';
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach((summary) =>
      summary.addEventListener('click', this.onSummaryClick.bind(this))
    );
    this.querySelectorAll(
      'button:not(.localization-selector):not(.country-selector__close-button):not(.country-filter__reset-button)'
    ).forEach((button) => button.addEventListener('click', this.onCloseButtonClick.bind(this)));
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if (!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle
      ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary'))
      : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function addTrapFocus() {
      trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'));
      summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
    }

    if (detailsElement === this.mainDetailsToggle) {
      if (isOpen) event.preventDefault();
      isOpen ? this.closeMenuDrawer(event, summaryElement) : tçß9¶‰žËkºwµçEä´µÁ…ÕÍ•œ¤ì(€€€€€Ñ¡¥Ì¹Í±¥‘•ÉÕÑ½Á±…å	ÕÑÑ½¸¹Í•ÑÑÑÉ¥‰ÕÑ” …É¥„µ±…‰•°œ°Ý¥¹‘½Ü¹…•ÍÍ¥‰¥±¥ÑåMÑÉ¥¹Ì¹Á±…åM±¥‘•Í¡½Ü¤ì(€€€ô•±Í”ì(€€€€€Ñ¡¥Ì¹Í±¥‘•ÉÕÑ½Á±…å	ÕÑÑ½¸¹±…ÍÍ1¥ÍÐ¹É•µ½Ù” Í±¥‘•Í¡½Ý}}…ÕÑ½Á±…ä´µÁ…ÕÍ•œ¤ì(€€€€€Ñ¡¥Ì¹Í±¥‘•ÉÕÑ½Á±…å	ÕÑÑ½¸¹Í•ÑÑÑÉ¥‰ÕÑ” …É¥„µ±…‰•°œ°Ý¥¹‘½Ü¹…•ÍÍ¥‰¥±¥ÑåMÑÉ¥¹Ì¹Á…ÕÍ•M±¥‘•Í¡½Ü¤ì(€€€ô(€ô((€…ÕÑ½I½Ñ…Ñ•M±¥‘•Ì ¤ì(€€€½¹ÍÐÍ±¥‘•MÉ½±±A½Í¥Ñ¥½¸€ô(€€€€€Ñ¡¥Ì¹ÕÉÉ•¹ÑA…”€ôôôÑ¡¥Ì¹Í±¥‘•É%Ñ•µÌ¹±•¹Ñ €ü€À€èÑ¡¥Ì¹Í±¥‘•È¹ÍÉ½±±1•™Ð€¬Ñ¡¥Ì¹Í±¥‘•É%Ñ•µ=™™Í•Ðì((€€€Ñ¡¥Ì¹Í•ÑM±¥‘•A½Í¥Ñ¥½¸¡Í±¥‘•MÉ½±±A½Í¥Ñ¥½¸¤ì(€€€Ñ¡¥Ì¹…ÁÁ±å¹¥µ…Ñ¥½¹Q½¹¹½Õ¹•µ•¹Ñ	…È ¤ì(€ô((€Í•ÑM±¥‘•Y¥Í¥‰¥±¥Ñä¡•Ù•¹Ð¤ì(€€€Ñ¡¥Ì¹Í±¥‘•É%Ñ•µÍQ½M¡½Ü¹™½É…  ¡¥Ñ•´°¥¹‘•à¤€ôøì(€€€€€½¹ÍÐ±¥¹­±•µ•¹ÑÌ€ô¥Ñ•´¹ÅÕ•ÉåM•±•Ñ½É±° „œ¤ì(€€€€€¥˜€¡¥¹‘•à€ôôôÑ¡¥Ì¹ÕÉÉ•¹ÑA…”€´€Ä¤ì(€€€€€€€¥˜€¡±¥¹­±•µ•¹ÑÌ¹±•¹Ñ ¤(€€€€€€€€€±¥¹­±•µ•¹ÑÌ¹™½É…  ¡‰ÕÑÑ½¸¤€ôøì(€€€€€€€€€€€‰ÕÑÑ½¸¹É•µ½Ù•ÑÑÉ¥‰ÕÑ” Ñ…‰¥¹‘•àœ¤ì(€€€€€€€€€ô¤ì(€€€€€€€¥Ñ•´¹Í•ÑÑÑÉ¥‰ÕÑ” …É¥„µ¡¥‘‘•¸œ°€™…±Í”œ¤ì(€€€€€€€¥Ñ•´¹É•µ½Ù•ÑÑÉ¥‰ÕÑ” Ñ…‰¥¹‘•àœ¤ì(€€€€€ô•±Í”ì(€€€€€€€¥˜€¡±¥¹­±•µ•¹ÑÌ¹±•¹Ñ ¤(€€€€€€€€€±¥¹­±•µ•¹ÑÌ¹™½É…  ¡‰ÕÑÑ½¸¤€ôøì(€€€€€€€€€€€‰ÕÑÑ½¸¹Í•ÑÑÑÉ¥‰ÕÑ” Ñ…‰¥¹‘•àœ°€œ´Äœ¤ì(€€€€€€€€€ô¤ì(€€€€€€€¥Ñ•´¹Í•ÑÑÑÉ¥‰ÕÑ” …É¥„µ¡¥‘‘•¸œ°€ÑÉÕ”œ¤ì(€€€€€€€¥Ñ•´¹Í•ÑÑÑÉ¥‰ÕÑ” Ñ…‰¥¹‘•àœ°€œ´Äœ¤ì(€€€€€ô(€€€ô¤ì(€€€Ñ¡¥Ì¹Ý…Í±¥­•€ô™…±Í”ì(€ô((€…ÁÁ±å¹¥µ…Ñ¥½¹Q½¹¹½Õ¹•µ•¹Ñ	…È¡‰ÕÑÑ½¸€ô€¹•áÐœ¤ì(€€€¥˜€ …Ñ¡¥Ì¹…¹¹½Õ¹•µ•¹Ñ	…ÉM±¥‘•È¤É•ÑÕÉ¸ì((€€€½¹ÍÐ¥Ñ•µÍ½Õ¹Ð€ôÑ¡¥Ì¹Í±¥‘•É%Ñ•µÌ¹±•¹Ñ ì(€€€½¹ÍÐ¥¹É•µ•¹Ð€ô‰ÕÑÑ½¸€ôôô€¹•áÐœ€ü€Ä€è€´Äì((€€€½¹ÍÐÕÉÉ•¹Ñ%¹‘•à€ôÑ¡¥Ì¹ÕÉÉ•¹ÑA…”€´€Äì(€€€±•Ð¹•áÑ%¹‘•à€ô€¡ÕÉÉ•¹Ñ%¹‘•à€¬¥¹É•µ•¹Ð¤€”¥Ñ•µÍ½Õ¹Ðì(€€€¹•áÑ%¹‘•à€ô¹•áÑ%¹‘•à€ôôô€´Ä€ü¥Ñ•µÍ½Õ¹Ð€´€Ä€è¹•áÑ%¹‘•àì((€€€½¹ÍÐ¹•áÑM±¥‘”€ôÑ¡¥Ì¹Í±¥‘•É%Ñ•µÍm¹•áÑ%¹‘•átì(€€€½¹ÍÐÕÉÉ•¹ÑM±¥‘”€ôÑ¡¥Ì¹Í±¥‘•É%Ñ•µÍmÕÉÉ•¹Ñ%¹‘•átì((€€€½¹ÍÐ…¹¥µ…Ñ¥½¹±…ÍÍ%¸€ô€…¹¹½Õ¹•µ•¹Ðµ‰…ÈµÍ±¥‘•È´µ™…‘”µ¥¸œì(€€€½¹ÍÐ…¹¥µ…Ñ¥½¹±…ÍÍ=ÕÐ€ô€…¹¹½Õ¹•µ•¹Ðµ‰…ÈµÍ±¥‘•È´µ™…‘”µ½ÕÐœì((€€€½¹ÍÐ¥Í¥ÉÍÑM±¥‘”€ôÕÉÉ•¹Ñ%¹‘•à€ôôô€Àì(€€€½¹ÍÐ¥Í1…ÍÑM±¥‘”€ôÕÉÉ•¹Ñ%¹‘•à€ôôô¥Ñ•µÍ½Õ¹Ð€´€Äì((€€€½¹ÍÐÍ¡½Õ±‘5½Ù•9•áÐ€ô€¡‰ÕÑÑ½¸€ôôô€¹•áÐœ€˜˜€…¥Í1…ÍÑM±¥‘”¤ñð€¡‰ÕÑÑ½¸€ôôô€ÁÉ•Ù¥½ÕÌœ€˜˜¥Í¥ÉÍÑM±¥‘”¤ì(€€€½¹ÍÐ‘¥É•Ñ¥½¸€ôÍ¡½Õ±‘5½Ù•9•áÐ€ü€¹•áÐœ€è€ÁÉ•Ù¥½ÕÌœì((€€€ÕÉÉ•¹ÑM±¥‘”¹±…ÍÍ1¥ÍÐ¹…‘¡€‘í…¹¥µ…Ñ¥½¹±…ÍÍ=ÕÑô´‘í‘¥É•Ñ¥½¹õ€¤ì(€€€¹•áÑM±¥‘”¹±…ÍÍ1¥ÍÐ¹…‘¡€‘í…¹¥µ…Ñ¥½¹±…ÍÍ%¹ô´‘í‘¥É•Ñ¥½¹õ€¤ì((€€€Í•ÑQ¥µ•½ÕÐ  ¤€ôøì(€€€€€ÕÉÉ•¹ÑM±¥‘”¹±…ÍÍ1¥ÍÐ¹É•µ½Ù”¡€‘í…¹¥µ…Ñ¥½¹±…ÍÍ=ÕÑô´‘í‘¥É•Ñ¥½¹õ€¤ì(€€€€€¹•áÑM±¥‘”¹±…ÍÍ1¥ÍÐ¹É•µ½Ù”¡€‘í…¹¥µ…Ñ¥½¹±…ÍÍ%¹ô´‘í‘¥É•Ñ¥½¹õ€¤ì(€€€ô°Ñ¡¥Ì¹…¹¹½Õ¹•É	…É¹¥µ…Ñ¥½¹•±…ä€¨€È¤ì(€ô((€±¥¹­Q½M±¥‘”¡•Ù•¹Ð¤ì(€€€•Ù•¹Ð¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤ì(€€€½¹ÍÐÍ±¥‘•MÉ½±±A½Í¥Ñ¥½¸€ô(€€€€€Ñ¡¥Ì¹Í±¥‘•È¹ÍÉ½±±1•™Ð€¬(€€€€€Ñ¡¥Ì¹Í±¥‘•É¥ÉÍÑ%Ñ•µ9½‘”¹±¥•¹Ñ]¥‘Ñ €¨(€€€€€€€€¡Ñ¡¥Ì¹Í±¥‘•É½¹ÑÉ½±1¥¹­ÍÉÉ…ä¹¥¹‘•á=˜¡•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¤€¬€Ä€´Ñ¡¥Ì¹ÕÉÉ•¹ÑA…”¤ì(€€€Ñ¡¥Ì¹Í±¥‘•È¹ÍÉ½±±Q¼¡ì(€€€€€±•™ÐèÍ±¥‘•MÉ½±±A½Í¥Ñ¥½¸°(€€€ô¤ì(€ô)ô()ÕÍÑ½µ±•µ•¹ÑÌ¹‘•™¥¹” Í±¥‘•Í¡½Üµ½µÁ½¹•¹Ðœ°M±¥‘•Í¡½Ý½µÁ½¹•¹Ð¤ì()±…ÍÌY…É¥…¹ÑM•±•ÑÌ•áÑ•¹‘Ì!Q51±•µ•¹Ðì(€½¹ÍÑÉÕÑ½È ¤ì(€€€ÍÕÁ•È ¤ì(€ô((€½¹¹•Ñ•‘…±±‰…¬ ¤ì(€€€Ñ¡¥Ì¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ¡…¹”œ°€¡•Ù•¹Ð¤€ôøì(€€€€€½¹ÍÐÑ…É•Ð€ôÑ¡¥Ì¹•Ñ%¹ÁÕÑ½ÉÙ•¹ÑQ…É•Ð¡•Ù•¹Ð¹Ñ…É•Ð¤ì(€€€€€Ñ¡¥Ì¹ÕÁ‘…Ñ•M•±•Ñ¥½¹5•Ñ…‘…Ñ„¡•Ù•¹Ð¤ì((€€€€€Ñ¡¥Ì¹‘¥ÍÁ…Ñ¡AÉ½‘ÕÑM•±•ÑÙ•¹Ð ¤ì((€€€€€ÁÕ‰±¥Í ¡AU	}MU	}Y9QL¹½ÁÑ¥½¹Y…±Õ•M•±•Ñ¥½¹¡…¹”°ì(€€€€€€€‘…Ñ„èì(€€€€€€€€€•Ù•¹Ð°(€€€€€€€€€Ñ…É•Ð°(€€€€€€€€€Í•±•Ñ•‘=ÁÑ¥½¹Y…±Õ•ÌèÑ¡¥Ì¹Í•±•Ñ•‘=ÁÑ¥½¹Y…±Õ•Ì°(€€€€€€€ô°(€€€€€ô¤ì(€€€ô¤ì(€ô((€•Ñ±±M•±•Ñ•‘=ÁÑ¥½¹Ì ¤ì(€€€½¹ÍÐ½ÁÑ¥½¹Ì€ômtì(€€€Ñ¡¥Ì¹ÅÕ•ÉåM•±•Ñ½É±° ™¥•±‘Í•Ð°€¹ÁÉ½‘ÕÐµ™½Éµ}}¥¹ÁÕÐ´µ‘É½Á‘½Ý¸œ¤¹™½É…  ¡É½ÕÀ¤€ôøì(€€€€€½¹ÍÐ¡•­•€ôÉ½ÕÀ¹ÅÕ•ÉåM•±•Ñ½È ¥¹ÁÕÐé¡•­•œ¤ñðÉ½ÕÀ¹ÅÕ•ÉåM•±•Ñ½È Í•±•Ð½ÁÑ¥½¹mÍ•±•Ñ•‘tœ¤ì(€€€€€¥˜€¡¡•­•¤ì(€€€€€€€½ÁÑ¥½¹Ì¹ÁÕÍ ¡ì¹…µ”è¡•­•¹‘…Ñ…Í•Ð¹½ÁÑ¥½¹9…µ”ñð€œœ°Ù…±Õ”è¡•­•¹Ù…±Õ”ô¤ì(€€€€€ô(€€€ô¤ì(€€€É•ÑÕÉ¸½ÁÑ¥½¹Ìì(€ô((€‘¥ÍÁ…Ñ¡AÉ½‘ÕÑM•±•ÑÙ•¹Ð ¤ì(€€€½¹ÍÐìAÉ½‘ÕÑM•±•ÑÙ•¹Ðô€ôÝ¥¹‘½Ü¹MÑ…¹‘…É‘Ù•¹ÑÌñðíôì(€€€¥˜€ …AÉ½‘ÕÑM•±•ÑÙ•¹Ð¤É•ÑÕÉ¸ì((€€€½¹ÍÐ‘•™•ÉÉ•€ôAÉ½‘ÕÑM•±•ÑÙ•¹Ð¹É•…Ñ•AÉ½µ¥Í” ¤ì(€€€Ñ¡¥Ì¹Á•¹‘¥¹M•±•ÑAÉ½µ¥Í”€ô‘•™•ÉÉ•ì((€€€Ñ¡¥Ì¹‘¥ÍÁ…Ñ¡Ù•¹Ð (€€€€€¹•ÜAÉ½‘ÕÑM•±•ÑÙ•¹Ð¡ì(€€€€€€€ÁÉ½‘ÕÐèì(€€€€€€€€€¥èÑ¡¥Ì¹‘…Ñ…Í•Ð¹ÁÉ½‘ÕÑ%°(€€€€€€€€€Ñ¥Ñ±”èÑ¡¥Ì¹‘…Ñ…Í•Ð¹ÁÉ½‘ÕÑQ¥Ñ±”°(€€€€€€€€€¡…¹‘±”èÑ¡¥Ì¹‘…Ñ…Í•Ð¹ÁÉ½‘ÕÑ!…¹‘±”°(€€€€€€€ô°(€€€€€€€Í•±•Ñ•‘=ÁÑ¥½¹ÌèÑ¡¥Ì¹•Ñ±±M•±•Ñ•‘=ÁÑ¥½¹Ì ¤°(€€€€€€€ÁÉ½µ¥Í”è‘•™•ÉÉ•¹ÁÉ½µ¥Í”°(€€€€€ô¤(€€€€¤ì(€ô((€Ñ…­•A•¹‘¥¹M•±•ÑAÉ½µ¥Í” ¤ì(€€€½¹ÍÐ‘•™•ÉÉ•€ôÑ¡¥Ì¹Á•¹‘¥¹M•±•ÑAÉ½µ¥Í”ì(€€€Ñ¡¥Ì¹Á•¹‘¥¹M•±•ÑAÉ½µ¥Í”€ô¹Õ±°ì(€€€É•ÑÕÉ¸‘•™•ÉÉ•ì(€ô((€É•Í½±Ù•A•¹‘¥¹M•±•ÑAÉ½µ¥Í”¡Ù…É¥…¹Ð°Í½ÕÉ•Y…É¥…¹ÑM•±•ÑÌ€ôÑ¡¥Ì¤ì(€€€½¹ÍÐ‘•™•ÉÉ•€ôÑ¡¥Ì¹Ñ…­•A•¹‘¥¹M•±•ÑAÉ½µ¥Í” ¤ì(€€€¥˜€ …‘•™•ÉÉ•¤É•ÑÕÉ¸ì((€€€¥˜€¡Ù…É¥…¹Ð¤ì(€€€€€‘•™•ÉÉ•¹É•Í½±Ù”¡ì(€€€€€€€Ù…É¥…¹Ðèì(€€€€€€€€€¥èÙ…É¥…¹Ð¹¥°(€€€€€€€€€Ñ¥Ñ±”èÙ…É¥…¹Ð¹Ñ¥Ñ±”°(€€€€€€€€€…Ù…¥±…‰±•½ÉM…±”èÙ…É¥…¹Ð¹…Ù…¥±…‰±”°(€€€€€€€€€ÁÉ¥”èì(€€€€€€€€€€€…µ½Õ¹ÐèÍ½ÕÉ•Y…É¥…¹ÑM•±•ÑÌü¹‘…Ñ…Í•Ð¹Í•±•Ñ•‘AÉ¥•µ½Õ¹Ð°(€€€€€€€€€€€ÕÉÉ•¹å½‘”èÍ½ÕÉ•Y…É¥…¹ÑM•±•ÑÌü¹‘…Ñ…Í•Ð¹ÕÉÉ•¹å½‘”°(€€€€€€€€€ô°(€€€€€€€€€Í•±•Ñ•‘=ÁÑ¥½¹ÌèÑ¡¥Ì¹•Ñ±±M•±•Ñ•‘=ÁÑ¥½¹Ì ¤°(€€€€€€€ô°(€€€€€ô¤ì(€€€ô•±Í”ì(€€€€€‘•™•ÉÉ•¹É•Í½±Ù”¡ìÙ…É¥…¹Ðè¹Õ±°ô¤ì(€€€ô(€ô((€É•©•ÑA•¹‘¥¹M•±•ÑAÉ½µ¥Í”¡•ÉÉ½È¤ì(€€€Ñ¡¥Ì¹Ñ…­•A•¹‘¥¹M•±•ÑAÉ½µ¥Í” ¤ü¹É•©•Ð¡•ÉÉ½È¤ì(€ô((€ÕÁ‘…Ñ•M•±•Ñ¥½¹5•Ñ…‘…Ñ„¡ìÑ…É•Ðô¤ì(€€€½¹ÍÐìÙ…±Õ”°Ñ…9…µ”ô€ôÑ…É•Ðì((€€€¥˜€¡Ñ…9…µ”€ôôô€M1Pœ€˜˜Ñ…É•Ð¹Í•±•Ñ•‘=ÁÑ¥½¹Ì¹±•¹Ñ ¤ì(€€€€€ÉÉ…ä¹™É½´¡Ñ…É•Ð¹½ÁÑ¥½¹Ì¤(€€€€€€€€¹™¥¹ ¡½ÁÑ¥½¸¤€ôø½ÁÑ¥½¸¹•ÑÑÑÉ¥‰ÕÑ” Í•±•Ñ•œ¤¤(€€€€€€€€¹É•µ½Ù•ÑÑÉ¥‰ÕÑ” Í•±•Ñ•œ¤ì(€€€€€Ñ…É•Ð¹Í•±•Ñ•‘=ÁÑ¥½¹ÍlÁt¹Í•ÑÑÑÉ¥‰ÕÑ” Í•±•Ñ•œ°€Í•±•Ñ•œ¤ì((€€€€€½¹ÍÐÍÝ…Ñ¡Y…±Õ”€ôÑ…É•Ð¹Í•±•Ñ•‘=ÁÑ¥½¹ÍlÁt¹‘…Ñ…Í•Ð¹½ÁÑ¥½¹MÝ…Ñ¡Y…±Õ”ì(€€€€€½¹ÍÐÍ•±•Ñ•‘É½Á‘½Ý¹MÝ…Ñ¡Y…±Õ”€ôÑ…É•Ð(€€€€€€€€¹±½Í•ÍÐ œ¹ÁÉ½‘ÕÐµ™½Éµ}}¥¹ÁÕÐœ¤(€€€€€€€€¹ÅÕ•ÉåM•±•Ñ½È m‘…Ñ„µÍ•±•Ñ•µÙ…±Õ•t€ø€¹ÍÝ…Ñ œ¤ì(€€€€€¥˜€ …Í•±•Ñ•‘É½Á‘½Ý¹MÝ…Ñ¡Y…±Õ”¤É•ÑÕÉ¸ì(€€€€€¥˜€¡ÍÝ…Ñ¡Y…±Õ”¤ì(€€€€€€€Í•±•Ñ•‘É½Á‘½Ý¹MÝ…Ñ¡Y…±Õ”¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä œ´µÍÝ…Ñ ´µ‰…­É½Õ¹œ°ÍÝ…Ñ¡Y…±Õ”¤ì(€€€€€€€Í•±•Ñ•‘É½Á‘½Ý¹MÝ…Ñ¡Y…±Õ”¹±…ÍÍ1¥ÍÐ¹É•µ½Ù” ÍÝ…Ñ ´µÕ¹…Ù…¥±…‰±”œ¤ì(€€€€€ô•±Í”ì(€€€€€€€Í•±•Ñ•‘É½Á‘½Ý¹MÝ…Ñ¡Y…±Õ”¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä œ´µÍÝ…Ñ ´µ‰…­É½Õ¹œ°€Õ¹Í•Ðœ¤ì(€€€€€€€Í•±•Ñ•‘É½Á‘½Ý¹MÝ…Ñ¡Y…±Õ”¹±…ÍÍ1¥ÍÐ¹…‘ ÍÝ…Ñ ´µÕ¹…Ù…¥±…‰±”œ¤ì(€€€€€ô((€€€€€Í•±•Ñ•‘É½Á‘½Ý¹MÝ…Ñ¡Y…±Õ”¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä (€€€€€€€€œ´µÍÝ…Ñ µ™½…°µÁ½¥¹Ðœ°(€€€€€€€Ñ…É•Ð¹Í•±•Ñ•‘=ÁÑ¥½¹ÍlÁt¹‘…Ñ…Í•Ð¹½ÁÑ¥½¹MÝ…Ñ¡½…±A½¥¹Ðñð€Õ¹Í•Ðœ(€€€€€€¤ì(€€€ô•±Í”¥˜€¡Ñ…9…µ”€ôôô€%9AUPœ€˜˜Ñ…É•Ð¹ÑåÁ”€ôôô€É…‘¥¼œ¤ì(€€€€€½¹ÍÐÍ•±•Ñ•‘MÝ…Ñ¡Y…±Õ”€ôÑ…É•Ð¹±½Í•ÍÐ¡€¹ÁÉ½‘ÕÐµ™½Éµ}}¥¹ÁÕÑ€¤¹ÅÕ•ÉåM•±•Ñ½È m‘…Ñ„µÍ•±•Ñ•µÙ…±Õ•tœ¤ì(€€€€€¥˜€¡Í•±•Ñ•‘MÝ…Ñ¡Y…±Õ”¤Í•±•Ñ•‘MÝ…Ñ¡Y…±Õ”¹¥¹¹•É!Q50€ôÙ…±Õ”ì(€€€ô(€ô((€•Ñ%¹ÁÕÑ½ÉÙ•¹ÑQ…É•Ð¡Ñ…É•Ð¤ì(€€€É•ÑÕÉ¸Ñ…É•Ð¹Ñ…9…µ”€ôôô€M1Pœ€üÑ…É•Ð¹Í•±•Ñ•‘=ÁÑ¥½¹ÍlÁt€èÑ…É•Ðì(€ô((€•ÐÍ•±•Ñ•‘=ÁÑ¥½¹Y…±Õ•Ì ¤ì(€€€É•ÑÕÉ¸ÉÉ…ä¹™É½´¡Ñ¡¥Ì¹ÅÕ•ÉåM•±•Ñ½É±° Í•±•Ð½ÁÑ¥½¹mÍ•±•Ñ•‘t°™¥•±‘Í•Ð¥¹ÁÕÐé¡•­•œ¤¤¹µ…À (€€€€€€¡ì‘…Ñ…Í•Ðô¤€ôø‘…Ñ…Í•Ð¹½ÁÑ¥½¹Y…±Õ•%(€€€€¤ì(€ô)ô()ÕÍÑ½µ±•µ•¹ÑÌ¹‘•™¥¹” Ù…É¥…¹ÐµÍ•±•ÑÌœ°Y…É¥…¹ÑM•±•ÑÌ¤ì()±…ÍÌAÉ½‘ÕÑI•½µµ•¹‘…Ñ¥½¹Ì•áÑ•¹‘Ì!Q51±•µ•¹Ðì(€½‰Í•ÉÙ•È€ôÕ¹‘•™¥¹•ì((€½¹ÍÑÉÕÑ½È ¤ì(€€€ÍÕÁ•È ¤ì(€ô((€½¹¹•Ñ•‘…±±‰…¬ ¤ì(€€€Ñ¡¥Ì¹¥¹¥Ñ¥…±¥é•I•½µµ•¹‘…Ñ¥½¹Ì¡Ñ¡¥Ì¹‘…Ñ…Í•Ð¹ÁÉ½‘ÕÑ%¤ì(€ô((€¥¹¥Ñ¥…±¥é•I•½µµ•¹‘…Ñ¥½¹Ì¡ÁÉ½‘ÕÑ%¤ì(€€€Ñ¡¥Ì¹½‰Í•ÉÙ•Èü¹Õ¹½‰Í•ÉÙ”¡Ñ¡¥Ì¤ì(€€€Ñ¡¥Ì¹½‰Í•ÉÙ•È€ô¹•Ü%¹Ñ•ÉÍ•Ñ¥½¹=‰Í•ÉÙ•È (€€€€€€¡•¹ÑÉ¥•Ì°½‰Í•ÉÙ•È¤€ôøì(€€€€€€€¥˜€ …•¹ÑÉ¥•ÍlÁt¹¥Í%¹Ñ•ÉÍ•Ñ¥¹œ¤É•ÑÕÉ¸ì(€€€€€€€½‰Í•ÉÙ•È¹Õ¹½‰Í•ÉÙ”¡Ñ¡¥Ì¤ì(€€€€€€€Ñ¡¥Ì¹±½…‘I•½µµ•¹‘…Ñ¥½¹Ì¡ÁÉ½‘ÕÑ%¤ì(€€€€€ô°(€€€€€ìÉ½½Ñ5…É¥¸è€œÁÁà€ÁÁà€ÐÀÁÁà€ÁÁàœô(€€€€¤ì(€€€Ñ¡¥Ì¹½‰Í•ÉÙ•È¹½‰Í•ÉÙ”¡Ñ¡¥Ì¤ì(€ô((€±½…‘I•½µµ•¹‘…Ñ¥½¹Ì¡ÁÉ½‘ÕÑ%¤ì(€€€™•Ñ ¡€‘íÑ¡¥Ì¹‘…Ñ…Í•Ð¹ÕÉ±ô™ÁÉ½‘ÕÑ}¥ô‘íÁÉ½‘ÕÑ%‘ô™Í•Ñ¥½¹}¥ô‘íÑ¡¥Ì¹‘…Ñ…Í•Ð¹Í•Ñ¥½¹%‘õ€¤(€€€€€€¹Ñ¡•¸ ¡É•ÍÁ½¹Í”¤€ôøÉ•ÍÁ½¹Í”¹Ñ•áÐ ¤¤(€€€€€€¹Ñ¡•¸ ¡Ñ•áÐ¤€ôøì(€€€€€€€½¹ÍÐ¡Ñµ°€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‘¥Øœ¤ì(€€€€€€€¡Ñµ°¹¥¹¹•É!Q50€ôÑ•áÐì(€€€€€€€½¹ÍÐÉ•½µµ•¹‘…Ñ¥½¹Ì€ô¡Ñµ°¹ÅÕ•ÉåM•±•Ñ½È ÁÉ½‘ÕÐµÉ•½µµ•¹‘…Ñ¥½¹Ìœ¤ì((€€€€€€€¥˜€¡É•½µµ•¹‘…Ñ¥½¹Ìü¹¥¹¹•É!Q50¹ÑÉ¥´ ¤¹±•¹Ñ ¤ì(€€€€€€€€€Ñ¡¥Ì¹¥¹¹•É!Q50€ôÉ•½µµ•¹‘…Ñ¥½¹Ì¹¥¹¹•É!Q50ì(€€€€€€€ô((€€€€€€€¥˜€ …Ñ¡¥Ì¹ÅÕ•ÉåM•±•Ñ½È Í±¥‘•Í¡½Üµ½µÁ½¹•¹Ðœ¤€˜˜Ñ¡¥Ì¹±…ÍÍ1¥ÍÐ¹½¹Ñ…¥¹Ì ½µÁ±•µ•¹Ñ…ÉäµÁÉ½‘ÕÑÌœ¤¤ì(€€€€€€€€€Ñ¡¥Ì¹É•µ½Ù” ¤ì(€€€€€€€ô((€€€€€€€¥˜€¡¡Ñµ°¹ÅÕ•ÉåM•±•Ñ½È œ¹É¥‘}}¥Ñ•´œ¤¤ì(€€€€€€€€€Ñ¡¥Ì¹±…ÍÍ1¥ÍÐ¹…‘ ÁÉ½‘ÕÐµÉ•½µµ•¹‘…Ñ¥½¹Ì´µ±½…‘•œ¤ì(€€€€€€€ô(€€€€€ô¤(€€€€€€¹…Ñ  ¡”¤€ôøì(€€€€€€€½¹Í½±”¹•ÉÉ½È¡”¤ì(€€€€€ô¤ì(€ô)ô()ÕÍÑ½µ±•µ•¹ÑÌ¹‘•™¥¹” ÁÉ½‘ÕÐµÉ•½µµ•¹‘…Ñ¥½¹Ìœ°AÉ½‘ÕÑI•½µµ•¹‘…Ñ¥½¹Ì¤ì()±…ÍÌ½Õ¹Ñ%½¸•áÑ•¹‘Ì!Q51±•µ•¹Ðì(€½¹ÍÑÉÕÑ½È ¤ì(€€€ÍÕÁ•È ¤ì((€€€Ñ¡¥Ì¹¥½¸€ôÑ¡¥Ì¹ÅÕ•ÉåM•±•Ñ½È œ¹¥½¸œ¤ì(€ô((€½¹¹•Ñ•‘…±±‰…¬ ¤ì(€€€‘½Õµ•¹Ð¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ÍÑ½É•™É½¹ÐéÍ¥¹¥¹½µÁ±•Ñ•œ°Ñ¡¥Ì¹¡…¹‘±•MÑ½É•™É½¹ÑM¥¹%¹½µÁ±•Ñ•¹‰¥¹¡Ñ¡¥Ì¤¤ì(€ô((€¡…¹‘±•MÑ½É•™É½¹ÑM¥¹%¹½µÁ±•Ñ•¡•Ù•¹Ð¤ì(€€€¥˜€¡•Ù•¹Ðü¹‘•Ñ…¥°ü¹…Ù…Ñ…È¤ì(€€€€€Ñ¡¥Ì¹¥½¸ü¹É•Á±…•]¥Ñ ¡•Ù•¹Ð¹‘•Ñ…¥°¹…Ù…Ñ…È¹±½¹•9½‘” ¤¤ì(€€€ô(€ô)ô()ÕÍÑ½µ±•µ•¹ÑÌ¹‘•™¥¹” …½Õ¹Ðµ¥½¸œ°½Õ¹Ñ%½¸¤ì()±…ÍÌ	Õ±­‘•áÑ•¹‘Ì!Q51±•µ•¹Ðì(€ÍÑ…Ñ¥ŒMe9}IEUMQ}1d€ô€ÈÔÀì((€½¹ÍÑÉÕÑ½È ¤ì(€€€ÍÕÁ•È ¤ì(€€€Ñ¡¥Ì¹ÅÕ•Õ”€ômtì(€€€Ñ¡¥Ì¹Í•ÑI•ÅÕ•ÍÑMÑ…ÉÑ•¡™…±Í”¤ì(€€€Ñ¡¥Ì¹¥‘Ì€ômtì(€ô((€ÍÑ…ÉÑEÕ•Õ”¡¥°ÅÕ…¹Ñ¥Ñä¤ì(€€€Ñ¡¥Ì¹ÅÕ•Õ”¹ÁÕÍ ¡ì¥°ÅÕ…¹Ñ¥Ñäô¤ì((€€€½¹ÍÐ¥¹Ñ•ÉÙ…°€ôÍ•Ñ%¹Ñ•ÉÙ…°  ¤€ôøì(€€€€€¥˜€¡Ñ¡¥Ì¹ÅÕ•Õ”¹±•¹Ñ €ø€À¤ì(€€€€€€€¥˜€ …Ñ¡¥Ì¹É•ÅÕ•ÍÑMÑ…ÉÑ•¤ì(€€€€€€€€€Ñ¡¥Ì¹Í•¹‘I•ÅÕ•ÍÐ¡Ñ¡¥Ì¹ÅÕ•Õ”¤ì(€€€€€€€ô(€€€€€ô•±Í”ì(€€€€€€€±•…É%¹Ñ•ÉÙ…°¡¥¹Ñ•ÉÙ…°¤ì(€€€€€ô(€€€ô°	Õ±­‘¹Me9}IEUMQ}1d¤ì(€ô((€Í•¹‘I•ÅÕ•ÍÐ¡ÅÕ•Õ”¤ì(€€€Ñ¡¥Ì¹Í•ÑI•ÅÕ•ÍÑMÑ…ÉÑ•¡ÑÉÕ”¤ì(€€€½¹ÍÐ¥Ñ•µÌ€ôíôì((€€€ÅÕ•Õ”¹™½É…  ¡ÅÕ•Õ•%Ñ•´¤€ôøì(€€€€€¥Ñ•µÍmÁ…ÉÍ•%¹Ð¡ÅÕ•Õ•%Ñ•´¹¥¥t€ôÅÕ•Õ•%Ñ•´¹ÅÕ…¹Ñ¥Ñäì(€€€ô¤ì(€€€Ñ¡¥Ì¹ÅÕ•Õ”€ôÑ¡¥Ì¹ÅÕ•Õ”¹™¥±Ñ•È ¡ÅÕ•Õ•±•µ•¹Ð¤€ôø€…ÅÕ•Õ”¹¥¹±Õ‘•Ì¡ÅÕ•Õ•±•µ•¹Ð¤¤ì((€€€Ñ¡¥Ì¹ÕÁ‘…Ñ•5Õ±Ñ¥Á±•EÑä¡¥Ñ•µÌ¤ì(€ô((€Í•ÑI•ÅÕ•ÍÑMÑ…ÉÑ•¡É•ÅÕ•ÍÑMÑ…ÉÑ•¤ì(€€€Ñ¡¥Ì¹}É•ÅÕ•ÍÑMÑ…ÉÑ•€ôÉ•ÅÕ•ÍÑMÑ…ÉÑ•ì(€ô((€•ÐÉ•ÅÕ•ÍÑMÑ…ÉÑ• ¤ì(€€€É•ÑÕÉ¸Ñ¡¥Ì¹}É•ÅÕ•ÍÑMÑ…ÉÑ•ì(€ô((€•Ñ…ÉÑEÕ…¹Ñ¥Ñå½É1¥¹”¡¥¤ì(€€€½¹ÍÐ¥¹ÁÕÐ€ôÑ¡¥Ì¹ÅÕ•ÉåM•±•Ñ½È¡€EÕ…¹Ñ¥Ñä´‘í¥‘õ€¤ì(€€€É•ÑÕÉ¸Á…ÉÍ•%¹Ð¡¥¹ÁÕÐü¹‘…Ñ…Í•Ð¹…ÉÑEÕ…¹Ñ¥Ñäñð¥¹ÁÕÐü¹•ÑÑÑÉ¥‰ÕÑ” Ù…±Õ”œ¤ñð€œÀœ°€ÄÀ¤ñð€Àì(€ô((€ÍÑ…ÉÑ…ÉÑ1¥¹•ÍUÁ‘…Ñ”¡¥Ñ•µÌ¤ì(€€€½¹ÍÐì…ÉÑ1¥¹•ÍUÁ‘…Ñ•Ù•¹Ðô€ôÝ¥¹‘½Ü¹MÑ…¹‘…É‘Ù•¹ÑÌñðíôì(€€€¥˜€ ……ÉÑ1¥¹•ÍUÁ‘…Ñ•Ù•¹Ð¤É•ÑÕÉ¸ì((€€€½¹ÍÐ±¥¹•Í	åÑ¥½¸€ô=‰©•Ð¹•¹ÑÉ¥•Ì¡¥Ñ•µÌ¤¹É•‘Õ” ¡É½ÕÁÌ°mÙ…É¥…¹Ñ%°ÅÕ…¹Ñ¥Ñåt¤€ôøì(€€€€€½¹ÍÐ¹•áÑEÕ…¹Ñ¥Ñä€ôÁ…ÉÍ•%¹Ð¡ÅÕ…¹Ñ¥Ñä°€ÄÀ¤ì(€€€€€½¹ÍÐÕÉÉ•¹ÑEÕ…¹Ñ¥Ñä€ôÑ¡¥Ì¹•Ñ…ÉÑEÕ…¹Ñ¥Ñå½É1¥¹”¡Ù…É¥…¹Ñ%¤ì((€€€€€¥˜€¡9Õµ‰•È¹¥Í9…8¡¹•áÑEÕ…¹Ñ¥Ñä¤ñðÕÉÉ•¹ÑEÕ…¹Ñ¥Ñä€ôôô¹•áÑEÕ…¹Ñ¥Ñä¤É•ÑÕÉ¸É½ÕÁÌì((€€€€€½¹ÍÐ…Ñ¥½¸€ôÕÉÉ•¹ÑEÕ…¹Ñ¥Ñä€ôôô€À€ü€…‘œ€è¹•áÑEÕ…¹Ñ¥Ñä€ôôô€À€ü€É•µ½Ù”œ€è€ÕÁ‘…Ñ”œì(€€€€€±•Ð±¥¹”ì(€€€€€¥˜€¡…Ñ¥½¸€ôôô€…‘œ¤ì(€€€€€€€±¥¹”€ôìµ•É¡…¹‘¥Í•%èÙ…É¥…¹Ñ%°ÅÕ…¹Ñ¥Ñäè¹•áÑEÕ…¹Ñ¥Ñäôì(€€€€€ô•±Í”ì(€€€€€€€½¹ÍÐ±¥¹•-•ä€ôÑ¡¥Ì¹ÅÕ•ÉåM•±•Ñ½È¡m‘…Ñ„µÅÕ…¹Ñ¥ÑäµÙ…É¥…¹Ðµ¥ôˆ‘íÙ…É¥…¹Ñ%‘ô‰u€¤ü¹‘…Ñ…Í•Ð¹ÅÕ…¹Ñ¥Ñå1¥¹•-•äì(€€€€€€€€¼¼9¼)`±¥¹”­•ä½¸Ñ¡”É½ÜƒŠP±¥­•±ä…¡•!Q50É•¹‘•É•‰•™½É”Ñ¡¥Ì(€€€€€€€€¼¼…ÑÑÉ¥‰ÕÑ”±…¹‘•¸M­¥ÀÉ…Ñ¡•ÈÑ¡…¸•µ¥Ð…¸•Ù•¹ÐÝ¥Ñ ¥è€œœ¸(€€€€€€€¥˜€ …±¥¹•-•ä¤É•ÑÕÉ¸É½ÕÁÌì(€€€€€€€±¥¹”€ôì¥è±¥¹•-•ä°ÅÕ…¹Ñ¥Ñäè¹•áÑEÕ…¹Ñ¥Ñäôì(€€€€€ô((€€€€€¥˜€ …É½ÕÁÍm…Ñ¥½¹t¤É½ÕÁÍm…Ñ¥½¹t€ômtì(€€€€€É½ÕÁÍm…Ñ¥½¹t¹ÁÕÍ ¡±¥¹”¤ì(€€€€€É•ÑÕÉ¸É½ÕÁÌì(€€€ô°íô¤ì((€€€½¹ÍÐ‘•™•ÉÉ•‘Ì€ô=‰©•Ð¹•¹ÑÉ¥•Ì¡±¥¹•Í	åÑ¥½¸¤¹µ…À ¡m…Ñ¥½¸°±¥¹•Ít¤€ôøì(€€€€€½¹ÍÐ‘•™•ÉÉ•€ô…ÉÑ1¥¹•ÍUÁ‘…Ñ•Ù•¹Ð¹É•…Ñ•AÉ½µ¥Í” ¤ì(€€€€€Ñ¡¥Ì¹‘¥ÍÁ…Ñ¡Ù•¹Ð (€€€€€€€¹•Ü…ÉÑ1¥¹•ÍUÁ‘…Ñ•Ù•¹Ð¡ì(€€€€€€€€€…Ñ¥½¸°(€€€€€€€€€½¹Ñ•áÐè€ÁÉ½‘ÕÐœ°(€€€€€€€€€±¥¹•Ì°(€€€€€€€€€ÁÉ½µ¥Í”è‘•™•ÉÉ•¹ÁÉ½µ¥Í”°(€€€€€€€ô¤(€€€€€€¤ì(€€€€€É•ÑÕÉ¸‘•™•ÉÉ•ì(€€€ô¤ì((€€€É•ÑÕÉ¸ì(€€€€€É•Í½±Ù”è€¡Á…ÉÍ•‘MÑ…Ñ”¤€ôøì(€€€€€€€½¹ÍÐÁ…å±½…€ôì…ÉÐè…ÉÑ1¥¹•ÍUÁ‘…Ñ•Ù•¹Ð¹É•…Ñ•…ÉÑÉ½µ©…áI•ÍÁ½¹Í”¡Á…ÉÍ•‘MÑ…Ñ”¤ôì(€€€€€€€‘•™•ÉÉ•‘Ì¹™½É…  ¡‘•™•ÉÉ•¤€ôø‘•™•ÉÉ•¹É•Í½±Ù”¡Á…å±½…¤¤ì(€€€€€ô°(€€€€€É•©•Ðè€¡•ÉÉ½È¤€ôøì(€€€€€€€‘•™•ÉÉ•‘Ì¹™½É…  ¡‘•™•ÉÉ•¤€ôø‘•™•ÉÉ•¹É•©•Ð¡•ÉÉ½È¤¤ì(€€€€€ô°(€€€ôì(€ô((€‘¥ÍÁ…Ñ¡…ÉÑÉÉ½ÉÙ•¹Ð¡µ•ÍÍ…”°½‘”¤ì(€€€½¹ÍÐì…ÉÑÉÉ½ÉÙ•¹Ðô€ôÝ¥¹‘½Ü¹MÑ…¹‘…É‘Ù•¹ÑÌñðíôì(€€€¥˜€ ……ÉÑÉÉ½ÉÙ•¹Ð¤É•ÑÕÉ¸ì((€€€Ñ¡¥Ì¹‘¥ÍÁ…Ñ¡Ù•¹Ð¡¹•Ü…ÉÑÉÉ½ÉÙ•¹Ð¡ì•ÉÉ½Èèµ•ÍÍ…”°½‘”ô¤¤ì(€ô((€É•Í•ÑEÕ…¹Ñ¥Ñå%¹ÁÕÐ¡¥¤ì(€€€½¹ÍÐ¥¹ÁÕÐ€ôÑ¡¥Ì¹ÅÕ•ÉåM•±•Ñ½È¡€EÕ…¹Ñ¥Ñä´‘í¥‘õ€¤ì(€€€¥¹ÁÕÐ¹Ù…±Õ”€ô¥¹ÁÕÐ¹•ÑÑÑÉ¥‰ÕÑ” Ù…±Õ”œ¤ì(€€€Ñ¡¥Ì¹¥Í¹Ñ•ÉAÉ•ÍÍ•€ô™…±Í”ì(€ô((€Í•ÑY…±¥‘¥Ñä¡•Ù•¹Ð°¥¹‘•à°µ•ÍÍ…”¤ì(€€€•Ù•¹Ð¹Ñ…É•Ð¹Í•ÑÕÍÑ½µY…±¥‘¥Ñä¡µ•ÍÍ…”¤ì(€€€•Ù•¹Ð¹Ñ…É•Ð¹É•Á½ÉÑY…±¥‘¥Ñä ¤ì(€€€Ñ¡¥Ì¹É•Í•ÑEÕ…¹Ñ¥Ñå%¹ÁÕÐ¡¥¹‘•à¤ì(€€€•Ù•¹Ð¹Ñ…É•Ð¹Í•±•Ð ¤ì(€ô((€Ù…±¥‘…Ñ•EÕ…¹Ñ¥Ñä¡•Ù•¹Ð¤ì(€€€½¹ÍÐ¥¹ÁÕÑY…±Õ”€ôÁ…ÉÍ•%¹Ð¡•Ù•¹Ð¹Ñ…É•Ð¹Ù…±Õ”¤ì(€€€½¹ÍÐ¥¹‘•à€ô•Ù•¹Ð¹Ñ…É•Ð¹‘…Ñ…Í•Ð¹¥¹‘•àì((€€€¥˜€¡¥¹ÁÕÑY…±Õ”€ð•Ù•¹Ð¹Ñ…É•Ð¹‘…Ñ…Í•Ð¹µ¥¸¤ì(€€€€€Ñ¡¥Ì¹Í•ÑY…±¥‘¥Ñä¡•Ù•¹Ð°¥¹‘•à°Ý¥¹‘½Ü¹ÅÕ¥­=É‘•É1¥ÍÑMÑÉ¥¹Ì¹µ¥¹}•ÉÉ½È¹É•Á±…” mµ¥¹tœ°•Ù•¹Ð¹Ñ…É•Ð¹‘…Ñ…Í•Ð¹µ¥¸¤¤ì(€€€ô•±Í”¥˜€¡¥¹ÁÕÑY…±Õ”€øÁ…ÉÍ•%¹Ð¡•Ù•¹Ð¹Ñ…É•Ð¹µ…à¤¤ì(€€€€€Ñ¡¥Ì¹Í•ÑY…±¥‘¥Ñä¡•Ù•¹Ð°¥¹‘•à°Ý¥¹‘½Ü¹ÅÕ¥­=É‘•É1¥ÍÑMÑÉ¥¹Ì¹µ…á}•ÉÉ½È¹É•Á±…” mµ…átœ°•Ù•¹Ð¹Ñ…É•Ð¹µ…à¤¤ì(€€€ô•±Í”¥˜€¡¥¹ÁÕÑY…±Õ”€”Á…ÉÍ•%¹Ð¡•Ù•¹Ð¹Ñ…É•Ð¹ÍÑ•À¤€„ô€À¤ì(€€€€€Ñ¡¥Ì¹Í•ÑY…±¥‘¥Ñä¡•Ù•¹Ð°¥¹‘•à°Ý¥¹‘½Ü¹ÅÕ¥­=É‘•É1¥ÍÑMÑÉ¥¹Ì¹ÍÑ•Á}•ÉÉ½È¹É•Á±…” mÍÑ•Átœ°•Ù•¹Ð¹Ñ…É•Ð¹ÍÑ•À¤¤ì(€€€ô•±Í”ì(€€€€€•Ù•¹Ð¹Ñ…É•Ð¹Í•ÑÕÍÑ½µY…±¥‘¥Ñä œœ¤ì(€€€€€•Ù•¹Ð¹Ñ…É•Ð¹É•Á½ÉÑY…±¥‘¥Ñä ¤ì(€€€€€•Ù•¹Ð¹Ñ…É•Ð¹Í•ÑÑÑÉ¥‰ÕÑ” Ù…±Õ”œ°¥¹ÁÕÑY…±Õ”¤ì(€€€€€Ñ¡¥Ì¹ÍÑ…ÉÑEÕ•Õ”¡¥¹‘•à°¥¹ÁÕÑY…±Õ”¤ì(€€€ô(€ô((€•ÑM•Ñ¥½¹%¹¹•É!Q50¡¡Ñµ°°Í•±•Ñ½È¤ì(€€€É•ÑÕÉ¸¹•Ü=5A…ÉÍ•È ¤¹Á…ÉÍ•É½µMÑÉ¥¹œ¡¡Ñµ°°€Ñ•áÐ½¡Ñµ°œ¤¹ÅÕ•ÉåM•±•Ñ½È¡Í•±•Ñ½È¤¹¥¹¹•É!Q50ì(€ô)ô()¥˜€ …ÕÍÑ½µ±•µ•¹ÑÌ¹•Ð ‰Õ±¬µ…‘œ¤¤ì(€ÕÍÑ½µ±•µ•¹ÑÌ¹‘•™¥¹” ‰Õ±¬µ…‘œ°	Õ±­‘¤ì)ô()±…ÍÌ…ÉÑA•É™½Éµ…¹”ì(€ÍÑ…Ñ¥Œ€µ•ÑÉ¥}ÁÉ•™¥à€ô€‰…ÉÐµÁ•É™½Éµ…¹”ˆ((€ÍÑ…Ñ¥ŒÉ•…Ñ•MÑ…ÉÑ¥¹5…É­•È¡‰•¹¡µ…É­9…µ”¤ì(€€€½¹ÍÐµ•ÑÉ¥9…µ”€ô€‘í…ÉÑA•É™½Éµ…¹”¸µ•ÑÉ¥}ÁÉ•™¥áôè‘í‰•¹¡µ…É­9…µ•õ€(€€€É•ÑÕÉ¸Á•É™½Éµ…¹”¹µ…É¬¡€‘íµ•ÑÉ¥9…µ•ôéÍÑ…ÉÑ€¤ì(€ô((€ÍÑ…Ñ¥Œµ•…ÍÕÉ•É½µÙ•¹Ð¡‰•¹¡µ…É­9…µ”°•Ù•¹Ð¤ì(€€€½¹ÍÐµ•ÑÉ¥9…µ”€ô€‘í…ÉÑA•É™½Éµ…¹”¸µ•ÑÉ¥}ÁÉ•™¥áôè‘í‰•¹¡µ…É­9…µ•õ€(€€€½¹ÍÐÍÑ…ÉÑ5…É­•È€ôÁ•É™½Éµ…¹”¹µ…É¬¡€‘íµ•ÑÉ¥9…µ•ôéÍÑ…ÉÑ€°ì(€€€€€ÍÑ…ÉÑQ¥µ”è•Ù•¹Ð¹Ñ¥µ•MÑ…µÀ(€€€ô¤ì((€€€½¹ÍÐ•¹‘5…É­•È€ôÁ•É™½Éµ…¹”¹µ…É¬¡€‘íµ•ÑÉ¥9…µ•ôé•¹‘€¤ì((€€€Á•É™½Éµ…¹”¹µ•…ÍÕÉ” (€€€€€µ•ÑÉ¥9…µ”°(€€€€€€‘íµ•ÑÉ¥9…µ•ôéÍÑ…ÉÑ€°(€€€€€€‘íµ•ÑÉ¥9…µ•ôé•¹‘€(€€€€¤ì(€ô((€ÍÑ…Ñ¥Œµ•…ÍÕÉ•É½µ5…É­•È¡‰•¹¡µ…É­9…µ”°ÍÑ…ÉÑ5…É­•È¤ì(€€€½¹ÍÐµ•ÑÉ¥9…µ”€ô€‘í…ÉÑA•É™½Éµ…¹”¸µ•ÑÉ¥}ÁÉ•™¥áôè‘í‰•¹¡µ…É­9…µ•õ€(€€€½¹ÍÐ•¹‘5…É­•È€ôÁ•É™½Éµ…¹”¹µ…É¬¡€‘íµ•ÑÉ¥9…µ•ôé•¹‘€¤ì((€€€Á•É™½Éµ…¹”¹µ•…ÍÕÉ” (€€€€€µ•ÑÉ¥9…µ”°(€€€€€ÍÑ…ÉÑ5…É­•È¹¹…µ”°(€€€€€€‘íµ•ÑÉ¥9…µ•ôé•¹‘€(€€€€¤ì(€ô((€ÍÑ…Ñ¥Œµ•…ÍÕÉ”¡‰•¹¡µ…É­9…µ”°…±±‰…¬¤ì(€€€½¹ÍÐµ•ÑÉ¥9…µ”€ô€‘í…ÉÑA•É™½Éµ…¹”¸µ•ÑÉ¥}ÁÉ•™¥áôè‘í‰•¹¡µ…É­9…µ•õ€(€€€½¹ÍÐÍÑ…ÉÑ5…É­•È€ôÁ•É™½Éµ…¹”¹µ…É¬¡€‘íµ•ÑÉ¥9…µ•ôéÍÑ…ÉÑ€¤ì((€€€…±±‰…¬ ¤ì((€€€½¹ÍÐ•¹‘5…É­•È€ôÁ•É™½Éµ…¹”¹µ…É¬¡€‘íµ•ÑÉ¥9…µ•ôé•¹‘€¤ì((€€€Á•É™½Éµ…¹”¹µ•…ÍÕÉ” (€€€€€µ•ÑÉ¥9…µ”°(€€€€€€‘íµ•ÑÉ¥9…µ•ôéÍÑ…ÉÑ€°(€€€€€€‘íµ•ÑÉ¥9…µ•ôé•¹‘€(€€€€¤ì(€ô)ô(