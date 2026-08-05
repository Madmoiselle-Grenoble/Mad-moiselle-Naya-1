// ---------- Panier Mad'moiselle by Naya Délice ----------
// Panier stocké dans le navigateur (localStorage), propre à chaque visiteur.

const CART_KEY = 'naya-delice-cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
}

function addToCart(item) {
  // item: { priceId, name, price }
  const cart = getCart();
  const existing = cart.find(i => i.priceId === item.priceId && i.name === item.name);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  saveCart(cart);
  openCart();
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function updateQty(index, delta) {
  const cart = getCart();
  if (!cart[index]) return;
  cart[index].qty += delta;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  saveCart(cart);
}

function cartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function cartTotal() {
  return getCart().reduce((sum, i) => sum + i.qty * i.price, 0);
}

function formatEUR(n) {
  return n.toFixed(2).replace('.', ',') + ' €';
}

function renderCart() {
  const badge = document.getElementById('cart-badge');
  if (badge) {
    const count = cartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  const list = document.getElementById('cart-items');
  if (list) {
    const cart = getCart();
    if (cart.length === 0) {
      list.innerHTML = '<p class="cart-empty">Votre panier est vide.</p>';
    } else {
      list.innerHTML = cart.map((item, i) => `
        <div class="cart-item">
          <div class="cart-item-info">
            <span class="cart-item-name">${item.name}</span>
            <span class="cart-item-price">${formatEUR(item.price)}</span>
          </div>
          <div class="cart-item-qty">
            <button type="button" onclick="updateQty(${i},-1)" aria-label="Retirer un">−</button>
            <span>${item.qty}</span>
            <button type="button" onclick="updateQty(${i},1)" aria-label="Ajouter un">+</button>
          </div>
          <button type="button" class="cart-item-remove" onclick="removeFromCart(${i})" aria-label="Retirer l'article">×</button>
        </div>
      `).join('');
    }
  }

  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = formatEUR(cartTotal());
}

function openCart() {
  document.getElementById('cart-drawer')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('open');
}

function closeCart() {
  document.getElementById('cart-drawer')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  renderCart();

  document.getElementById('cart-toggle')?.addEventListener('click', openCart);
  document.getElementById('cart-close')?.addEventListener('click', closeCart);
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);

  document.querySelectorAll('[data-add-to-cart]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      addToCart({
        priceId: btn.dataset.priceId,
        name: btn.dataset.name,
        price: parseFloat(btn.dataset.price),
      });
    });
  });
});
