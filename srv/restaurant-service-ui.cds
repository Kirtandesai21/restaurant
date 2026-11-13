using { RestaurantService } from './restaurant-service';

// ---------------------------------------------------------------------------
// Menu Annotations
// ---------------------------------------------------------------------------
annotate RestaurantService.Menu with {
    ID              @title: 'Dish ID'          @Common.Label: 'Dish ID';
    title           @title: 'Title'            @Common.Label: 'Title';
    category        @title: 'Category'         @Common.Label: 'Category';
    price           @title: 'Price (₹)'        @Common.Label: 'Price (₹)' @Measures.ISOCurrency: 'INR';
    availableOrders @title: 'Available Orders' @Common.Label: 'Available Orders';
};

annotate RestaurantService.Menu with @(
    UI.HeaderInfo: {
        TypeName: 'Dish',
        TypeNamePlural: 'Dishes',
        Title: {
            $Type: 'UI.DataField',
            Value: title
        },
        Description: {
            $Type: 'UI.DataField',
            Value: category
        }
    },
    UI.SelectionFields: [
        category,
        price
    ],
    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Value: ID,
            Label: 'Dish ID'
        },
        {
            $Type: 'UI.DataField',
            Value: title,
            Label: 'Title'
        },
        {
            $Type: 'UI.DataField',
            Value: category,
            Label: 'Category'
        },
        {
            $Type: 'UI.DataField',
            Value: price,
            Label: 'Price (₹)'
        },
        {
            $Type: 'UI.DataField',
            Value: availableOrders,
            Label: 'Available Orders'
        }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'DishDetailsFacet',
            Label: 'Dish Details',
            Target: '@UI.FieldGroup#Details'
        }
    ],
    UI.FieldGroup #Details: {
        $Type: 'UI.FieldGroupType',
        Data: [
            {
                $Type: 'UI.DataField',
                Value: ID,
                Label: 'Dish ID'
            },
            {
                $Type: 'UI.DataField',
                Value: title,
                Label: 'Title'
            },
            {
                $Type: 'UI.DataField',
                Value: category,
                Label: 'Category'
            },
            {
                $Type: 'UI.DataField',
                Value: price,
                Label: 'Price (₹)'
            },
            {
                $Type: 'UI.DataField',
                Value: availableOrders,
                Label: 'Available Orders'
            }
        ]
    }
);

// ---------------------------------------------------------------------------
// Orders Annotations
// ---------------------------------------------------------------------------
annotate RestaurantService.Orders with {
    ID            @title: 'Order ID'       @Common.Label: 'Order ID';
    customerName  @title: 'Customer Name'  @Common.Label: 'Customer Name';
    totalPrice    @title: 'Total Price (₹)'    @Common.Label: 'Total Price (₹)' @Measures.ISOCurrency: 'INR';
    status        @(
        title: 'Status',
        Common.Label: 'Status',
        Common.ValueListWithFixedValues: true,
        Common.ValueList: {
            $Type: 'Common.ValueListType',
            CollectionPath: 'OrderStatuses',
            Parameters: [
                {
                    $Type: 'Common.ValueListParameterInOut',
                    LocalDataProperty: status,
                    ValueListProperty: 'code'
                },
                {
                    $Type: 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'name'
                }
            ]
        }
    );
    paymentStatus @(
        title: 'Payment Status',
        Common.Label: 'Payment Status',
        Common.ValueListWithFixedValues: true,
        Common.ValueList: {
            $Type: 'Common.ValueListType',
            CollectionPath: 'PaymentStatuses',
            Parameters: [
                {
                    $Type: 'Common.ValueListParameterInOut',
                    LocalDataProperty: paymentStatus,
                    ValueListProperty: 'code'
                },
                {
                    $Type: 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'name'
                }
            ]
        }
    );
    paymentMethod @(
        title: 'Payment Method',
        Common.Label: 'Payment Method',
        Common.ValueListWithFixedValues: true,
        Common.ValueList: {
            $Type: 'Common.ValueListType',
            CollectionPath: 'PaymentMethods',
            Parameters: [
                {
                    $Type: 'Common.ValueListParameterInOut',
                    LocalDataProperty: paymentMethod,
                    ValueListProperty: 'code'
                },
                {
                    $Type: 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'name'
                }
            ]
        }
    );
};

