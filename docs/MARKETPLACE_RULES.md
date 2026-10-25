# LocalSampark marketplace rules

How orders are priced, paid, delivered, cancelled and settled. The rules in this document are built into the backend. Each number is an admin setting. A super admin changes it in the console under **Pricing** (`GET`/`PUT /api/v1/admin/pricing`). A change applies to the next order. Orders already placed keep the price and commission rate they were placed at.

The figures below are the launch defaults.

---

## 1. What the customer pays

| Charge | Rule | Setting (default) |
|---|---|---|
| Items | The shop's catalogue price. A price sent by the app is ignored. | — |
| Delivery | By distance. See §2. | — |
| Small-order fee | Added when the item total is below a threshold. | `small_order_threshold` (0 = off), `small_order_fee` (₹0) |
| Platform fee | A flat fee on every order. In a multi-shop cart it is charged once. | `platform_fee` (₹5) |
| Discount | Loyalty coins, funded by the platform. They reduce what the customer pays. They do not reduce what the shop is credited. | — |

The app always shows the server's bill (`POST /checkout/quote`). That is exactly the bill the order is charged.

## 2. Delivery charge (distance-based)

1. **Distance.** Straight-line distance from the shop to the customer × the road factor. The customer's location comes from their saved address or from their phone.
2. **Base.** ₹20 covers the first 2 km.
3. **Per km.** ₹8 for each km after that, billed in half-km steps.
4. **Surge.** One multiplier for rain, festivals or a rider shortage, which an admin sets. A separate multiplier applies during peak hours. The higher of the two applies, up to the cap.
5. **Ceiling.** The delivery charge, surge included, is never more than the maximum.
6. **Free delivery.** Delivery is free when the item total reaches the free-delivery threshold.
7. **Range.** Addresses beyond the maximum distance get pickup only.
8. **Multi-shop cart.** One delivery charge for the most expensive leg. ₹10 is added for each extra shop the rider collects from.

| Setting | Default |
|---|---|
| `delivery_base_fee` / `delivery_base_distance_km` | ₹20 / 2 km |
| `delivery_per_km_fee` | ₹8 |
| `delivery_road_factor` | 1.3 |
| `delivery_max_distance_km` | 10 km |
| `delivery_max_fee` | ₹150 |
| `delivery_free_above` | 0 (off) |
| `delivery_extra_pickup_fee` | ₹10 |
| `delivery_surge_multiplier` | 1 (off) |
| `delivery_peak_hours` / `delivery_peak_multiplier` | none / 1 |
| `delivery_surge_cap` | 2 |
| `delivery_prep_minutes` / `delivery_speed_kmph` | 15 min / 20 km/h (for the arrival estimate) |

**Examples at the defaults:** 1 km costs ₹20. 5.1 km costs ₹48 (₹20 + 3.5 km × ₹8). 9.9 km costs ₹84.

Before saving a change, an admin can preview it with `POST /admin/pricing/preview { distanceKm, subtotal, settings }`.

## 3. What the rider earns

Rider pay is set **separately from the customer's delivery charge**. A rider is still paid when the customer gets free delivery.

- **Pay per delivery.** `rider_base_pay` (₹20) for the base distance, plus `rider_per_km_pay` (₹7) per km after it, plus the full surge amount.
- **When it is paid.** Rider pay goes to the rider's wallet when the delivery is completed with the customer's handover code. A delivery cannot be closed without the code.
- **Which jobs riders see.** Riders see orders that are ready, are for delivery (not pickup) and are not still waiting for an online payment.

## 4. Payment methods

| Method | Rule |
|---|---|
| Online (Razorpay) | The order is created unpaid. The shop cannot confirm it until the payment is verified. If it is not paid within `unpaid_order_expiry_minutes` (30), it is cancelled automatically and its stock is released. |
| Wallet | The wallet is debited in the same step that places the order. If the balance is short, nothing is placed. |
| Cash on delivery / pay at shop | Offered only while `cod_enabled` is on and the order total is at most `cod_max_order_value` (₹2,000). |
| Multi-shop cart | Wallet or cash only. |
| Universal-catalogue bookings (`/universal-orders`) | Paid at the shop only. To pay in advance, customers order the same items through checkout. |

