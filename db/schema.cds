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