annotate RestaurantService.Orders with @(
    UI.HeaderInfo: {
        TypeName: 'Order',
        TypeNamePlural: 'Orders',
        Title: {
            $Type: 'UI.DataField',
            Value: customerName
        },
        Description: {
            $Type: 'UI.DataField',
            Value: status
        }
    },
    UI.SelectionFields: [
        status,
        paymentStatus,
        paymentMethod
    ],
    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Value: customerName,
            Label: 'Customer Name'
        },
        {
            $Type: 'UI.DataField',
            Value: totalPrice,
            Label: 'Total Price (₹)'
        },
        {
            $Type: 'UI.DataField',
            Value: status,
            Label: 'Status'
        },
        {
            $Type: 'UI.DataField',
            Value: paymentStatus,
            Label: 'Payment Status',
            Criticality: paymentStatusCriticality
        },
        {
            $Type: 'UI.DataField',
            Value: paymentMethod,
            Label: 'Payment Method'
        },
        {
            $Type: 'UI.DataFieldForAction',
            Action: 'RestaurantService.pay',
            Label: 'Pay Bill'
        }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'OrderDetailsFacet',
            Label: 'Order Details',
            Target: '@UI.FieldGroup#Details'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'OrderItemsFacet',
            Label: 'Order Items',
            Target: 'Items/@UI.LineItem'
        }
    ],
    UI.FieldGroup #Details: {
        $Type: 'UI.FieldGroupType',
        Data: [
            {
                $Type: 'UI.DataField',
                Value: customerName,
                Label: 'Customer Name'
            },
            {
                $Type: 'UI.DataField',
                Value: status,
                Label: 'Status'
            },
            {
                $Type: 'UI.DataField',
                Value: totalPrice,
                Label: 'Total Price (₹)'
            },
            {
                $Type: 'UI.DataField',
                Value: paymentStatus,
                Label: 'Payment Status',
                Criticality: paymentStatusCriticality
            },
            {
                $Type: 'UI.DataField',
                Value: paymentMethod,
                Label: 'Payment Method'
            }
        ]
    },
    UI.FieldGroup #General: {
        $Type: 'UI.FieldGroupType',
        Data: [
            {
                $Type: 'UI.DataField',
                Value: customerName,
                Label: 'Customer Name'
            },
            {
                $Type: 'UI.DataField',
                Value: status,
                Label: 'Status'
            },
            {
                $Type: 'UI.DataField',
                Value: totalPrice,
                Label: 'Total Price (₹)'
            },
            {
                $Type: 'UI.DataField',
                Value: paymentStatus,
                Label: 'Payment Status',
                Criticality: paymentStatusCriticality
            },
            {
                $Type: 'UI.DataField',
                Value: paymentMethod,
                Label: 'Payment Method'
            }
        ]
    },
    UI.Identification: [
        {
            $Type: 'UI.DataFieldForAction',
            Action: 'RestaurantService.pay',
            Label: 'Pay Bill'
        }
    ]
);

// ---------------------------------------------------------------------------
// OrderItems Annotations
// ---------------------------------------------------------------------------
annotate RestaurantService.OrderItems with {
    menuItem @(
        title: 'Dish',
        Common.Label: 'Dish',
        Common.Text: menuItem.title,
        Common.TextArrangement: #TextOnly,
        Common.ValueList: {
            $Type: 'Common.ValueListType',
            CollectionPath: 'Menu',
            Parameters: [
                {
                    $Type: 'Common.ValueListParameterInOut',
                    LocalDataProperty: menuItem_ID,
                    ValueListProperty: 'ID'
                },
                {
                    $Type: 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'title'
                },
                {
                    $Type: 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'category'
                },
                {
                    $Type: 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'price'
                }
            ]
        }
    );
    quantity @(
        title: 'Quantity',
        Common.Label: 'Quantity'
    );
};

annotate RestaurantService.OrderItems with @(
    UI.HeaderInfo: {
        TypeName: 'Order Item',
        TypeNamePlural: 'Order Items',
        Title: {
            $Type: 'UI.DataField',
            Value: menuItem.title
        }
    },
    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Value: menuItem_ID,
            Label: 'Dish'
        },
        {
            $Type: 'UI.DataField',
            Value: quantity,
            Label: 'Quantity'
        }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'OrderItemDetailsFacet',
            Label: 'Item Details',
            Target: '@UI.FieldGroup#ItemDetails'
        }
    ],
    UI.FieldGroup #ItemDetails: {
        $Type: 'UI.FieldGroupType',
        Data: [
            {
                $Type: 'UI.DataField',
                Value: menuItem_ID,
                Label: 'Dish'
            },
            {
                $Type: 'UI.DataField',
                Value: quantity,
                Label: 'Quantity'
            }
        ]
    },
    UI.Identification: [
        {
            $Type: 'UI.DataField',
            Value: menuItem_ID,
            Label: 'Dish'
        },
        {
            $Type: 'UI.DataField',
            Value: quantity,
            Label: 'Quantity'
        }
    ]
);