## 5. Cancellations and refunds

| Who | When they can cancel |
|---|---|
| Customer | Until the shop starts preparing the order (status pending or confirmed). For a parcel: until a rider accepts it. |
| Shop | Until the order leaves the shop (ready or earlier). |
| Admin | Any time before delivery. |

**Every cancellation:**
- returns the stock;
- voids the shop's commission on that order;
- returns the money:
  - **Wallet payment:** credited back to the wallet immediately.
  - **Online payment:** refunded through Razorpay to the card, UPI or bank account it came from. If Razorpay rejects the refund, the order is marked *refund pending*. It is retried every 5 minutes and is listed for admins at `GET /admin/orders/refunds`, where it can also be retried by hand.
  - **Late payment:** if a payment arrives after its order was cancelled, it is refunded the same way.

## 6. Cash on delivery: who holds the money

| Who handed the order over | What is recorded |
|---|---|
| Platform rider | The order is marked paid and the cash goes on the **rider's cash in hand** and the rider's cash ledger. |
| Shop (pickup at the counter, or the shop's own delivery) | The order is marked paid and the cash is recorded against the **shop**. It is netted in settlement (§7). |

**Rider cash rules:**
- A rider holding `rider_cash_limit` (₹3,000) or more cannot accept another cash order. Prepaid orders are still allowed.
- Riders clear their cash by depositing it, which an admin records at `POST /admin/delivery/agents/:id/cash-deposit`. They can also pay it off from their wallet earnings (`POST /delivery/cash/settle`).
- A rider cannot withdraw earnings that would leave less in the wallet than the cash they hold.
- Admins see every rider holding cash at `GET /admin/delivery/cash`.

## 7. Commission and shop settlement

**Commission rate.** The shop's own negotiated rate applies first, then its category's rate, then `default_commission_percent` (**5%**). The rate is fixed on each order when it is placed.

**Commission base.** Commission is charged on the **item total only**. It is never charged on delivery charges or platform fees. A shop's per-order fee (if one is set) is added on top.

**For every delivered, paid order:**

| | |
|---|---|
| Shop earns | Items, plus the delivery charge **if the shop delivered it itself** |
| Platform deducts | Commission, plus GST on commission (`gst_on_commission_percent`, 18%), plus the gateway cost on online orders only (`gateway_fee_percent`, 2%) |
| Shop already holds | The order total, if the shop collected the cash itself |

The delivery charge on an order delivered by a platform rider belongs to the platform, which pays the rider from it. The platform fee and small-order fee always belong to the platform.

**For each period:**

net payout = sum of the lines above − TDS − dues carried forward

- **TDS.** `tds_on_sales_percent` (0.1%) of item sales, under s.194-O. **Confirm the rate, and any exemptions for small sellers, with your accountant before the first payout.**
- **Negative periods.** A period that comes out negative is recorded as **dues**. This happens, for example, to a shop that mostly takes cash at the counter. Dues are not paid out. They are deducted from the shop's next payout.
- **No double counting.** An order is settled once. Running the calculation again for the same period settles nothing twice.

**Worked example at 5%** (online payment, ₹500 of items, delivered by a platform rider):
commission ₹25 + GST ₹4.50 + gateway ₹10 = ₹39.50 deducted, so the shop gets **₹460.50** (before TDS).

**Same order, paid in cash at the shop counter** (total ₹505 with the platform fee):
the shop already holds ₹505, so it owes ₹25 + ₹4.50 + ₹5 = **₹34.50**, deducted from its next payout.

## 8. Merchant plans

The plans on sale are **Basic CRM** (₹0) and **Premium SaaS** (₹999/month). A super admin can add plans, rename them, change prices or withdraw a plan (`/admin/plans`).

- A new price applies to the next purchase and the next renewal. A period a shop has already paid for is not changed.
- A withdrawn plan can no longer be bought. Shops already on it keep it until their period ends.
- When a paid period ends without renewal, the shop returns to the free tier automatically.

## 9. Who can change what

| Action | Role |
|---|---|
| View pricing, plans, rider cash, pending refunds | Admin |
| Change any price, rate, limit or plan | Super admin |
| Record a rider's cash deposit, retry a refund | Admin |
