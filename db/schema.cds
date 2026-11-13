namespace sap.restaurant;

using { cuid, managed } from '@sap/cds/common';

type OrderStatus : String enum {
  Open;
  Received;
  Completed;
  Cancelled;
};

type PaymentStatus : String enum {
  Unpaid;
  Paid;
  Refunded;
};

type PaymentMethod : String enum {
  Cash;
  Card;
  UPI;
  None;
};

entity MenuItems : cuid, managed {
    title           : String(100) not null;
    category        : String(50);
    price           : Decimal(10, 2);
    availableOrders : Integer default 0;
}

entity Orders : cuid, managed {
    customerName                     : String(100) not null;
    totalPrice                       : Decimal(10, 2);
    status                           : OrderStatus default 'Open';
    paymentStatus                    : PaymentStatus default 'Unpaid';
    paymentMethod                    : PaymentMethod default 'None';
    virtual paymentStatusCriticality : Integer;
    Items                            : Composition of many OrderItems on Items.parent = $self;
}

entity OrderItems : cuid {
    parent   : Association to Orders;
    menuItem : Association to MenuItems;
    quantity : Integer default 1;
}

entity Users : cuid, managed {
    email    : String(100) not null;
    password : String(100);
    name     : String(100);
    role     : String(20) default 'staff';
}

// ---------------------------------------------------------------------------
// CDS Views (Computed on Database Level)
// ---------------------------------------------------------------------------

view ActiveOrders as select from Orders {
    ID,
    customerName,
    totalPrice,
    status,
    paymentStatus,
    paymentMethod,
    createdAt
} where status in ('Open', 'Received');

view CategorySales as select from OrderItems as item
    inner join MenuItems as dish on item.menuItem.ID = dish.ID
    inner join Orders as ord on item.parent.ID = ord.ID
{
    key dish.category,
    count(distinct ord.ID) as totalOrdersCount : Integer,
    sum(item.quantity) as totalDishesSold : Integer,
    sum(item.quantity * dish.price) as totalRevenue : Decimal(12, 2)
} where ord.paymentStatus = 'Paid'
group by dish.category;