// ---------------------------------------------------------------------------
// TotalSales Annotations
// ---------------------------------------------------------------------------
annotate RestaurantService.TotalSales with {
    date             @title: 'Sales Date'         @Common.Label: 'Date';
    totalRevenue     @title: 'Total Revenue (₹)'  @Common.Label: 'Paid Revenue (₹)' @Measures.ISOCurrency: currency;
    currency         @title: 'Currency'           @Common.Label: 'Currency';
    paidBillsCount   @title: 'Paid Bills'         @Common.Label: 'Paid Bills Count';
    totalOrdersCount @title: 'Total Orders'       @Common.Label: 'Total Orders Count';
    unpaidRevenue    @title: 'Unpaid Revenue (₹)' @Common.Label: 'Unpaid Revenue (₹)' @Measures.ISOCurrency: currency;
};

annotate RestaurantService.TotalSales with @(
    UI.HeaderInfo: {
        TypeName: 'Daily Sales Report',
        TypeNamePlural: 'Daily Sales Reports',
        Title: {
            $Type: 'UI.DataField',
            Value: date
        },
        Description: {
            $Type: 'UI.DataField',
            Value: totalRevenue
        }
    },
    UI.SelectionFields: [
        date
    ],
    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Value: date,
            Label: 'Date'
        },
        {
            $Type: 'UI.DataField',
            Value: totalRevenue,
            Label: 'Paid Revenue (₹)'
        },
        {
            $Type: 'UI.DataField',
            Value: paidBillsCount,
            Label: 'Paid Bills Count'
        },
        {
            $Type: 'UI.DataField',
            Value: totalOrdersCount,
            Label: 'Total Orders'
        },
        {
            $Type: 'UI.DataField',
            Value: unpaidRevenue,
            Label: 'Unpaid Pending (₹)'
        }
    ]
);

// ---------------------------------------------------------------------------
// ActiveOrders CDS View Annotations
// ---------------------------------------------------------------------------
annotate RestaurantService.ActiveOrders with {
    ID            @title: 'Order ID'       @Common.Label: 'Order ID';
    customerName  @title: 'Customer Name'  @Common.Label: 'Customer';
    totalPrice    @title: 'Total (₹)'      @Common.Label: 'Total (₹)' @Measures.ISOCurrency: 'INR';
    status        @title: 'Status'         @Common.Label: 'Status';
    paymentStatus @title: 'Payment'        @Common.Label: 'Payment';
    paymentMethod @title: 'Payment Method' @Common.Label: 'Method';
    createdAt     @title: 'Placed At'      @Common.Label: 'Placed At';
};

annotate RestaurantService.ActiveOrders with @(
    UI.HeaderInfo: {
        TypeName: 'Active Order',
        TypeNamePlural: 'Active Orders (Live Queue)',
        Title: { $Type: 'UI.DataField', Value: customerName },
        Description: { $Type: 'UI.DataField', Value: status }
    },
    UI.SelectionFields: [ status, paymentStatus ],
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: customerName, Label: 'Customer' },
        { $Type: 'UI.DataField', Value: totalPrice, Label: 'Total (₹)' },
        { $Type: 'UI.DataField', Value: status, Label: 'Order Status' },
        { $Type: 'UI.DataField', Value: paymentStatus, Label: 'Payment Status' },
        { $Type: 'UI.DataField', Value: paymentMethod, Label: 'Method' },
        { $Type: 'UI.DataField', Value: createdAt, Label: 'Placed Time' }
    ]
);

// ---------------------------------------------------------------------------
// CategorySales CDS View Annotations
// ---------------------------------------------------------------------------
annotate RestaurantService.CategorySales with {
    category          @title: 'Category'             @Common.Label: 'Dish Category';
    totalOrdersCount  @title: 'Completed Orders'     @Common.Label: 'Orders Count';
    totalDishesSold   @title: 'Dishes Sold'          @Common.Label: 'Quantity Sold';
    totalRevenue      @title: 'Revenue (₹)'          @Common.Label: 'Category Revenue (₹)' @Measures.ISOCurrency: 'INR';
};

annotate RestaurantService.CategorySales with @(
    UI.HeaderInfo: {
        TypeName: 'Category Sales',
        TypeNamePlural: 'Sales Analytics by Category',
        Title: { $Type: 'UI.DataField', Value: category },
        Description: { $Type: 'UI.DataField', Value: totalRevenue }
    },
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: category, Label: 'Dish Category' },
        { $Type: 'UI.DataField', Value: totalOrdersCount, Label: 'Orders Count' },
        { $Type: 'UI.DataField', Value: totalDishesSold, Label: 'Total Dishes Sold' },
        { $Type: 'UI.DataField', Value: totalRevenue, Label: 'Total Revenue (₹)' }
    ]
);
