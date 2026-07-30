document.documentElement.classList.remove('no-js');

document.addEventListener('change', (event) => {
  const select = event.target.closest('[data-variant-select]');
  if (!select) return;

  const option = select.options[select.selectedIndex];
  const form = select.closest('form');
  const variantInput = form?.querySelector('[name="id"]');
  const price = form?.closest('.product-info')?.querySelector('[data-product-price]');
  const submit = form?.querySelector('[type="submit"]');

  if (variantInput) variantInput.value = option.value;
  if (price && option.dataset.price) price.textContent = option.dataset.price;
  if (submit) submit.disabled = option.disabled;
});

document.addEventListener('shopify:section:load', () => {
  document.documentElement.classList.remove('no-js');
});
