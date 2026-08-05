// Fichier : functions/api/create-checkout-session.js
// Cloudflare Pages Function — s'exécute côté serveur, jamais dans le navigateur.
// Utilise directement les Price ID créés dans le Dashboard Stripe : les prix
// sont donc gérés depuis Stripe (pas ici), ce qui évite toute divergence.

export async function onRequestPost(context) {
  const { request, env } = context;

  const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return new Response(
      JSON.stringify({ error: "Clé Stripe non configurée côté serveur." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let cart, flavorNotes;
  try {
    const body = await request.json();
    cart = body.cart; // ex: [{ code: 'PIECE', qty: 1, flavor: 'Sénégal' }, ...]
  } catch (e) {
    return new Response(JSON.stringify({ error: "Panier invalide." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!Array.isArray(cart) || cart.length === 0) {
    return new Response(JSON.stringify({ error: "Le panier est vide." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Correspondance code interne du site -> Price ID réel dans Stripe.
  // À tenir à jour si vous ajoutez/renommez des produits dans Stripe.
  const PRICE_IDS = {
    DPD: "price_1TzgHM0PKUOkzzjz4KCxcxV7", // Coffret du Dauphiné sucrée
    DPS: "price_1TzgG90PKUOkzzjzCLwpuVSL", // Coffret du Dauphiné salée
    TDM: "price_1TzgEh0PKUOkzzjz32d1t36M", // Coffret Tour du Monde
    MCK: "price_1TzgCa0PKUOkzzjzdbHAEftv", // Madeleine Cakes
    PIECE: "price_1Th4v40PKUOkzzjz38Ek5Mfr", // Madeleine à la pièce (tous parfums)
  };

  // On regroupe les quantités par Price ID (Stripe facture par price, pas par parfum).
  const quantities = {};
  const flavorSummary = [];
  for (const item of cart) {
    const priceId = PRICE_IDS[item.code];
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `Produit inconnu : ${item.code}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    quantities[priceId] = (quantities[priceId] || 0) + item.qty;
    if (item.code === "PIECE" && item.flavor) {
      flavorSummary.push(`${item.flavor} x${item.qty}`);
    }
  }

  const origin = new URL(request.url).origin;
  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("success_url", `${origin}/merci?session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${origin}/panier`);

  // Livraison en France uniquement (48h), + retrait gratuit au marché.
  params.append("shipping_address_collection[allowed_countries][0]", "FR");

  // Montants (en centimes) utilisés uniquement pour déterminer le seuil de
  // livraison offerte — à tenir à jour si les tarifs changent dans Stripe.
  const PRICE_AMOUNTS = {
    [PRICE_IDS.DPD]: 1580,
    [PRICE_IDS.DPS]: 1580,
    [PRICE_IDS.TDM]: 2640,
    [PRICE_IDS.MCK]: 1990,
    [PRICE_IDS.PIECE]: 490,
  };
  const cartTotalCents = Object.entries(quantities).reduce(
    (sum, [priceId, qty]) => sum + (PRICE_AMOUNTS[priceId] || 0) * qty,
    0
  );
  const FREE_SHIPPING_THRESHOLD = 3900; // 39,00 €
  const SHIPPING_FEE = 590; // 5,90 €

  let s = 0;
  // Option 1 : retrait gratuit au marché (seulement les jours de présence)
  params.append(`shipping_options[${s}][shipping_rate_data][type]`, "fixed_amount");
  params.append(`shipping_options[${s}][shipping_rate_data][fixed_amount][amount]`, "0");
  params.append(`shipping_options[${s}][shipping_rate_data][fixed_amount][currency]`, "eur");
  params.append(`shipping_options[${s}][shipping_rate_data][display_name]`, "Retrait au Marché des Ayguinards, Meylan");
  params.append(`shipping_options[${s}][shipping_rate_data][delivery_estimate][minimum][unit]`, "business_day");
  params.append(`shipping_options[${s}][shipping_rate_data][delivery_estimate][minimum][value]`, "1");
  params.append(`shipping_options[${s}][shipping_rate_data][delivery_estimate][maximum][unit]`, "business_day");
  params.append(`shipping_options[${s}][shipping_rate_data][delivery_estimate][maximum][value]`, "7");
  s++;

  // Option 2 : livraison 48h en France — offerte dès 39€ d'achat
  const deliveryFee = cartTotalCents >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const deliveryLabel = deliveryFee === 0 ? "Livraison 48h — offerte" : "Livraison 48h";
  params.append(`shipping_options[${s}][shipping_rate_data][type]`, "fixed_amount");
  params.append(`shipping_options[${s}][shipping_rate_data][fixed_amount][amount]`, String(deliveryFee));
  params.append(`shipping_options[${s}][shipping_rate_data][fixed_amount][currency]`, "eur");
  params.append(`shipping_options[${s}][shipping_rate_data][display_name]`, deliveryLabel);
  params.append(`shipping_options[${s}][shipping_rate_data][delivery_estimate][minimum][unit]`, "business_day");
  params.append(`shipping_options[${s}][shipping_rate_data][delivery_estimate][minimum][value]`, "2");
  params.append(`shipping_options[${s}][shipping_rate_data][delivery_estimate][maximum][unit]`, "business_day");
  params.append(`shipping_options[${s}][shipping_rate_data][delivery_estimate][maximum][value]`, "2");

  // Les parfums choisis pour "La pièce" sont passés en métadonnée : ils
  // n'apparaissent pas sur la page de paiement Stripe elle-même, mais sont
  // visibles dans le Dashboard Stripe pour préparer la commande.
  if (flavorSummary.length > 0) {
    params.append("metadata[parfums_a_la_piece]", flavorSummary.join(", "));
  }

  let i = 0;
  for (const [priceId, qty] of Object.entries(quantities)) {
    params.append(`line_items[${i}][price]`, priceId);
    params.append(`line_items[${i}][quantity]`, String(qty));
    i++;
  }

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const session = await stripeRes.json();

  if (!stripeRes.ok) {
    return new Response(
      JSON.stringify({ error: session.error?.message || "Erreur Stripe." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
