export const ShopStatus = Object.freeze({
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending'
});

export const OrderStatus = Object.freeze({
    PENDING: 'pending',
    PAID: 'paid',
    SHIPPED: 'shipped',
    COMPLETED: 'completed',
    CANCELED: 'canceled',
    PROCESSING: 'processing'
});

export const NotificationType = Object.freeze({
    ORDER_NEW: 'ORDER_NEW',
    ORDER_CANCELED: 'ORDER_CANCELED',
    STORE_REGISTRATION_REQUEST: 'STORE_REGISTRATION_REQUEST',
    STORE_REGISTRATION_REJECTED: 'STORE_REGISTRATION_REJECTED',
    PRODUCT_LOW_STOCK: 'PRODUCT_LOW_STOCK'
});

export const NotificationReferenceType = Object.freeze({
    ORDER: 'ORDER',
    STORE_REGISTRATION: 'STORE_REGISTRATION'
});

export const NotificationActionType = Object.freeze({
    VIEW_ORDER: 'VIEW_ORDER',
    VIEW_REGISTRATION: 'VIEW_REGISTRATION',
    NONE: 'NONE'
});

export const DiscountTypes = Object.freeze({
    PERCENTAGE: 'percentage',
    FIXED: 'fixed'
})


