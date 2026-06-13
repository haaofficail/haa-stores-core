# Order State Machine

## States

```
draft → pending_payment → confirmed → processing → ready_to_ship → shipped → delivered → completed → returned → refunded
  │                          │            │              │           │           │        │           │
  └── cancelled ─────────────┴────────────┴──────────────┴───────────┴───────────┴────────┘           │
       (any state except completed/refunded may be cancelled)                                        │
                                                                                                     │
                                                                                returned_to_sender ──┘
```

## Formal Transitions

| From | To | Notes |
|------|-----|-------|
| `draft` | `checkout_started`, `pending_payment`, `cancelled` | |
| `checkout_started` | `pending_payment`, `cancelled` | Route from cart to checkout |
| `pending_payment` | `confirmed`, `cancelled`, `refunded` | Payment captured |
| `confirmed` | `processing`, `cancelled`, `refunded` | Merchant starts fulfilling |
| `processing` | `ready_to_ship`, `cancelled` | Items picked/packed |
| `ready_to_ship` | `shipped`, `cancelled` | Label created |
| `shipped` | `delivered`, `returned_to_sender`, `cancelled` | In transit |
| `delivered` | `completed`, `returned` | Customer received |
| `completed` | `returned`, `refunded` | Order lifecycle done |
| `returned` | `refunded` | Goods returned, refund pending |
| `cancelled` | (terminal) | No outgoing transitions |
| `refunded` | (terminal) | No outgoing transitions |
| `partially_refunded` | `refunded`, `completed` | Partial refund issued |

## Payment Status

- `unpaid` → `paid` → `refunded` → `partially_refunded`

Payment flows are independent of order status but trigger specific transitions:
- `paid` triggers `pending_payment → confirmed`
- `refunded` triggers any state → `refunded`

## Fulfillment Status

- `unfulfilled` → `fulfilled` → `partially_shipped` → `shipped`

## Implementation

Transitions enforced by `OrdersService.changeStatus()` which:
1. Looks up current status
2. Validates target is in `ORDER_STATUS_TRANSITIONS[current]`
3. Records transition with timestamp + actor in `order_status_history`
4. Sets `cancelledAt` / `completedAt` timestamp if applicable
