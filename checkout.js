// ---------- Stripe Checkout ----------
// ⚠️ À COMPLÉTER : remplace la valeur ci-dessous par TA clé publique Stripe
// (elle commence par "pk_live_..." ou "pk_test_..." — jamais par "sk_...",
// la clé secrète ne doit JAMAIS être mise dans un fichier accessible au public).
// Tu la trouves dans ton tableau de bord Stripe > Développeurs > Clés API.
const STRIPE_PUBLIC_KEY = 'pk_test_51Th4Yv0PKUOkzzjzK5BakngljQuFdhbNLAVXg8R3YKd2DI1jyw1TeJ01GYJClg29vSjvfVQM4chzSaKU62GFBZdt007esmlLUs';

function goToCheckout() {
  const cart = getCart();
  if (cart.length === 0) return;

  if (STRIPE_PUBLIC_KEY.includes('VOTRE_CLE')) {
    alert("La connexion au paiement n'est pas encore configurée (clé Stripe manquante).");
    return;
  }

  const stripe = Stripe(STRIPE_PUBLIC_KEY);

  stripe.redirectToCheckout({
    lineItems: cart.map(item => ({ price: item.priceId, quantity: item.qty })),
    mode: 'payment',
    successUrl: window.location.origin + '/merci.html',
    cancelUrl: window.location.origin + '/boutique.html',
  }).then(function (result) {
    if (result.error) {
      alert(result.error.message);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('checkout-btn')?.addEventListener('click', goToCheckout);
});
