# Configuración de Stripe para Briki

## Problema actual
El error "You must provide at least one recurring price in `subscription` mode when using prices" ocurre porque las variables de entorno de Stripe Price IDs no están configuradas.

## Solución

### Paso 1: Crear Precios en Stripe Dashboard

1. Ve a https://dashboard.stripe.com/test/products
2. Crea Productos con precios recurrentes:

#### Starter Plan
- Product: "Briki Starter"
- Price: $9.99/month (recurring)
- Price ID ejemplo: `price_xxxxxxxxxxxxx`
- Repite para anual: $99.99/year (recurring)

#### Pro Plan  
- Product: "Briki Pro"
- Price: $29.99/month (recurring)
- Price ID ejemplo: `price_xxxxxxxxxxxxx`
- Repite para anual: $299.99/year (recurring)

#### Team Plan
- Product: "Briki Team"
- Price: $79.99/month (recurring)
- Price ID ejemplo: `price_xxxxxxxxxxxxx`
- Repite para anual: $799.99/year (recurring)

#### Enterprise Plan
- Product: "Briki Enterprise"
- Price: Contact Sales
- Precio: Custom (puede requerir lógica especial)

### Paso 2: Configurar Variables de Entorno

Agrega estas variables a tu `.env`:

```bash
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs - Reemplaza con los ID reales de tu dashboard
STRIPE_STARTER_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_STARTER_YEARLY_PRICE_ID=price_xxxxxxxxxxxxx

STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_PRO_YEARLY_PRICE_ID=price_xxxxxxxxxxxxx

STRIPE_TEAM_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_TEAM_YEARLY_PRICE_ID=price_xxxxxxxxxxxxx

STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_xxxxxxxxxxxxx
```

### Paso 3: Configurar Webhook

1. Ve a https://dashboard.stripe.com/test/webhooks
2. Agrega endpoint: `https://tu-dominio.com/api/stripe/webhook`
3. Selecciona eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copia el "Signing secret" a `STRIPE_WEBHOOK_SECRET`

### Paso 4: Reiniciar el servidor

```bash
pnpm dev:clean
```

## Notas Importantes

- Las Price IDs deben ser de precios **recurrentes** (subscription mode)
- En test mode usa `pk_test_` y `sk_test_`
- En producción usa `pk_live_` y `sk_live_`

